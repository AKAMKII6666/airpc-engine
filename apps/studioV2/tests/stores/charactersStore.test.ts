/**
	* charactersStore 结果型 action 回归：load / select / upsert / stamp / prefer。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	pickCharactersSelectedId,
	useCharactersStore,
} from "@studio-v2/src/stores/characters/charactersStore";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

function summary(agentId: string, displayName = agentId): CharacterSummary {
	return {
		agentId,
		displayName,
		kind: "story",
		avatarAssetId: null,
		bio: "",
		packageRefCount: 0,
		freeCall: "missing",
		freeCardId: null,
		lastEditedAt: "2026-01-01T00:00:00.000Z",
		referenceLines: [],
		identity: {
			fullName: displayName,
			nickname: "",
			gender: "unspecified",
			age: null,
			birthday: "",
			ageNote: "",
			phoneNumber: "",
			dialable: true,
		},
		persona: {
			systemPrompt: "",
			personalityCode: "",
			profession: "",
			speakingStyle: "",
			exampleLines: [],
			voiceId: "",
			voiceNotes: "",
		},
		socialSummary: "",
		meta: { phoneNumber: "", avatarAssetId: "" },
		callFlowPrompts: {
			longSilence: [],
			longCallNudge: [],
			preHangupFarewell: [],
		},
		defaultPromptScenes: [],
	};
}

describe("pickCharactersSelectedId", () => {
	it("优先 prefer，其次旧选中，否则首项", function () {
		const list = [summary("a"), summary("b")];
		expect(pickCharactersSelectedId(list, "b", "a")).toBe("b");
		expect(pickCharactersSelectedId(list, undefined, "b")).toBe("b");
		expect(pickCharactersSelectedId(list, "missing", "gone")).toBe("a");
		expect(pickCharactersSelectedId([], undefined, "a")).toBe("");
	});
});

describe("charactersStore", () => {
	beforeEach(function () {
		useCharactersStore.getState().resetCharactersSession();
		useCharactersStore.setState({ refreshStamp: 0 });
	});

	it("applyListLoadResult 成功灌列表并清 prefer", function () {
		useCharactersStore.getState().setPreferSelectedId("b");
		useCharactersStore.getState().applyListLoadStarted();
		expect(useCharactersStore.getState().loading).toBe(true);

		useCharactersStore.getState().applyListLoadResult({
			ok: true,
			characters: [summary("a"), summary("b")],
		});

		const state = useCharactersStore.getState();
		expect(state.loading).toBe(false);
		expect(state.loadError).toBeUndefined();
		expect(state.characters).toHaveLength(2);
		expect(state.selectedId).toBe("b");
		expect(state.preferSelectedId).toBeUndefined();
	});

	it("applyListLoadResult 失败清空列表", function () {
		useCharactersStore.getState().applyListLoadResult({
			ok: true,
			characters: [summary("a")],
		});
		useCharactersStore.getState().applyListLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useCharactersStore.getState();
		expect(state.characters).toEqual([]);
		expect(state.selectedId).toBe("");
		expect(state.loadError).toBe("boom");
		expect(state.loading).toBe(false);
	});

	it("applyCharacterUpsertResult 更新或追加并选中", function () {
		useCharactersStore.getState().applyListLoadResult({
			ok: true,
			characters: [summary("a", "旧名")],
		});
		useCharactersStore
			.getState()
			.applyCharacterUpsertResult(summary("a", "新名"));
		expect(useCharactersStore.getState().characters[0]?.displayName).toBe(
			"新名",
		);
		useCharactersStore
			.getState()
			.applyCharacterUpsertResult(summary("b", "新增"));
		expect(useCharactersStore.getState().characters).toHaveLength(2);
		expect(useCharactersStore.getState().selectedId).toBe("b");
	});

	it("bumpCharactersRefreshStamp 递增且 reset 保留 stamp", function () {
		useCharactersStore.getState().bumpCharactersRefreshStamp();
		useCharactersStore.getState().bumpCharactersRefreshStamp();
		expect(useCharactersStore.getState().refreshStamp).toBe(2);
		useCharactersStore.getState().applyListLoadResult({
			ok: true,
			characters: [summary("a")],
		});
		useCharactersStore.getState().resetCharactersSession();
		const state = useCharactersStore.getState();
		expect(state.characters).toEqual([]);
		expect(state.refreshStamp).toBe(2);
	});
});
