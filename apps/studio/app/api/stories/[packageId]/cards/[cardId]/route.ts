/**
 * 模块名称：GET/PUT /api/stories/[packageId]/cards/[cardId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  deleteStoryCard,
  readStoryCard,
  writeStoryCard,
} from "@studio/server/storiesFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import {
  CallCardDefinitionSchema,
  formatZodError,
  isEngineError,
} from "@airpc/rpg-engine";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ packageId: string; cardId: string }> },
): Promise<Response> {
  try {
    const { packageId, cardId } = await ctx.params;
    const card = await readStoryCard(packageId, cardId);
    return apiOk({ card });
  } catch (err) {
    const { cardId: missingId } = await ctx.params;
    return apiFail("NOT_FOUND", `card not found: ${missingId}`, 404);
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ packageId: string; cardId: string }> },
): Promise<Response> {
  try {
    const { packageId, cardId } = await ctx.params;
    const body = (await req.json()) as { card?: unknown };
    if (!body.card || typeof body.card !== "object") {
      return apiFail("VALIDATION_FAILED", "card object required");
    }
    const card = body.card as { cardId?: string };
    if (card.cardId && card.cardId !== cardId) {
      return apiFail("VALIDATION_FAILED", "card.cardId must match path cardId");
    }
    const parsed = CallCardDefinitionSchema.safeParse({ ...card, cardId });
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_FAILED",
        formatZodError(parsed.error),
        400,
        { issues: parsed.error.issues },
      );
    }
    const toWrite =
      parsed.data.interactionMode === "playback_only"
        ? {
            ...parsed.data,
            toolPolicy: { mode: "deny_all" as const, allowedToolIds: [] },
          }
        : parsed.data;
    await writeStoryCard(packageId, cardId, toWrite);
    await reloadStudioWorkspace();
    return apiOk({ ok: true });
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

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ packageId: string; cardId: string }> },
): Promise<Response> {
  try {
    const { packageId, cardId } = await ctx.params;
    await deleteStoryCard(packageId, cardId);
    await reloadStudioWorkspace();
    return apiOk({ ok: true });
  } catch (err) {
    return apiFail(
      "NOT_FOUND",
      err instanceof Error ? err.message : String(err),
      404,
    );
  }
}
