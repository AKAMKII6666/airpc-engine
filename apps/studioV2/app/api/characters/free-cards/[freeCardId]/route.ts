/**
	* GET/PUT /api/characters/free-cards/[freeCardId]
	* Free 卡真源；强制 cardKind=free、exits=[]（无故事式可编辑出口）。
	*/
import {
	CallCardDefinitionSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	isValidFreeCardId,
	readFreeCardJson,
	writeFreeCardJson,
} from "@studio-v2/src/utils/server/characters/freeCards/freeCardsFs.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ freeCardId: string }> },
): Promise<Response> {
	try {
		const { freeCardId } = await ctx.params;
		if (!isValidFreeCardId(freeCardId)) {
			return apiFail("VALIDATION_FAILED", "freeCardId 格式无效");
		}
		const raw = await readFreeCardJson(freeCardId);
		const parsed = CallCardDefinitionSchema.safeParse(raw);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		if (parsed.data.cardKind !== "free") {
			return apiFail("VALIDATION_FAILED", "cardKind must be free", 422);
		}
		return apiOk({ card: parsed.data });
	} catch (err) {
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

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ freeCardId: string }> },
): Promise<Response> {
	try {
		const { freeCardId } = await ctx.params;
		if (!isValidFreeCardId(freeCardId)) {
			return apiFail("VALIDATION_FAILED", "freeCardId 格式无效");
		}
		const body = (await req.json()) as { card?: unknown };
		if (!body.card || typeof body.card !== "object") {
			return apiFail("VALIDATION_FAILED", "card object required");
		}
		const raw = body.card as { cardId?: string; cardKind?: string };
		if (raw.cardId && raw.cardId !== freeCardId) {
			return apiFail("VALIDATION_FAILED", "cardId mismatch");
		}
		// Free 卡禁止故事式 exits：落盘前强制清空
		const parsed = CallCardDefinitionSchema.safeParse({
			...raw,
			cardId: freeCardId,
			cardKind: "free",
			exits: [],
		});
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		await writeFreeCardJson(freeCardId, parsed.data);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({ card: parsed.data });
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
