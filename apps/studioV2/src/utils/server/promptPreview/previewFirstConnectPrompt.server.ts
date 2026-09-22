/**
	* 首通提示词预览：与 beginCall 同口径的 Composer + softExtras + tools，不建 CallSession。
	* 仅 Server；Client 经 POST /api/prompt-preview。
	*/
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	appendAcquaintanceAndToolExtras,
	buildPreviewComposeScene,
	composePreviewRenderedPrompt,
	toPromptPreviewResult,
} from "./previewFirstConnectAssemble.server";
import {
	buildPreviewSoftExtras,
	loadCharacterDefForPreview,
	validatePromptPreviewRequest,
	type PromptPreviewRequest,
	type PromptPreviewResult,
} from "./previewPromptHelpers.server";

export type {
	PromptPreviewCallDirection,
	PromptPreviewRequest,
	PromptPreviewResult,
} from "./previewPromptHelpers.server";

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
	const knownNickname = profile.user?.nickname?.trim() || undefined;
	const toolsForCard = appendAcquaintanceAndToolExtras(
		softExtras,
		v.card,
		characterDef,
		host.getToolRegistry(),
		knownNickname,
	);
	const composeScene = buildPreviewComposeScene(v);
	const rendered = composePreviewRenderedPrompt({
		card: v.card,
		characterDef,
		scene: composeScene,
		softExtras,
	});
	return toPromptPreviewResult({
		v,
		composeScene,
		rendered,
		toolsForCard,
		softExtras,
	});
}
