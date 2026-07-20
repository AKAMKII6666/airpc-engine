/**
	* 删除角色：经 API 删除 data/characters/<agentId>.json。
	*/
import { deleteCharacterDef } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";

/**
	* 删除写盘成功后的回执：供列表移除选中态；不回滚 Memory/Profile。
	*/
export type DeleteCharacterResult = {
	/** 已删除的 agentId；调用方据此清本地选中，磁盘 JSON 已不存在 */
	agentId: string;
};

/**
	* 提交删除角色 JSON；副作用仅经 Next API，失败抛错不改本地假定。
	*/
export async function commitDeleteCharacter(
	agentId: string,
): Promise<DeleteCharacterResult> {
	await deleteCharacterDef(agentId);
	return { agentId };
}
