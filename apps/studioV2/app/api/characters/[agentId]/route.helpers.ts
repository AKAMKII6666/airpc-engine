/**
	* /api/characters/[agentId] 旁路：DELETE 前读取 freeCardId。
	*/
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { readCharacterJson } from "@studio-v2/src/utils/server/characters/charactersFs.server";

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
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

/**
	* 删角色前尽力读出 freeCardId；读失败或字段缺失返回 undefined（幂等）。
	*/
export async function readFreeCardIdForDelete(
	agentId: string,
): Promise<string | undefined> {
	try {
		const raw = await readCharacterJson(agentId);
		if (typeof raw !== "object" || raw === null) {
			return undefined;
		}
		const freeCardId = (raw as { freeCardId?: unknown }).freeCardId;
		return typeof freeCardId === "string" ? freeCardId : undefined;
	} catch {
		return undefined;
	}
}
