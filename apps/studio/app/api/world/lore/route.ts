/**
 * 模块名称：PUT /api/world/lore — 手改保存 WorldLoreDoc
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
  WorldLoreDocSchema,
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
      return apiFail("VALIDATION_FAILED", "body must be WorldLoreDoc object");
    }
    const raw = body as Record<string, unknown>;
    const candidate = {
      ...raw,
      version: 1,
      source: "manual",
      generatedAt:
        typeof raw.generatedAt === "string" && raw.generatedAt
          ? raw.generatedAt
          : new Date().toISOString(),
    };
    const parsed = WorldLoreDocSchema.safeParse(candidate);
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
    profile.world.lore = parsed.data;
    await host.saveProfile(userId, "manual");
    return apiOk({ lore: parsed.data });
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
