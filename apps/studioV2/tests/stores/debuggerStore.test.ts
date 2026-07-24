/**
	* debuggerStore 结果型 action 回归：会话灌入 / 信箱 / stamp。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	DEBUGGER_STORE_DEFAULT_MAILBOX_USER_ID,
	useDebuggerStore,
} from "@studio-v2/src/stores/debugger/debuggerStore";
import type { DebuggerSessionSnapshot } from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import type { DebuggerMailboxSnapshot } from "@studio-v2/typeFiles/debugger/mailboxView";

function sampleSession(): DebuggerSessionSnapshot {
	return {
		scene: {
			packageTitle: "t",
			packageId: "p1",
			userDisplayName: "u",
			characterName: "c",
			startCardTitle: "card",
			sceneKind: "user_dial",
			useCurrentPending: true,
			resetStory: false,
		},
		callRun: {
			characterName: "c",
			cardTitle: "card",
			callKind: "story",
			goalSummary: "g",
			contextSummary: "",
			userEventSummary: "",
			replySummary: "",
		},
		exitHit: {
			exitTitle: "e",
			reason: "r",
			isFallback: false,
			actionLines: [],
		},
		effects: [],
		roleBoard: [],
		timeline: [],
		advanced: { rawJson: "{}", logLines: [] },
	};
}

function sampleMailbox(userId: string): DebuggerMailboxSnapshot {
	return {
		userId,
		hasUnread: true,
		slots: [],
	};
}

describe("debuggerStore", () => {
	beforeEach(function () {
		useDebuggerStore.getState().resetDebuggerSession();
		useDebuggerStore.setState({
			sessionRefreshStamp: 0,
			mailboxRefreshStamp: 0,
		});
	});

	it("applySessionLoadResult 成功灌会话", function () {
		useDebuggerStore.getState().applySessionLoadStarted();
		expect(useDebuggerStore.getState().sessionLoading).toBe(true);

		const session = sampleSession();
		useDebuggerStore.getState().applySessionLoadResult({
			ok: true,
			session,
		});

		const state = useDebuggerStore.getState();
		expect(state.sessionLoading).toBe(false);
		expect(state.sessionLoadError).toBeUndefined();
		expect(state.session?.scene.packageId).toBe("p1");
	});

	it("applySessionLoadResult 失败清空会话", function () {
		useDebuggerStore.getState().applySessionLoadResult({
			ok: true,
			session: sampleSession(),
		});
		useDebuggerStore.getState().applySessionLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useDebuggerStore.getState();
		expect(state.session).toBeNull();
		expect(state.sessionLoadError).toBe("boom");
		expect(state.sessionLoading).toBe(false);
	});

	it("信箱 load / command / stamp", function () {
		expect(useDebuggerStore.getState().mailboxUserId).toBe(
			DEBUGGER_STORE_DEFAULT_MAILBOX_USER_ID,
		);

		useDebuggerStore.getState().applyMailboxLoadStarted();
		useDebuggerStore.getState().applyMailboxLoadResult({
			ok: true,
			mailbox: sampleMailbox("demo-user"),
		});
		expect(useDebuggerStore.getState().mailbox?.hasUnread).toBe(true);

		useDebuggerStore.getState().applyMailboxCommandStarted();
		useDebuggerStore.getState().applyMailboxCommandResult({
			mailbox: { ...sampleMailbox("demo-user"), hasUnread: false },
			lastListenSummary: "done",
		});
		expect(useDebuggerStore.getState().mailboxBusy).toBe(false);
		expect(useDebuggerStore.getState().lastListenSummary).toBe("done");
		expect(useDebuggerStore.getState().mailbox?.hasUnread).toBe(false);

		useDebuggerStore.getState().bumpMailboxRefreshStamp();
		expect(useDebuggerStore.getState().mailboxRefreshStamp).toBe(1);
		useDebuggerStore.getState().bumpSessionRefreshStamp();
		expect(useDebuggerStore.getState().sessionRefreshStamp).toBe(1);
	});
});
