/**
	* GET /api/assets/[assetId]/file — 读取 data/assets 二进制供头像预览。
	*/
import { AssetMetaSchema, isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	readAssetFileBytes,
	readAssetMetaJson,
} from "@studio-v2/src/utils/server/assets/assetsFs.server";

const EXT_MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	wav: "audio/wav",
	mp3: "audio/mpeg",
};

function mimeFromUri(uri: string, bagMime?: string): string {
	if (typeof bagMime === "string" && bagMime.trim().length > 0) {
		return bagMime.trim();
	}
	const base = uri.split("/").pop() ?? "";
	const dot = base.lastIndexOf(".");
	if (dot < 0) return "application/octet-stream";
	const ext = base.slice(dot + 1).toLowerCase();
	return EXT_MIME[ext] ?? "application/octet-stream";
}

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
	try {
		const { assetId } = await ctx.params;
		const raw = await readAssetMetaJson(assetId);
		const parsed = AssetMetaSchema.safeParse(raw);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", `invalid AssetMeta: ${assetId}`);
		}
		const bag = parsed.data.meta ?? {};
		const bagMime =
			typeof bag.mimeType === "string" ? bag.mimeType : undefined;
		const bytes = await readAssetFileBytes(parsed.data.uri);
		return new Response(new Uint8Array(bytes), {
			status: 200,
			headers: {
				"Content-Type": mimeFromUri(parsed.data.uri, bagMime),
				"Cache-Control": "private, max-age=60",
			},
		});
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}
