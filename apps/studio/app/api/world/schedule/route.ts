/**
 * 模块名称：PUT /api/world/schedule — 有限编辑 clockMs / intents
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import {
  isEngineError,
  ProfileScheduleSchema,
} from "@airpc/rpg-engine";

export async function PUT(req: Request): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const body = (await req.json().catch(function () {
      return null;
    })) as unknown;
    if (!body || typeof body !== "object") {
      return apiFail(
        "VALIDATION_FAILED",
        "body must be { clockMs, intents }",
      );
    }
    const parsed = ProfileScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return apiFail(
        "VALIDATION_FAILED",
        parsed.error.issues.map(function (i) {
          return `${i.path.join(".")}: ${i.message}`;
        }).join("; "),
        400,
        parsed.error.flatten(),
      );
    }
    const host = await getStudioEngineHost();
    const profile = await host.ensureProfile(userId);
    profile.schedule = {
      clockMs: parsed.data.clockMs,
      intents: parsed.data.intents,
    };
    await host.saveProfile(userId, "manual");
    return apiOk({ schedule: profile.schedule });
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
