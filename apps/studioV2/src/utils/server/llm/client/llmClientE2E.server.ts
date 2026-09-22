/** Deterministic LLM adapter used only by the isolated Studio E2E harness. */
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";
import type {
	ServerLlmChatInput,
	ServerLlmChatResult,
	ServerLlmStreamCallbacks,
} from "./llmClient.server";

function scriptedText(input: ServerLlmChatInput): string {
	if (input.responseFormat === "json_object") return "{}";
	return "E2E scripted assistant reply.";
}

function lastUserText(input: ServerLlmChatInput): string {
	for (let index = input.messages.length - 1; index >= 0; index -= 1) {
		const message = input.messages[index];
		if (message?.role === "user") return message.content;
	}
	return "";
}

function hasToolResult(input: ServerLlmChatInput): boolean {
	return input.messages.some(function (message) {
		return message.role === "tool";
	});
}

function hasTool(input: ServerLlmChatInput, toolId: string): boolean {
	return input.tools?.some(function (tool) {
		return tool.function.name === toolId;
	}) === true;
}

function scriptedToolResult(input: ServerLlmChatInput): ServerLlmChatResult | null {
	if (input.responseFormat === "json_object") return null;
	const userText = lastUserText(input);
	if (hasToolResult(input)) {
		return {
			text: userText.includes("E2E_PLUGIN_CALL")
				? "E2E plugin result accepted."
				: "E2E hangup acknowledged.",
			toolCalls: [],
			finishReason: "stop",
			responseId: "airpc-e2e-tool-result",
			model: "airpc-e2e-scripted-model",
		};
	}
	if (userText.includes("E2E_REQUEST_HANGUP")) {
		if (!hasTool(input, "request_hangup")) {
			return {
				text: "E2E no hangup tool.",
				toolCalls: [],
				finishReason: "stop",
				responseId: "airpc-e2e-no-hangup",
				model: "airpc-e2e-scripted-model",
			};
		}
		return {
			text: "",
			toolCalls: [{
				id: "airpc-e2e-request-hangup",
				name: "request_hangup",
				argumentsJson: JSON.stringify({
					reasonKind: "natural",
					reason: "E2E natural goodbye",
				}),
			}],
			finishReason: "tool_calls",
			responseId: "airpc-e2e-hangup-call",
			model: "airpc-e2e-scripted-model",
		};
	}
	const pluginToolId = "plugin:e2e-tools:echo";
	if (userText.includes("E2E_PLUGIN_CALL") && hasTool(input, pluginToolId)) {
		return {
			text: "",
			toolCalls: [{
				id: "airpc-e2e-plugin-call",
				name: pluginToolId,
				argumentsJson: JSON.stringify({ value: "roundtrip" }),
			}],
			finishReason: "tool_calls",
			responseId: "airpc-e2e-plugin-tool-call",
			model: "airpc-e2e-scripted-model",
		};
	}
	return null;
}

/** Returns null outside E2E; validates the disposable workspace before bypassing I/O. */
export function runE2ELlmIfEnabled(
	input: ServerLlmChatInput,
	callbacks: ServerLlmStreamCallbacks = {},
): ServerLlmChatResult | null {
	if (process.env.AIRPC_E2E !== "1") return null;
	getStudioV2DataRoot();
	const toolResult = scriptedToolResult(input);
	if (toolResult) {
		if (toolResult.text) callbacks.onTextDelta?.(toolResult.text);
		return toolResult;
	}
	const text = scriptedText(input);
	callbacks.onTextDelta?.(text);
	return {
		text,
		toolCalls: [],
		finishReason: "stop",
		responseId: "airpc-e2e-scripted-response",
		model: "airpc-e2e-scripted-model",
	};
}
