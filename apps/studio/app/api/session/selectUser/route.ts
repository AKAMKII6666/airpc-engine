/**
 * 模块名称：POST /api/session/selectUser
 */
import { cookies } from "next/headers";
import { apiFail, apiOk } from "@studio/server/apiResponse.server";
import { USER_COOKIE } from "@studio/server/sessionUser.server";
import { listUserSummaries } from "@studio/server/usersFs.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { userId?: string };
    if (!body.userId) {
      return apiFail("VALIDATION_FAILED", "userId required");
    }
    const users = await listUserSummaries();
    if (!users.some((u) => u.userId === body.userId)) {
      return apiFail("NOT_FOUND", "user not found", 404);
    }
    const host = await getStudioEngineHost();
    await host.ensureProfile(body.userId);

    const jar = await cookies();
    jar.set(USER_COOKIE, body.userId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return apiOk({ userId: body.userId });
  } catch (err) {
    return apiFail(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
      500,
    );
  }
}
