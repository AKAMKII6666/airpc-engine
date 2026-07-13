/**
 * 模块名称：GET /api/stories/[packageId]
 */
import { apiFail, apiOk } from "@studio/server/apiResponse.server";
import { readStoryPackageConf } from "@studio/server/storiesFs.server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    const conf = await readStoryPackageConf(packageId);
    return apiOk({ conf });
  } catch (err) {
    return apiFail(
      "NOT_FOUND",
      err instanceof Error ? err.message : String(err),
      404,
    );
  }
}
