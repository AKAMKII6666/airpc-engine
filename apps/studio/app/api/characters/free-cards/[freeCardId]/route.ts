/**
 * 模块名称：GET/PUT /api/characters/free-cards/[freeCardId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  readFreeCard,
  writeFreeCard,
} from "@studio/server/charactersFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import {
  CallCardDefinitionSchema,
  formatZodError,
  isEngineError,
} from "@airpc/rpg-engine";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ freeCardId: string }> },
): Promise<Response> {
  try {
    const { freeCardId } = await ctx.params;
    const card = await readFreeCard(freeCardId);
    return apiOk({ card });
  } catch (err) {
    return apiFail(
      "NOT_FOUND",
      err instanceof Error ? err.message : String(err),
      404,
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ freeCardId: string }> },
): Promise<Response> {
  try {
    const { freeCardId } = await ctx.params;
    const body = (await req.json()) as { card?: unknown };
    if (!body.card || typeof body.card !== "object") {
      return apiFail("VALIDATION_FAILED", "card object required");
    }
    const raw = body.card as { cardId?: string; cardKind?: string };
    if (raw.cardId && raw.cardId !== freeCardId) {
      return apiFail("VALIDATION_FAILED", "cardId mismatch");
    }
    const parsed = CallCardDefinitionSchema.safeParse({
      ...raw,
      cardId: freeCardId,
      cardKind: "free",
    });
    if (!parsed.success) {
      return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
        issues: parsed.error.issues,
      });
    }
    await writeFreeCard(freeCardId, parsed.data);
    await reloadStudioWorkspace();
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
