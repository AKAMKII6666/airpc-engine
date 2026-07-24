/**
	* 记忆区调试用户：转发 feature bis；列表真源在 characters store。
	*/
import {
	useCharacterPanelUsersBis,
	type CharacterPanelUsersBis,
} from "@studio-v2/src/bis/pageBis/characters/memory/session/characterPanelUsers.bis";

export type UseCharacterMemoryUsersResult = CharacterPanelUsersBis;

/**
	* 挂载时由 bis 拉调试用户；保留已选 userId 若仍存在于列表中。
	*/
export function useCharacterMemoryUsers(): UseCharacterMemoryUsersResult {
	return useCharacterPanelUsersBis();
}
