/**
 * 模块名称：POST /api/stories/[packageId]/validate
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  getStudioEngineHost,
  reloadStudioWorkspace,
} from "@studio/server/engineHost.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
  try {
    const { packageId } = await ctx.params;
    await reloadStudioWorkspace();
    const host = await getStudioEngineHost();
    const report = await host.validatePackage(packageId);
    return apiOk({ report });
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
