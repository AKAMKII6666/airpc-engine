/**
	* 加载单个插件：main + realtime/background/ui 管道。
	*/
import path from "node:path";
import type {
	CapabilityPacksManifest,
	PluginCapabilityApi,
	PluginOutboundRequest,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import {
	assertEntryInsidePackageRoot,
	loadPluginEntryModule,
} from "@studio-v2/src/utils/server/plugins/load/entry/loadPluginEntry.server";
import { createPluginCapabilityApi } from "@studio-v2/src/utils/server/plugins/api/createPluginCapabilityApi.server";
import { applyRealtimePipeline } from "@studio-v2/src/utils/server/plugins/load/pipeline/applyRealtimePipeline.server";
import { applyBackgroundPipeline } from "@studio-v2/src/utils/server/plugins/load/pipeline/applyBackgroundPipeline.server";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export async function loadOnePlugin(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	getHost: () => EngineHost | Promise<EngineHost>;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
	out: ScannedPluginContributions;
}): Promise<void> {
	const { manifest, pkgDir, out } = input;
	const api = createPluginCapabilityApi({
		pluginId: manifest.id,
		getHost: input.getHost,
		requestOutbound: input.requestOutbound,
	});

	if (manifest.main) {
		const mainPath = path.join(pkgDir, manifest.main);
		await loadPluginEntryModule({
			absoluteEntryPath: mainPath,
			api,
			packageRoot: pkgDir,
		});
	}

	const slots: string[] = [];
	const domains: Array<"realtime" | "background" | "ui"> = [];

	await loadRealtimeDomain({ pkgDir, manifest, api, out, slots, domains });
	await loadBackgroundDomain({ pkgDir, manifest, api, out, slots, domains });
	await loadUiDomain({ pkgDir, manifest, out, slots, domains });

	out.loaded.push({
		pluginId: manifest.id,
		version: manifest.version,
		name: manifest.name,
		slots,
		domains,
	});
	emitPluginLog({
		type: "plugin.load_ok",
		pluginId: manifest.id,
		version: manifest.version,
		slots,
		domains,
	});
}

async function loadRealtimeDomain(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
	slots: string[];
	domains: Array<"realtime" | "background" | "ui">;
}): Promise<void> {
	if (!input.manifest.realtime?.enabled) return;
	input.domains.push("realtime");
	for (const pipe of input.manifest.realtime.pipelines) {
		await applyRealtimePipeline({
			pkgDir: input.pkgDir,
			manifest: input.manifest,
			pipe,
			api: input.api,
			out: input.out,
			slots: input.slots,
		});
	}
}

async function loadBackgroundDomain(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
	slots: string[];
	domains: Array<"realtime" | "background" | "ui">;
}): Promise<void> {
	if (!input.manifest.background?.enabled) return;
	input.domains.push("background");
	for (const pipe of input.manifest.background.pipelines) {
		await applyBackgroundPipeline({
			pkgDir: input.pkgDir,
			manifest: input.manifest,
			pipe,
			api: input.api,
			out: input.out,
			slots: input.slots,
		});
	}
}

async function loadUiDomain(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	out: ScannedPluginContributions;
	slots: string[];
	domains: Array<"realtime" | "background" | "ui">;
}): Promise<void> {
	if (!input.manifest.ui?.enabled) return;
	input.domains.push("ui");
	for (const panel of input.manifest.ui.panels) {
		const entryAbs = path.join(input.pkgDir, panel.entry);
		await assertEntryInsidePackageRoot({
			packageRoot: input.pkgDir,
			absoluteEntryPath: entryAbs,
		});
		input.slots.push(panel.slot);
		input.out.uiPanels.push({
			pluginId: input.manifest.id,
			slot: panel.slot,
			entry: panel.entry,
			assetPath: panel.entry.replace(/^\.\//, ""),
			title: input.manifest.name ?? input.manifest.id,
		});
		emitPluginLog({
			type: "plugin.slot_contrib",
			pluginId: input.manifest.id,
			slot: panel.slot,
			entry: panel.entry,
			domain: "ui",
		});
	}
}
