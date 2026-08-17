/**
	* 角色记忆清空：经 ajaxProxy 调 DELETE；UI hook 不得直引 memoryApi。
	*/
import {
	clearMemoryForAgent,
	type ClearMemoryResult,
} from "@studio-v2/src/utils/ajaxProxy/library/api/memoryApi";

/**
	* 清空当前角色对指定玩家的记忆与对话惯性。
	*/
export async function clearCharacterMemory(input: {
	userId: string;
	agentId: string;
}): Promise<ClearMemoryResult> {
	return clearMemoryForAgent({
		userId: input.userId,
		agentId: input.agentId,
	});
}
