/**
 * 模块名称：POST /api/stories/[packageId]/cards/[cardId]/rename
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { renameStoryCard } from "@studio/server/storiesFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ packageId: string; cardId: string }> },
): Promise<Response> {
  try {
    const { packageId, cardId } = await ctx.params;
    const body = (await req.json()) as { newCardId?: string };
    if (!body.newCardId || typeof body.newCardId !== "string") {
      return apiFail("VALIDATION_FAILED", "newCardId required");
    }
    const result = await renameStoryCard(packageId, cardId, body.newCardId);
    await reloadStudioWorkspace();
    return apiOk(result);
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
