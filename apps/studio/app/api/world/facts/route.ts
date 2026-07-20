/**
 * 模块名称：PUT /api/world/facts — 整表替换 Profile.world.facts
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
  WorldFactsArraySchema,
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
    const factsRaw =
      body &&
      typeof body === "object" &&
      Array.isArray((body as { facts?: unknown }).facts)
        ? (body as { facts: unknown[] }).facts
        : Array.isArray(body)
          ? body
          : null;
    if (!factsRaw) {
      return apiFail(
        "VALIDATION_FAILED",
        "body must be { facts: WorldFact[] } or WorldFact[]",
      );
    }
    const withDefaults = factsRaw.map(function (item) {
      if (!item || typeof item !== "object") return item;
      const f = item as Record<string, unknown>;
      return {
        ...f,
        type: typeof f.type === "string" ? f.type : "generic",
        visibility:
          typeof f.visibility === "string" ? f.visibility : "global",
        updatedAt:
          typeof f.updatedAt === "string" && f.updatedAt
            ? f.updatedAt
            : new Date().toISOString(),
        value: f.value ?? true,
      };
    });
    const parsed = WorldFactsArraySchema.safeParse(withDefaults);
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
    if (!profile.world) {
      profile.world = { lore: null, facts: [], knowledge: {} };
    }
    profile.world.facts = parsed.data;
    await host.saveProfile(userId, "manual");
    return apiOk({ facts: parsed.data });
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
