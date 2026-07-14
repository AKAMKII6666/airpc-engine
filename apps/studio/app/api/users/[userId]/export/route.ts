/**
 * 模块名称：GET /api/users/[userId]/export（SaveGame 单文件）
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiFail } from "@studio/server/apiResponse.server";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
  try {
    const { userId } = await ctx.params;
    const profilePath = path.join(
      getStudioDataRoot(),
      "users",
      userId,
      "profile.save.json",
    );
    const text = await readFile(profilePath, "utf8");
    return new Response(text, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${userId}-profile.save.json"`,
      },
    });
  } catch {
    return apiFail("NOT_FOUND", "profile not found", 404);
  }
}
