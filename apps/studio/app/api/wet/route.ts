/**
 * 模块名称：GET/POST /api/wet — WET 查询与受控追加
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
  isWetAppendableType,
  type WetAppendableType,
} from "@airpc/rpg-engine";

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId =
      url.searchParams.get("userId") ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const includeFile = url.searchParams.get("includeFile") !== "0";
    const result = await host.queryWet({
      userId,
      type: url.searchParams.get("type") ?? undefined,
      sessionId: url.searchParams.get("sessionId") ?? undefined,
      since: url.searchParams.get("since") ?? undefined,
      until: url.searchParams.get("until") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? "80"),
      includeFile,
    });
    if (isEngineError(result)) {
      return apiFail(
        result.code,
        result.message,
        httpStatusForCode(result.code),
      );
    }
    return apiOk(result);
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

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      type?: string;
      userId?: string;
      sessionId?: string;
      note?: string;
      payload?: Record<string, unknown>;
    };
    const userId = body.userId ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    if (!body.type || !isWetAppendableType(body.type)) {
      return apiFail(
        "VALIDATION_FAILED",
        "type must be wet.annotation or wet.compensation",
        400,
      );
    }
    if (!body.note || typeof body.note !== "string") {
      return apiFail("VALIDATION_FAILED", "note required", 400);
    }
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const result = host.appendWet({
      type: body.type as WetAppendableType,
      userId,
      sessionId: body.sessionId,
      note: body.note,
      payload: body.payload,
    });
    if (isEngineError(result)) {
      return apiFail(
        result.code,
        result.message,
        httpStatusForCode(result.code),
      );
    }
    return apiOk({ event: result });
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
