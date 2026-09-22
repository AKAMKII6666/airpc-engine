/**
	* /api/characters 旁路：POST 新建体校验与落盘前准备。
	*/
import {
	CharacterDefSchema,
	formatZodError,
	isEngineError,
	type CharacterDef,
} from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	characterExists,
	isValidAgentId,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import { ensureFreeCardOnCreate } from "@studio-v2/src/utils/server/characters/freeCards/ensureFreeCardOnCreate.server";
import { findTimeBucketsRejectReason } from "@studio-v2/src/utils/server/characters/timeBucketsReject.server";

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	return apiFail(
		"ENGINE_INTERNAL",
		err instanceof Error ? err.message : String(err),
		500,
	);
}

/**
	* 校验新建角色 body，并 ensure Free 卡；成功返回可落盘的 CharacterDef。
	*/
export async function prepareCreateCharacter(
	body: { character?: unknown },
): Promise<
	| { ok: true; character: CharacterDef }
	| { ok: false; response: Response }
> {
	if (!body.character || typeof body.character !== "object") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "character object required"),
		};
	}
	const raw = body.character as { agentId?: string };
	if (!raw.agentId || typeof raw.agentId !== "string") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "agentId required"),
		};
	}
	if (!isValidAgentId(raw.agentId)) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "agentId 格式无效"),
		};
	}
	if (await characterExists(raw.agentId)) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				`character already exists: ${raw.agentId}`,
			),
		};
	}
	const reject = findTimeBucketsRejectReason(body.character);
	if (reject) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", reject, 422),
		};
	}
	const parsed = CharacterDefSchema.safeParse(body.character);
	if (!parsed.success) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			),
		};
	}
	const ensured = await ensureFreeCardOnCreate(parsed.data);
	if (!ensured.ok) {
		return {
			ok: false,
			response: apiFail(ensured.code, ensured.message),
		};
	}
	return { ok: true, character: ensured.character };
}
