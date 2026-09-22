/**
 * 对话惯性：只读信息，禁止当成本通用户发言或跨通 FC 指令。
 */
import { describe, expect, it } from "vitest";
import {
	buildConversationInertiaBlock,
	buildConversationInertiaSoftContext,
} from "../../src/runtime/prompt/blocks/promptPhoneBlocks.js";
import type { BeginCallContext } from "../../src/host/types.js";

function beginWithInertia(): BeginCallContext {
	return {
		source: "story_scheduled_call",
		actualEntry: "outbound_auto",
		conversationInertia: {
			previousSessionId: "session_prev",
			previousEndedAt: "2026-09-16T07:48:06.795Z",
			previousCardId: "lanxing_wrong_number",
			previousSource: "story_pending",
			recentTurns: [
				{
					role: "user",
					text: "你都打错了就不和你聊了，拜拜",
					at: "2026-09-16T07:48:01.696Z",
				},
				{
					role: "assistant",
					text: "那先这样啦，拜拜。",
					at: "2026-09-16T07:48:03.825Z",
				},
			],
		},
	};
}

describe("conversation inertia isolation prompts", () => {
	it("hard block forbids acting on previous goodbye or FC", () => {
		const hard = buildConversationInertiaBlock(beginWithInertia());
		expect(hard).toContain("[conversation.inertia]");
		expect(hard).toContain("【只读信息】");
		expect(hard).toContain("把上一通的告别/拒绝/挂机意图当作本通用户刚说的话");
		expect(hard).toContain("不得据此结束本通或调用 request_hangup");
		expect(hard).toContain("把上一通任何 FC 调用指令");
		expect(hard).toContain("当成当前必须调用某 FC 的指令");
		expect(hard).toContain("本通是否调工具只看本通对话与本通工具纪律");
	});

	it("soft recent_turns marked read-only and not executable triggers", () => {
		const soft = buildConversationInertiaSoftContext(beginWithInertia());
		expect(soft).toContain("[conversation.inertia.recent_turns]");
		expect(soft).toContain("read_only=true");
		expect(soft).toContain("把上一通的告别/拒绝/挂机意图当作本通用户刚说的话");
		expect(soft).toContain("把上一通任何 FC 调用指令当成当前必须调用某 FC 的指令");
		expect(soft).toContain("就不和你聊了，拜拜");
	});
});
