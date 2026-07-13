/**
 * 模块名称：当前选中 userId（cookie）
 */
import { cookies } from "next/headers";

export const USER_COOKIE = "airpc_userId";

export async function getSelectedUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(USER_COOKIE)?.value ?? null;
}

export async function requireSelectedUserId(): Promise<string> {
  const userId = await getSelectedUserId();
  if (!userId) {
    throw Object.assign(new Error("user required"), {
      code: "USER_REQUIRED",
    });
  }
  return userId;
}
