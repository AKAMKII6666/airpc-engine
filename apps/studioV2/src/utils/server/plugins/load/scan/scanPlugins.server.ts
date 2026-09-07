/**
	* 扫描 plugins/* 并挂 realtime/background/ui 贡献；单包失败跳过。
	* 协议：技术设计 25 §7；合流 L1 merge 见 assembleWithPlugins。
	*/
import { readdir } from "node:fs/promises";
import type { PluginOutboundRequest } from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { resolvePluginsRoot } from "@studio-v2/src/utils/server/plugins/root/pluginsRoot.server";
import {
	emptyContributions,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";
import { processPluginDir } from "@studio-v2/src/utils/server/plugins/load/scan/processPluginDir.server";
import type { L1ReservedIds } from "@studio-v2/src/utils/server/plugins/assemble/rejectL2ConflictsWithL1.server";

export type {
	PluginUiPanelDescriptor,
	PluginLoadFailure,
	PluginLoadedInfo,
	ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export type ScanPluginsInput = {
	pluginsRoot?: string;
	getHost: () => EngineHost | Promise<EngineHost>;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
	reservedL1?: L1ReservedIds;
};

/**
	* 扫描并加载启用的插件；返回可注入 Host 的贡献表。
	*/
export async function scanAndLoadPlugins(
	input: ScanPluginsInput,
): Promise<ScannedPluginContributions> {
	const root = input.pluginsRoot ?? resolvePluginsRoot();
	const out = emptyContributions();
	let names: string[] = [];
	try {
		names = await readdir(root);
	} catch (err) {
		return handleScanRootError(out, err);
	}

	const seenIds = new Set<string>();
	let attempted = 0;
	for (const dirName of names) {
		await processPluginDir({
			root,
			dirName,
			seenIds,
			getHost: input.getHost,
			requestOutbound: input.requestOutbound,
			reservedL1: input.reservedL1,
			out,
			onAttempt: function () {
				attempted += 1;
			},
		});
	}

	emitPluginLog({
		type: "plugin.scan",
		pluginIds: out.loaded.map(function (p) {
			return p.pluginId;
		}),
		skippedDisabled: out.skippedDisabled,
		apiVersion: 1,
		foundCount: names.length,
		attemptedCount: attempted,
	});
	return out;
}

function handleScanRootError(
	out: ScannedPluginContributions,
	err: unknown,
): ScannedPluginContributions {
	const code =
		err && typeof err === "object" && "code" in err
			? String((err as { code: unknown }).code)
			: "";
	if (code === "ENOENT") {
		emitPluginLog({
			type: "plugin.scan",
			pluginIds: [],
			skippedDisabled: [],
			apiVersion: 1,
		});
		return out;
	}
	const reason = err instanceof Error ? err.message : String(err);
	out.scanRootError = `scan_root_io:${reason}`;
	out.failures.push({ reason: out.scanRootError });
	emitPluginLog({
		type: "plugin.load_failed",
		reason: out.scanRootError,
	});
	emitPluginLog({
		type: "plugin.scan",
		pluginIds: [],
		skippedDisabled: [],
		apiVersion: 1,
	});
	return out;
}
