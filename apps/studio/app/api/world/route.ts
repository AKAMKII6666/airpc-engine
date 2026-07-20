/**
 * 模块名称：GET /api/world — 当前用户 Profile.world + schedule
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const host = await getStudioEngineHost();
    const profile = await host.ensureProfile(userId);
    const world = profile.world ?? { lore: null, facts: [], knowledge: {} };
    const schedule = profile.schedule ?? { clockMs: 0, intents: [] };
    return apiOk({
      userId,
      location: profile.user.location ?? null,
      world: {
        lore: world.lore ?? null,
        facts: Array.isArray(world.facts) ? world.facts : [],
        knowledge:
          world.knowledge && typeof world.knowledge === "object"
            ? world.knowledge
            : {},
      },
      schedule: {
        clockMs:
          typeof schedule.clockMs === "number" ? schedule.clockMs : 0,
        intents: Array.isArray(schedule.intents) ? schedule.intents : [],
      },
    });
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
