/**
 * 模块名称：GET/POST /api/users
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  createUserProfile,
  listUserSummaries,
} from "@studio/server/usersFs.server";

export async function GET(): Promise<Response> {
  try {
    const users = await listUserSummaries();
    return apiOk({ users });
  } catch (err) {
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
      userId?: string;
      nickname?: string;
    };
    if (!body.userId || !body.nickname) {
      return apiFail("VALIDATION_FAILED", "userId and nickname required");
    }
    const user = await createUserProfile({
      userId: body.userId,
      nickname: body.nickname,
    });
    return apiOk({ user }, { status: 201 });
  } catch (err) {
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: string }).code)
        : "ENGINE_INTERNAL";
    return apiFail(
      code,
      err instanceof Error ? err.message : String(err),
      httpStatusForCode(code),
    );
  }
}
