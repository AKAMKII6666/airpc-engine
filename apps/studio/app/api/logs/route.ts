/**
 * 模块名称：GET /api/logs — Host ring + 磁盘 jsonl 切片
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId =
      url.searchParams.get("userId") ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const day = url.searchParams.get("day") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "80");
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const ring = host.getRecentLogs({ userId, limit: Math.min(limit, 200) });
    const fileSlice = await host.readLogFileSlice({
      day,
      limit: Math.min(limit, 200),
    });
    if (isEngineError(fileSlice)) {
      return apiFail(
        fileSlice.code,
        fileSlice.message,
        httpStatusForCode(fileSlice.code),
      );
    }
    return apiOk({
      ring,
      file: fileSlice.file,
      fileLines: fileSlice.lines,
      truncated: fileSlice.truncated,
      note: "jsonl 写入侧已脱敏 private*／openingPrivate／privateBrief",
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
