/**
	* characters 子面板（panelUsers / memory / schedule）结果型 write。
	*/
import type { StoreApi } from "zustand";
import type {
	CharactersMemoryLoadResult,
	CharactersPanelUsersLoadResult,
	CharactersScheduleLoadResult,
} from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";
import type { CharactersStoreState } from "@studio-v2/src/stores/characters/model/charactersStoreModel";

type CharactersSet = StoreApi<CharactersStoreState>["setState"];

function createPanelUsersActions(
	set: CharactersSet,
): Pick<
	CharactersStoreState,
	| "applyPanelUsersLoadStarted"
	| "applyPanelUsersLoadResult"
	| "setPanelUserId"
> {
	return {
		applyPanelUsersLoadStarted() {
			set({
				panelUsersLoading: true,
				panelUsersError: undefined,
			});
		},

		applyPanelUsersLoadResult(result: CharactersPanelUsersLoadResult) {
			if (!result.ok) {
				set({
					panelUsersLoading: false,
					panelUsersError: result.message,
					panelUsers: [],
					panelUserId: "",
				});
				return;
			}
			set(function (prev) {
				const list = [...result.users];
				const keep =
					prev.panelUserId !== "" &&
					list.some(function (u) {
						return u.userId === prev.panelUserId;
					});
				return {
					panelUsersLoading: false,
					panelUsersError: undefined,
					panelUsers: list,
					panelUserId: keep
						? prev.panelUserId
						: (list[0]?.userId ?? ""),
				};
			});
		},

		setPanelUserId(userId) {
			set({ panelUserId: userId });
		},
	};
}

function createMemoryPanelActions(
	set: CharactersSet,
): Pick<
	CharactersStoreState,
	| "applyMemoryLoadStarted"
	| "applyMemoryLoadResult"
	| "clearMemoryList"
> {
	return {
		applyMemoryLoadStarted() {
			set({
				memoryLoading: true,
				memoryError: undefined,
			});
		},

		applyMemoryLoadResult(result: CharactersMemoryLoadResult) {
			if (!result.ok) {
				set({
					memoryLoading: false,
					memoryError: result.message,
					memoryItems: [],
					memoryTotal: 0,
				});
				return;
			}
			set({
				memoryLoading: false,
				memoryError: undefined,
				memoryItems: [...result.items],
				memoryTotal: result.total,
				memoryPage: result.page,
			});
		},

		clearMemoryList() {
			set({
				memoryItems: [],
				memoryTotal: 0,
				memoryPage: 1,
				memoryLoading: false,
				memoryError: undefined,
			});
		},
	};
}

function createSchedulePanelActions(
	set: CharactersSet,
): Pick<
	CharactersStoreState,
	| "applyScheduleLoadStarted"
	| "applyScheduleLoadResult"
	| "clearScheduleList"
	| "setScheduleError"
> {
	return {
		applyScheduleLoadStarted() {
			set({
				scheduleLoading: true,
				scheduleError: undefined,
			});
		},

		applyScheduleLoadResult(result: CharactersScheduleLoadResult) {
			if (!result.ok) {
				set({
					scheduleLoading: false,
					scheduleError: result.message,
					scheduleIntents: [],
				});
				return;
			}
			set({
				scheduleLoading: false,
				scheduleError: undefined,
				scheduleIntents: [...result.intents],
				scheduleClockMs: result.clockMs,
			});
		},

		clearScheduleList() {
			set({
				scheduleIntents: [],
				scheduleClockMs: 0,
				scheduleLoading: false,
				scheduleError: undefined,
			});
		},

		setScheduleError(message) {
			set({ scheduleError: message });
		},
	};
}

/** 调试用户、记忆分页、日程列表 */
export function createCharactersPanelActions(
	set: CharactersSet,
): Pick<
	CharactersStoreState,
	| "applyPanelUsersLoadStarted"
	| "applyPanelUsersLoadResult"
	| "setPanelUserId"
	| "applyMemoryLoadStarted"
	| "applyMemoryLoadResult"
	| "clearMemoryList"
	| "applyScheduleLoadStarted"
	| "applyScheduleLoadResult"
	| "clearScheduleList"
	| "setScheduleError"
> {
	return {
		...createPanelUsersActions(set),
		...createMemoryPanelActions(set),
		...createSchedulePanelActions(set),
	};
}
