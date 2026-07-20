/**
	* 角色详情保存：经 API 写 data/characters，回读投影；禁止把记忆写入角色 JSON。
	*/
import type { CharacterDef } from "@airpc/rpg-engine";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import {
	fetchCharacterDef,
	putCharacterDef,
} from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import {
	characterDefToSummary,
	mergeDetailFormIntoCharacterDef,
} from "../form/characterDefMapper";
import type { CharacterDetailFormValues } from "../form/characterDetailFormValues";

/**
	* 读取磁盘角色 → 合并表单 → PUT → 再投影为 CharacterSummary。
	*/
export async function commitSaveCharacterDetail(
	previous: CharacterSummary,
	values: CharacterDetailFormValues,
): Promise<CharacterSummary> {
	const existing = await fetchCharacterDef(previous.agentId);
	const merged: CharacterDef = mergeDetailFormIntoCharacterDef(
		existing,
		values,
	);
	const saved = await putCharacterDef(previous.agentId, merged);
	const summary = characterDefToSummary(saved);
	// 保留会话侧列表标签（kind/bio/引用），避免落盘缺字段冲掉 UI 投影
	return {
		...summary,
		kind: previous.kind,
		bio: previous.bio,
		packageRefCount: previous.packageRefCount,
		referenceLines: previous.referenceLines,
		socialSummary:
			summary.socialSummary || previous.socialSummary,
	};
}
