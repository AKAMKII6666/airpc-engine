/**
	* 能力 API：llm 域。
	*/
import type {
	PluginCapabilityApi,
	PluginChatTextInput,
	PluginChatTextResult,
} from "@airpc/pack-sdk";
import { runServerLlmChat } from "@studio-v2/src/utils/server/llm/llmClient.server";
import type { WrapApiCall } from "./wrapApiCall.server";

export async function defaultLlmChatText(
	chatInput: PluginChatTextInput,
): Promise<PluginChatTextResult> {
	const result = await runServerLlmChat({
		messages: chatInput.messages.map(function (m) {
			return {
				role: m.role as "user" | "assistant" | "system",
				content: m.content,
			};
		}),
	});
	return { text: result.text ?? "" };
}

export function createLlmApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	llmChatText: (input: PluginChatTextInput) => Promise<PluginChatTextResult>;
}): Pick<PluginCapabilityApi, "llm"> {
	const { wrap, pluginId } = input;
	return {
		llm: {
			chatText(chatInput) {
				return wrap(pluginId, "llm.chatText", function () {
					return input.llmChatText(chatInput);
				});
			},
			chatStructured(chatInput) {
				return wrap(pluginId, "llm.chatStructured", async function () {
					const textResult = await input.llmChatText(chatInput);
					try {
						return JSON.parse(textResult.text);
					} catch {
						return { text: textResult.text };
					}
				});
			},
		},
	};
}
