/**
	* 首通提示词预览：与 beginCall 同口径的 Composer + softExtras + tools，不建 CallSession。
	* 仅 Server；Client 经 POST /api/prompt-preview。
	*/
import {
	BUILTIN_TOOL_DEFINITIONS,
	buildComposeScene,
	composeRenderedPrompt,
	isEngineError,
	resolveToolPolicy,
	type CallCardDefinition,
	type ComposeScene,
	type RenderedPrompt,
	type ToolDefinition,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	buildPreviewSoftExtras,
	loadCharacterDefForPreview,
	validatePromptPreviewRequest,
	type PromptPreviewRequest,
} from "./previewPromptHelpers.server";

export type {
	PromptPreviewCallDirection,
	PromptPreviewRequest,
} from "./previewPromptHelpers.server";

export type PromptPreviewResult = {
	userId: string;
	packageId: string;
	composeScene: ComposeScene;
	renderedPrompt: RenderedPrompt;
	matchedLayerIds: string[];
	tools: ToolDefinition[];
	systemMessages: string[];
	systemJoined: string;
	softExtras: string[];
};

function promptToSystemMessages(prompt: RenderedPrompt): string[] {
	const parts: string[] = [];
	for (const line of prompt.systemHard) {
		if (line.trim()) parts.push(line.trim());
	}
	if (prompt.speakable.trim()) {
		parts.push(`[speakable]\n${prompt.speakable.trim()}`);
	}
	if (prompt.private.trim()) {
		parts.push(`[private]\n${prompt.private.trim()}`);
	}
	for (const soft of prompt.softContext) {
		if (soft.trim()) parts.push(soft.trim());
	}
	return parts;
}

function filterToolsForCard(card: CallCardDefinition): ToolDefinition[] {
	const policy = resolveToolPolicy(card);
	return BUILTIN_TOOL_DEFINITIONS.filter(function (t) {
		if (policy.allowedToolIds === null) {
			return (
				t.toolId === "search_memory" || t.toolId === "get_memory_by_id"
			);
		}
		return policy.allowedToolIds.includes(t.toolId);
	});
}

/**
	* 编辑期观测：按当前卡草稿 + 玩家 Profile/Memory 渲染首通 LLM 载荷。
	* 不调用 beginCall，不写 Session。
	*/
export async function previewFirstConnectPrompt(
	input: PromptPreviewRequest,
): Promise<PromptPreviewResult> {
	const v = validatePromptPreviewRequest(input);
	const host = await getStudioV2EngineHost();
	const profile = await host.ensureProfile(v.userId);
	const characterDef = await loadCharacterDefForPreview(v.card.ownerAgentId);
	const softExtras = await buildPreviewSoftExtras({
		userId: v.userId,
		card: v.card,
		profile,
		memory: host.getMemoryPort(),
	});

	const actualEntry =
		v.callDirection === "outbound" ? "outbound_auto" : "inbound_user_dial";
	const pad = String(v.localHour).padStart(2, "0");
	const localNowIso = `2026-07-24T${pad}:00:00+08:00`;
	const composeScene = buildComposeScene({
		entryMode: v.card.entryMode,
		actualEntry,
		packageId: v.packageId,
		localNowIso,
		timeZone: "Asia/Shanghai",
		sceneOverride: {
			callDirection: v.callDirection,
			localTime: {
				isoWithOffset: localNowIso,
				timeZone: "Asia/Shanghai",
				localHour: v.localHour,
			},
		},
	});

	const rendered = composeRenderedPrompt({
		card: v.card,
		characterDef,
		scene: composeScene,
		softExtras,
	});
	if (isEngineError(rendered)) {
		throw Object.assign(new Error(rendered.message), {
			code: rendered.code,
		});
	}

	const systemMessages = promptToSystemMessages(rendered);
	return {
		userId: v.userId,
		packageId: v.packageId,
		composeScene,
		renderedPrompt: rendered,
		matchedLayerIds: rendered.matchedLayerIds,
		tools: filterToolsForCard(v.card),
		systemMessages,
		systemJoined: systemMessages.join("\n\n"),
		softExtras,
	};
}
