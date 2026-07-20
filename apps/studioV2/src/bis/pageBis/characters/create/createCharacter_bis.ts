/**
	* 新建角色：经 API 落盘 data/characters；agentId 系统生成。
	*/
import {
	buildCreateCharacterDef,
	characterDefToSummary,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { postCharacterDef } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CreateCharacterFormValues } from "./createCharacterForm";

/**
	* 创建写盘成功后的返回契约：供列表选中与详情跳转；不持引擎写口。
	*/
export type CreateCharacterResult = {
	/** 新建后的 agentId，供选中详情；与落盘 CharacterDef 同生命周期 */
	agentId: string;
	/**
		* 列表/侧栏用的只读投影；由落盘 Def 映射，非独立持久化实体。
		*/
	summary: CharacterSummary;
};

/**
	* 创建角色并写盘；返回投影供列表选中。
	*/
export async function commitCreateCharacter(
	values: CreateCharacterFormValues,
): Promise<CreateCharacterResult> {
	const displayName = values.displayName.trim();
	const agentId = createStudioId("agent", displayName);
	const def = buildCreateCharacterDef({
		agentId,
		displayName,
		kind: values.kind,
		bio: values.bio,
	});
	const saved = await postCharacterDef(def);
	const summary = characterDefToSummary(saved);
	return {
		agentId: saved.agentId,
		summary: {
			...summary,
			kind: values.kind,
			bio: values.bio.trim(),
		},
	};
}
