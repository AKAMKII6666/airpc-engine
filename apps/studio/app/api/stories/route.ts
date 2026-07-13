/**
 * 模块名称：GET /api/stories
 */
import { apiFail, apiOk, httpStatusForCode } from "@studio/server/apiResponse.server";
import { getWorkspaceLoadError } from "@studio/server/engineHost.server";
import { listStoryPackages } from "@studio/server/storiesFs.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
  try {
    const stories = await listStoryPackages();
    return apiOk({ stories });
  } catch (err) {
    const wsErr = getWorkspaceLoadError();
    if (wsErr) {
      return apiFail(wsErr.code, wsErr.message, httpStatusForCode(wsErr.code));
    }
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
