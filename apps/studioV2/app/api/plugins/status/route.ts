/**
	* GET /api/plugins/status — L2 已加载包 / 失败 / 日志（25 L2-F）。
	*/
import { NextResponse } from "next/server";
import {
	getStudioV2CapabilityRuntime,
	getStudioV2EngineHost,
} from "@studio-v2/src/utils/server/host/engineHost.server";
import { listPluginLogEvents } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
	await getStudioV2EngineHost();
	const runtimePacks = getStudioV2CapabilityRuntime();
	return NextResponse.json({
		loaded: runtimePacks?.loadedPlugins ?? [],
		failures: runtimePacks?.pluginFailures ?? [],
		skippedDisabled: runtimePacks?.plugins.skippedDisabled ?? [],
		scanRootError: runtimePacks?.plugins.scanRootError ?? null,
		uiPanels: runtimePacks?.uiPanels ?? [],
		events: listPluginLogEvents(),
	});
}
