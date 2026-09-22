/**
	* 角色库 BFF 请求：读写 data/characters（经 /api/characters）。
	* 仅返回 CharacterDef 形状；投影到 CharacterSummary 在 bis。
	*/
import type { CharacterDef } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";

export type CharactersListData = {
	characters: CharacterDef[];
};

export type CharacterOneData = {
	character: CharacterDef;
};

/** GET /api/characters：列出磁盘角色 */
export async function fetchCharacterDefs(): Promise<CharacterDef[]> {
	const res = await fetch("/api/characters");
	const data = await parseStudioApiJson<CharactersListData>(res);
	return data.characters;
}

/** GET /api/characters/:agentId */
export async function fetchCharacterDef(
	agentId: string,
): Promise<CharacterDef> {
	const res = await fetch(`/api/characters/${encodeURIComponent(agentId)}`);
	const data = await parseStudioApiJson<CharacterOneData>(res);
	return data.character;
}

/** PUT /api/characters/:agentId：整卡落盘 */
export async function putCharacterDef(
	agentId: string,
	character: CharacterDef,
): Promise<CharacterDef> {
	const res = await fetch(`/api/characters/${encodeURIComponent(agentId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ character }),
	});
	const data = await parseStudioApiJson<CharacterOneData>(res);
	return data.character;
}

/** POST /api/characters：新建落盘 */
export async function postCharacterDef(
	character: CharacterDef,
): Promise<CharacterDef> {
	const res = await fetch("/api/characters", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ character }),
	});
	const data = await parseStudioApiJson<CharacterOneData>(res);
	return data.character;
}

/** DELETE /api/characters/:agentId */
export async function deleteCharacterDef(agentId: string): Promise<void> {
	const res = await fetch(`/api/characters/${encodeURIComponent(agentId)}`, {
		method: "DELETE",
	});
	await parseStudioApiJson<{ ok: true }>(res);
}
