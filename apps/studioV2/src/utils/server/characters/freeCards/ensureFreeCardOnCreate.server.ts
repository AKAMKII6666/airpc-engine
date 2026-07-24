/**
	* 新建角色时原子挂载默认 Free 卡；narrative-only 跳过。
	*/
import type { CharacterDef } from "@airpc/rpg-engine";
import {
	buildDefaultFreeCardJson,
	freeCardExists,
	isValidFreeCardId,
	writeFreeCardJson,
} from "@studio-v2/src/utils/server/characters/freeCards/freeCardsFs.server";

export type EnsureFreeCardOnCreateResult =
	| { ok: true; character: CharacterDef }
	| { ok: false; code: string; message: string };

/**
	* 可通话角色：确保 freeCardId + 写入默认 free-cards 文件。
	* 已存在同名 Free 卡文件时失败，避免覆盖。
	*/
export async function ensureFreeCardOnCreate(
	character: CharacterDef,
): Promise<EnsureFreeCardOnCreateResult> {
	if (character.isNarrativeOnly === true) {
		return { ok: true, character };
	}
	const freeCardId =
		typeof character.freeCardId === "string" && character.freeCardId.length > 0
			? character.freeCardId
			: `${character.agentId}_free`;
	if (!isValidFreeCardId(freeCardId)) {
		return { ok: false, code: "VALIDATION_FAILED", message: "freeCardId 格式无效" };
	}
	if (await freeCardExists(freeCardId)) {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: `free card already exists: ${freeCardId}`,
		};
	}
	const displayName =
		typeof character.displayName === "string" &&
		character.displayName.trim().length > 0
			? character.displayName.trim()
			: character.agentId;
	await writeFreeCardJson(
		freeCardId,
		buildDefaultFreeCardJson({
			freeCardId,
			agentId: character.agentId,
			displayName,
		}),
	);
	return { ok: true, character: { ...character, freeCardId } };
}
