/**
	* GET /api/plugins/[pluginId]/assets/[...path] — 托管插件静态 UI 资产（iframe）。
	* realpath 后须仍落在插件包根内，防止 symlink 逃逸。
	*/
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolvePluginsRoot } from "@studio-v2/src/utils/server/plugins/root/pluginsRoot.server";

export const runtime = "nodejs";

function contentTypeFor(filePath: string): string {
	if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
	if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
		return "text/javascript; charset=utf-8";
	}
	if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
	if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
	return "application/octet-stream";
}

function isInsideRoot(rootReal: string, fileReal: string): boolean {
	const rel = path.relative(rootReal, fileReal);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ pluginId: string; path: string[] }> },
): Promise<Response> {
	const { pluginId, path: parts } = await context.params;
	if (!pluginId || !/^[a-zA-Z0-9._-]+$/.test(pluginId)) {
		return NextResponse.json(
			{ code: "VALIDATION_FAILED", message: "bad pluginId" },
			{ status: 400 },
		);
	}
	const rel = (parts ?? []).join("/");
	if (!rel || rel.includes("..")) {
		return NextResponse.json(
			{ code: "VALIDATION_FAILED", message: "bad path" },
			{ status: 400 },
		);
	}
	const pluginRoot = path.join(resolvePluginsRoot(), pluginId);
	const abs = path.join(pluginRoot, rel);
	try {
		const rootReal = await realpath(pluginRoot);
		const fileReal = await realpath(abs);
		if (!isInsideRoot(rootReal, fileReal)) {
			return NextResponse.json(
				{ code: "VALIDATION_FAILED", message: "path escape" },
				{ status: 400 },
			);
		}
		const buf = await readFile(fileReal);
		return new NextResponse(buf, {
			status: 200,
			headers: {
				"Content-Type": contentTypeFor(fileReal),
				"Cache-Control": "no-store",
			},
		});
	} catch {
		return NextResponse.json(
			{ code: "NOT_FOUND", message: "asset missing" },
			{ status: 404 },
		);
	}
}
