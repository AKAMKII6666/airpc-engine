/**
	* 扫描单包目录：解析清单 → staging 加载 → 冲突检查 → merge。
	*/
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import {
	safeParseCapabilityPacksManifest,
	type CapabilityPacksManifest,
	type PluginOutboundRequest,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { loadOnePlugin } from "@studio-v2/src/utils/server/plugins/load/pipeline/loadOnePlugin.server";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";
import {
	conflictReasonAgainstAcceptedL2,
	conflictReasonForPlugin,
	createEmptyStaging,
	mergePluginStagingInto,
	stripPluginContributions,
	type L1ReservedIds,
} from "@studio-v2/src/utils/server/plugins/assemble/rejectL2ConflictsWithL1.server";

async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

function failPlugin(
	out: ScannedPluginContributions,
	input: {
		pluginId?: string;
		dirName?: string;
		reason: string;
		errorMessage?: string;
	},
): void {
	out.failures.push({
		pluginId: input.pluginId,
		dirName: input.dirName,
		reason: input.reason,
	});
	emitPluginLog({
		type: "plugin.load_failed",
		pluginId: input.pluginId,
		reason: input.reason,
		errorMessage: input.errorMessage,
	});
}

async function tryLoadStaging(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	getHost: () => EngineHost | Promise<EngineHost>;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
}): Promise<
	| { ok: true; staging: ScannedPluginContributions }
	| { ok: false; reason: string }
> {
	const staging = createEmptyStaging();
	try {
		await loadOnePlugin({
			pkgDir: input.pkgDir,
			manifest: input.manifest,
			getHost: input.getHost,
			requestOutbound: input.requestOutbound,
			out: staging,
		});
		return { ok: true, staging };
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		stripPluginContributions(staging, input.manifest.id);
		return { ok: false, reason };
	}
}

function rejectStaging(
	out: ScannedPluginContributions,
	staging: ScannedPluginContributions,
	pluginId: string,
	reason: string,
): void {
	failPlugin(out, { pluginId, reason });
	stripPluginContributions(staging, pluginId);
}

/**
	* 处理 plugins/<dir> 单包；成功则 merge 进 out。
	*/
export async function processPluginDir(input: {
	root: string;
	dirName: string;
	seenIds: Set<string>;
	getHost: () => EngineHost | Promise<EngineHost>;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
	reservedL1?: L1ReservedIds;
	out: ScannedPluginContributions;
	onAttempt: () => void;
}): Promise<void> {
	const pkgDir = path.join(input.root, input.dirName);
	const manifestPath = path.join(pkgDir, "capability-packs.json");
	if (!(await pathExists(manifestPath))) return;

	const manifest = await readManifestOrFail(input.out, input.dirName, manifestPath);
	if (!manifest) return;
	if (!acceptEnabledManifest(input, manifest)) return;

	input.seenIds.add(manifest.id);
	input.onAttempt();

	const loaded = await tryLoadStaging({
		pkgDir,
		manifest,
		getHost: input.getHost,
		requestOutbound: input.requestOutbound,
	});
	if (!loaded.ok) {
		failPlugin(input.out, { pluginId: manifest.id, reason: loaded.reason });
		return;
	}

	const staging = loaded.staging;
	if (input.reservedL1) {
		const l1Reason = conflictReasonForPlugin(
			manifest.id,
			staging,
			input.reservedL1,
		);
		if (l1Reason) {
			rejectStaging(input.out, staging, manifest.id, l1Reason);
			return;
		}
	}

	const l2Reason = conflictReasonAgainstAcceptedL2(
		manifest.id,
		staging,
		input.out,
	);
	if (l2Reason) {
		rejectStaging(input.out, staging, manifest.id, l2Reason);
		return;
	}

	mergePluginStagingInto(input.out, staging);
}

async function readManifestOrFail(
	out: ScannedPluginContributions,
	dirName: string,
	manifestPath: string,
): Promise<CapabilityPacksManifest | null> {
	let raw: unknown;
	try {
		raw = JSON.parse(await readFile(manifestPath, "utf8"));
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		failPlugin(out, {
			dirName,
			reason: `manifest_read: ${reason}`,
		});
		return null;
	}
	const parsed = safeParseCapabilityPacksManifest(raw);
	if (!parsed.success) {
		failPlugin(out, {
			dirName,
			reason: `manifest_invalid: ${parsed.error.message}`,
			errorMessage: parsed.error.message,
		});
		return null;
	}
	return parsed.data;
}

function acceptEnabledManifest(
	input: {
		seenIds: Set<string>;
		reservedL1?: L1ReservedIds;
		out: ScannedPluginContributions;
	},
	manifest: CapabilityPacksManifest,
): boolean {
	if (!manifest.enabled) {
		input.out.skippedDisabled.push(manifest.id);
		emitPluginLog({
			type: "plugin.load_skipped",
			pluginId: manifest.id,
			reason: "enabled_false",
		});
		return false;
	}
	if (input.seenIds.has(manifest.id)) {
		failPlugin(input.out, {
			pluginId: manifest.id,
			reason: "duplicate_plugin_id",
		});
		return false;
	}
	if (input.reservedL1?.packIds.has(manifest.id)) {
		failPlugin(input.out, {
			pluginId: manifest.id,
			reason: `conflict_l1_pack_id:${manifest.id}`,
		});
		return false;
	}
	return true;
}
