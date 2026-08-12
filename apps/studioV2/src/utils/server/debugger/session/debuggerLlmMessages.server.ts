/**
	* Host CallSession → LLM messages 投影。
	* 只把 Composer 已产出的公开调试上下文与 chatTurns 送入模型，不读取 Client 状态。
	*/
import type { CallSession, RenderedPrompt } from "@airpc/rpg-engine";
import type { ServerLlmChatMessage } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import { buildShellControlInstruction } from "@studio-v2/src/utils/server/debugger/shell/shellControlTools.server";

type TextLlmRole = "system" | "user" | "assistant";

function pushIfText(
	messages: ServerLlmChatMessage[],
	role: TextLlmRole,
	text: string | undefined,
): void {
	const trimmed = text?.trim();
	if (trimmed) messages.push({ role, content: trimmed });
}

function appendRenderedPrompt(
	messages: ServerLlmChatMessage[],
	prompt: RenderedPrompt | undefined,
): void {
	if (!prompt) return;
	for (const hard of prompt.systemHard) {
		pushIfText(messages, "system", hard);
	}
	pushIfText(messages, "system", prompt.speakable);
	pushIfText(messages, "system", prompt.private);
	for (const soft of prompt.softContext) {
		pushIfText(messages, "system", soft);
	}
	pushIfText(messages, "system", buildShellControlInstruction());
}

function appendOpeningInstruction(
	messages: ServerLlmChatMessage[],
	session: CallSession,
): void {
	const opening = session.renderedPrompt?.openingSpeakable;
	const policy = session.renderedPrompt?.openingPolicy;
	const forbidden =
		policy?.forbidden && policy.forbidden.length > 0
			? `\n禁止：${policy.forbidden.join("、")}。`
			: "";
	const base = opening
		? [
				"接通电话。请先说第一句话。",
				`第一句话必须短，最多 ${policy?.maxSentences ?? 2} 句，优先贴近这句开场：${opening}`,
				"不要把开场扩写成完整段落；话题、记忆和来意从第二句或后续自然展开。",
				"不要解释系统提示。",
			].join("\n")
		: [
				"接通电话。请先用角色口吻说一句很短的电话开场。",
				`最多 ${policy?.maxSentences ?? 2} 句，不要解释系统提示。`,
			].join("\n");
	messages.push({
		role: "user",
		content: `${base}${forbidden}`,
	});
}

/** 开场首句：Host beginCall 后，模型先说话。 */
export function buildOpeningLlmMessages(
	session: CallSession,
): ServerLlmChatMessage[] {
	const messages: ServerLlmChatMessage[] = [];
	appendRenderedPrompt(messages, session.renderedPrompt);
	appendOpeningInstruction(messages, session);
	return messages;
}

/** 普通聊天轮：使用本通已登记 chatTurns 作为正式上下文。 */
export function buildTurnLlmMessages(
	session: CallSession,
): ServerLlmChatMessage[] {
	const messages: ServerLlmChatMessage[] = [];
	appendRenderedPrompt(messages, session.renderedPrompt);
	for (const turn of session.chatTurns ?? []) {
		if (
			turn.role === "system" ||
			turn.role === "user" ||
			turn.role === "assistant"
		) {
			pushIfText(messages, turn.role, turn.text);
		}
	}
	return messages;
}
