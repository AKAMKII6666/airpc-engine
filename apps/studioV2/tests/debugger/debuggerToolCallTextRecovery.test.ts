/**
	* Qwen 正文 XML tool_call 回收。
	*/
import { describe, expect, it } from "vitest";
import {
	parseQwenXmlToolCallsFromText,
	recoverToolCallsFromAssistantText,
	stripQwenXmlToolCalls,
} from "@studio-v2/src/utils/server/debugger/session/debuggerToolCallTextRecovery.server";

describe("debuggerToolCallTextRecovery", () => {
	it("parses qwen xml-ish tool calls from assistant text", () => {
		const text = [
			"<tool_call>",
			"<function=schedule_reminder_call>",
			"<parameter=topic_hint>",
			"提醒用户喝水",
			"</parameter>",
			"<parameter=delay_minutes>",
			"2",
			"</parameter>",
			"</function>",
			"</tool_call>",
		].join("\n");
		const calls = parseQwenXmlToolCallsFromText(text);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.name).toBe("schedule_reminder_call");
		expect(JSON.parse(calls[0]?.argumentsJson ?? "{}")).toEqual({
			topic_hint: "提醒用户喝水",
			delay_minutes: "2",
		});
		expect(stripQwenXmlToolCalls(text)).toBe("");
	});

	it("recovers empty structured toolCalls from text", () => {
		const recovered = recoverToolCallsFromAssistantText({
			text: "<tool_call>\n<function=record_user_name>\n<parameter=nickname>\n测测\n</parameter>\n</function>\n</tool_call>",
			toolCalls: [],
			finishReason: "stop",
			responseId: "x",
			model: "qwen3.5-flash",
		});
		expect(recovered.toolCalls).toHaveLength(1);
		expect(recovered.toolCalls[0]?.name).toBe("record_user_name");
		expect(recovered.finishReason).toBe("tool_calls");
		expect(recovered.text).toBe("");
	});
});
