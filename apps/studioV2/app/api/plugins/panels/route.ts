/**
	* GET /api/plugins/panels — L2 UI 面板描述符（25 §5.3）。
	*/
import { NextResponse } from "next/server";
import {
	getStudioV2CapabilityRuntime,
	getStudioV2EngineHost,
} from "@studio-v2/src/utils/server/host/engineHost.server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
	await getStudioV2EngineHost();
	const runtimePacks = getStudioV2CapabilityRuntime();
	const url = new URL(request.url);
	const slot = url.searchParams.get("slot");
	const panels = (runtimePacks?.uiPanels ?? []).filter(function (p) {
		return !slot || p.slot === slot;
	});
	return NextResponse.json({
		panels: panels.map(function (p) {
			return {
				pluginId: p.pluginId,
				slot: p.slot,
				title: p.title,
				entry: p.entry,
				/** Client iframe src */
				src: `/api/plugins/${encodeURIComponent(p.pluginId)}/assets/${p.assetPath}`,
			};
		}),
	});
}
