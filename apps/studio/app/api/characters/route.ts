/**
 * 模块名称：GET/POST /api/characters
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  createCharacter,
  listCharacters,
} from "@studio/server/charactersFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(): Promise<Response> {
  try {
    const characters = await listCharacters();
    return apiOk({ characters });
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
      agentId?: string;
      displayName?: string;
      withFreeCard?: boolean;
    };
    if (!body.agentId || typeof body.agentId !== "string") {
      return apiFail("VALIDATION_FAILED", "agentId required");
    }
    const created = await createCharacter({
      agentId: body.agentId,
      displayName: body.displayName,
      withFreeCard: body.withFreeCard,
    });
    await reloadStudioWorkspace();
    return apiOk({ character: created });
  } catch (err) {
    if (isEngineError(err)) {
      return apiFail(err.code, err.message, httpStatusForCode(err.code));
    }
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
