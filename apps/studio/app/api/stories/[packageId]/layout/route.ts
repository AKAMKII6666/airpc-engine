/**
 * 模块名称：GET/PUT /api/stories/[packageId]/layout
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  readStoryLayout,
  writeStoryLayout,
  type StoryLayoutFile,
} from "@studio/server/storiesFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    const layout = await readStoryLayout(packageId);
    return apiOk({ layout });
  } catch (err) {
    return apiFail(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
      500,
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    const body = (await req.json()) as { layout?: StoryLayoutFile };
    if (!body.layout) {
      return apiFail("VALIDATION_FAILED", "layout required");
    }
    if (body.layout.packageId !== packageId) {
      return apiFail("VALIDATION_FAILED", "layout.packageId mismatch");
    }
    await writeStoryLayout(packageId, body.layout);
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
