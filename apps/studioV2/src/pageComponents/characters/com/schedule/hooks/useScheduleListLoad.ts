/**
	* 定时外呼列表：转发 feature bis；intents/loading 真源在 characters store。
	*/
import {
	useCharacterScheduleListBis,
	type CharacterScheduleListBis,
} from "@studio-v2/src/bis/pageBis/characters/schedule/session/characterScheduleList.bis";

export type ScheduleListLoadState = CharacterScheduleListBis;

/**
	* 挂载/切换 userId 时由 bis 拉取；无 userId 则清空。
	*/
export function useScheduleListLoad(
	userId: string,
	agentId: string,
): ScheduleListLoadState {
	return useCharacterScheduleListBis(userId, agentId);
}
