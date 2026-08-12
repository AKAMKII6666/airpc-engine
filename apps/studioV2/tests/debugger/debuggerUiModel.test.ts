/**
	* 调试器电话 UI 模型回归：留言灯依赖真实 mailbox 投影，不再使用前端 mock。
	*/
import { describe, expect, it } from "vitest";
import {
	callSessionMessages,
	firstUnreadVoicemail,
	latestRemoteHangupEvent,
	phoneDisplaySub,
	visibleIncomingCall,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type {
	DebuggerCallSessionView,
	DebuggerIncomingCallView,
} from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";

function slotFixture(
	patch: Partial<DebuggerVoicemailSlotView>,
): DebuggerVoicemailSlotView {
	return {
		id: "slot_1",
		agentId: "lanxing",
		cardId: "mailbox_card",
		packageId: "wrong_number_act1",
		status: "listened",
		textPreview: "已经听过",
		audioRef: "",
		createdAt: "",
		listenedAt: "",
		...patch,
	};
}

function callFixture(): DebuggerCallSessionView {
	return {
		sessionId: "session_1",
		userId: "demo-user",
		chapterId: "__free__",
		cardId: "lanxing_free",
		agentId: "lanxing",
		source: "free",
		cardTitle: "澜星自由通话",
		objective: "闲聊",
		interactionPhase: "dialogue",
		turns: [{ role: "assistant", text: "晚安。" }],
		llm: null,
		availableTools: [],
		promptTrace: {
			providerIds: [],
			providerRows: [],
			notes: [],
				matchedLayerIds: [],
				openingSpeakable: null,
				openingPolicy: null,
				openingSituation: null,
				systemHardBlocks: [],
				softContextBlocks: [],
			},
		recentToolEvents: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [{
			eventId: "shell_1",
			type: "call.hangup_requested",
			createdAt: "2026-08-11T00:00:00.000Z",
			agentId: "lanxing",
			source: "llm_tool",
			reason: "说完晚安后挂断",
		}],
	};
}

function incomingFixture(): DebuggerIncomingCallView {
	return {
		eventId: "incoming_1",
		userId: "demo-user",
		agentId: "lanxing",
		displayName: "澜星姐姐",
		phoneNumber: "1001",
		chapterId: "wrong_number_act1",
		cardId: "lanxing_callback_intro",
		instanceId: "pending_1",
		scheduleIntentId: "once_1",
		source: "schedule",
		status: "pending",
		createdAt: "2026-08-11T00:00:00.000Z",
	};
}

describe("debuggerUiModel voicemail", () => {
	it("selects the first real unread voicemail slot", () => {
		const unread = slotFixture({
			id: "slot_unread",
			status: "unread",
			textPreview: "新的留言",
		});

		expect(firstUnreadVoicemail([
			slotFixture({ id: "slot_old" }),
			unread,
			slotFixture({ id: "slot_stub", status: "stub_pending" }),
		])).toBe(unread);
	});

	it("shows voicemail hint only when receiver is lifted and mailbox has unread", () => {
		expect(phoneDisplaySub({
			phase: "ready",
			receiverMode: "handset",
			dialed: "",
		}, true)).toBe("有新的留言，点击 * 号可看留言");

		expect(phoneDisplaySub({
			phase: "ready",
			receiverMode: "speaker",
			dialed: "",
		}, false)).toBe("没有新的留言，输入号码后自动拨号");
	});

	it("projects remote hangup shell event into chat messages", () => {
		const session = callFixture();
		expect(latestRemoteHangupEvent(session)?.reason).toBe("说完晚安后挂断");
		expect(callSessionMessages(session).at(-1)).toMatchObject({
			speaker: "npc",
			text: "对方已挂断：说完晚安后挂断",
		});
	});

	it("hides incoming call modal while an active call is running", () => {
		const incoming = incomingFixture();
		expect(visibleIncomingCall(true, incoming)).toBeNull();
		expect(visibleIncomingCall(false, incoming)).toBe(incoming);
	});
});
