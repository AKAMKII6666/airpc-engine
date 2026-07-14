/**
 * 模块名称：GET/POST /api/stories
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  getStudioEngineHost,
  getWorkspaceLoadError,
  reloadStudioWorkspace,
} from "@studio/server/engineHost.server";
import {
  createStoryPackage,
  listStoryPackages,
} from "@studio/server/storiesFs.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
  try {
    await reloadStudioWorkspace();
    const host = await getStudioEngineHost();
    const packages = await listStoryPackages();
    const stories = [];
    for (const pkg of packages) {
      try {
        const report = await host.validatePackage(pkg.packageId);
        const errorCount = report.errors.length;
        const warningCount = report.warnings.length;
        const validationStatus =
          errorCount > 0
            ? ("error" as const)
            : warningCount > 0
              ? ("warning" as const)
              : ("ok" as const);
        stories.push({
          ...pkg,
          validationStatus,
          errorCount,
          warningCount,
        });
      } catch {
        stories.push({
          ...pkg,
          validationStatus: "unknown" as const,
          errorCount: 0,
          warningCount: 0,
        });
      }
    }
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

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      packageId?: string;
      title?: string;
    };
    if (!body.packageId || typeof body.packageId !== "string") {
      return apiFail("VALIDATION_FAILED", "packageId required");
    }
    const created = await createStoryPackage({
      packageId: body.packageId,
      title: body.title,
    });
    await reloadStudioWorkspace();
    return apiOk({ story: created });
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
