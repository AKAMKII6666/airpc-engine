/**
	* 将 realtime 槽 entry 贡献写入扫描结果表。
	*/
import type {
	CapabilityPacksManifest,
	PluginCapabilityApi,
} from "@airpc/pack-sdk";
import path from "node:path";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { loadPluginEntryModule } from "@studio-v2/src/utils/server/plugins/load/entry/loadPluginEntry.server";
import {
	asArrayContribution,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";
import { applyRealtimeItem } from "./applyRealtimeItem.server";

export async function applyRealtimePipeline(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	pipe: { slot: string; entry: string };
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
	slots: string[];
}): Promise<void> {
	const entryPath = path.join(input.pkgDir, input.pipe.entry);
	const loaded = await loadPluginEntryModule({
		absoluteEntryPath: entryPath,
		api: input.api,
		packageRoot: input.pkgDir,
	});
	const items = asArrayContribution(loaded.contribution);
	const slot = input.pipe.slot;
	input.slots.push(slot);

	for (const item of items) {
		applyRealtimeItem({
			slot,
			item,
			manifestId: input.manifest.id,
			manifestDisplayName: input.manifest.name ?? input.manifest.id,
			api: input.api,
			out: input.out,
		});
	}

	emitPluginLog({
		type: "plugin.slot_contrib",
		pluginId: input.manifest.id,
		slot,
		entry: input.pipe.entry,
		domain: "realtime",
	});
}
