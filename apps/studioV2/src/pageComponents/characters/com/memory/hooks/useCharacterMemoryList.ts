/**
	* 记忆分页：转发 feature bis；items/loading 真源在 characters store。
	*/
import {
	useCharacterMemoryListBis,
	type CharacterMemoryListBis,
} from "@studio-v2/src/bis/pageBis/characters/memory/session/characterMemoryList.bis";

export type UseCharacterMemoryListResult = CharacterMemoryListBis;

/**
	* userId 变化时 bis 自动回到第 1 页并重新拉取。
	*/
export function useCharacterMemoryList(
	agentId: string,
	userId: string,
): UseCharacterMemoryListResult {
	return useCharacterMemoryListBis(agentId, userId);
}
