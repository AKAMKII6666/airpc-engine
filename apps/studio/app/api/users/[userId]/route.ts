/**
 * 模块名称：DELETE /api/users/[userId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { deleteUserProfile } from "@studio/server/usersFs.server";
import {
  getSelectedUserId,
  USER_COOKIE,
} from "@studio/server/sessionUser.server";
import { cookies } from "next/headers";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
  try {
    const { userId } = await ctx.params;
    await deleteUserProfile(userId);
    const selected = await getSelectedUserId();
    if (selected === userId) {
      const jar = await cookies();
      jar.delete(USER_COOKIE);
    }
    return apiOk({ ok: true });
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
