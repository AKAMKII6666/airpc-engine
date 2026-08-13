/**
	* Host CallSession → LLM messages 投影。
	* 只把 Composer 已产出的公开调试上下文与 chatTurns 送入模型，不读取 Client 状态。
	*/
import type { CallSession, RenderedPrompt } from "@airpc/rpg-engine";
import type { ServerLlmChatMessage } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import { buildShellControlInstruction } from "@studio-v2/src/utils/server/debugger/shell/shellControlTools.server";

type TextLlmRole = "system" | "user" | "assistant";
type OpeningLlmContextPolicy = {
	includeSystemHard: boolean;
	includeSpeakable: boolean;
	includePrivate: boolean;
	includeSoftContext: boolean;
	includeMemory: boolean;
	includeInertia: boolean;
};
type CallSessionWithOpeningFirstTurn = CallSession & {
	openingFirstTurn?: {
		llmContextPolicy?: OpeningLlmContextPolicy;
	};
};

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
	policy?: OpeningLlmContextPolicy,
): void {
	if (!prompt) return;
	const effectivePolicy = policy ?? {
		includeSystemHard: true,
		includeSpeakable: true,
		includePrivate: true,
		includeSoftContext: true,
		includeMemory: true,
		includeInertia: true,
	};
	if (effectivePolicy.includeSystemHard) {
		for (const hard of prompt.systemHard) {
			pushIfText(messages, "system", hard);
		}
	}
	if (effectivePolicy.includeSpeakable) {
		pushIfText(messages, "system", prompt.speakable);
	}
	if (effectivePolicy.includePrivate) {
		pushIfText(messages, "system", prompt.private);
	}
	if (effectivePolicy.includeSoftContext) {
		for (const soft of prompt.softContext) {
			if (!effectivePolicy.includeMemory && soft.startsWith("[memory]")) {
				continue;
			}
			if (
				!effectivePolicy.includeInertia &&
				soft.startsWith("[conversation.inertia")
			) {
				continue;
			}
			pushIfText(messages, "system", soft);
		}
	}
	pushIfText(messages, "system", buildShellControlInstruction());
}

function readOpeningLlmContextPolicy(
	session: CallSession,
): OpeningLlmContextPolicy | undefined {
	const policy = (session as CallSessionWithOpeningFirstTurn).openingFirstTurn
		?.llmContextPolicy;
	if (!policy) return undefined;
	return policy;
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
	appendRenderedPrompt(
		messages,
		session.renderedPrompt,
		readOpeningLlmContextPolicy(session),
	);
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
