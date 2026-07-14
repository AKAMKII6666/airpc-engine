/**
 * 模块名称：GET/PUT/DELETE /api/characters/[agentId]
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import {
  deleteCharacter,
  readCharacter,
  writeCharacter,
} from "@studio/server/charactersFs.server";
import { reloadStudioWorkspace } from "@studio/server/engineHost.server";
import {
  CharacterDefSchema,
  formatZodError,
  isEngineError,
} from "@airpc/rpg-engine";

function assertNarrativeRules(def: {
  isNarrativeOnly?: boolean;
  dialable?: boolean;
  freeCardId?: string;
}): string | null {
  if (def.isNarrativeOnly === true && def.dialable === true) {
    return "isNarrativeOnly cannot be dialable (NARRATIVE_DIALABLE)";
  }
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
  try {
    const { agentId } = await ctx.params;
    const character = await readCharacter(agentId);
    return apiOk({ character });
  } catch (err) {
    return apiFail(
      "NOT_FOUND",
      err instanceof Error ? err.message : String(err),
      404,
    );
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
  try {
    const { agentId } = await ctx.params;
    const body = (await req.json()) as { character?: unknown };
    if (!body.character || typeof body.character !== "object") {
      return apiFail("VALIDATION_FAILED", "character object required");
    }
    const raw = body.character as { agentId?: string };
    if (raw.agentId && raw.agentId !== agentId) {
      return apiFail("VALIDATION_FAILED", "agentId mismatch");
    }
    const parsed = CharacterDefSchema.safeParse({ ...raw, agentId });
    if (!parsed.success) {
      return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
        issues: parsed.error.issues,
      });
    }
    const narrativeErr = assertNarrativeRules(parsed.data);
    if (narrativeErr) {
      return apiFail("VALIDATION_FAILED", narrativeErr, 400);
    }
    let toWrite = parsed.data;
    if (toWrite.isNarrativeOnly === true) {
      toWrite = {
        ...toWrite,
        dialable: false,
        freeCardId: undefined,
      };
    }
    await writeCharacter(agentId, toWrite);
    await reloadStudioWorkspace();
    const warnings: string[] = [];
    if (
      parsed.data.isNarrativeOnly === true &&
      typeof parsed.data.freeCardId === "string" &&
      parsed.data.freeCardId
    ) {
      warnings.push(
        "narrative-only：已清除 freeCardId（NARRATIVE_NEEDS_NO_FREE）",
      );
    }
    return apiOk({ character: toWrite, warnings });
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

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ agentId: string }> },
): Promise<Response> {
  try {
    const { agentId } = await ctx.params;
    await deleteCharacter(agentId);
    await reloadStudioWorkspace();
    return apiOk({ ok: true });
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
