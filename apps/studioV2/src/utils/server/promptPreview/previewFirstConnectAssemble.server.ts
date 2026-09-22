/**
	* 首通预览组装步骤：softExtras 补齐、ComposeScene、结果投影。
	* 从 previewFirstConnectPrompt 拆出控有效行。
	*/
import {
	buildAcquaintanceSoftExtra,
	buildComposeScene,
	buildToolInstructionBlocks,
	composeRenderedPrompt,
	isEngineError,
	listToolsForCard,
	type CallCardDefinition,
	type CharacterDef,
	type ComposeScene,
	type RenderedPrompt,
	type ToolDefinition,
	type ToolRegistry,
} from "@airpc/rpg-engine";
import type {
	PreviewValidateOk,
	PromptPreviewResult,
} from "./previewPromptHelpers.server";

export function appendAcquaintanceAndToolExtras(
	softExtras: string[],
	card: CallCardDefinition,
	characterDef: CharacterDef | null,
	registry: ToolRegistry,
	knownNickname: string | undefined,
): ToolDefinition[] {
	const acquaintance = buildAcquaintanceSoftExtra(knownNickname);
	if (acquaintance) {
		softExtras.push(acquaintance);
	}
	const toolsForCard = listToolsForCard(card, { characterDef, registry });
	softExtras.push(
		...buildToolInstructionBlocks(
			toolsForCard.map(function (t) {
				return t.toolId;
			}),
			{ knownNickname },
		),
	);
	return toolsForCard;
}

export function buildPreviewComposeScene(v: PreviewValidateOk): ComposeScene {
	const actualEntry =
		v.callDirection === "outbound" ? "outbound_auto" : "inbound_user_dial";
	const pad = String(v.localHour).padStart(2, "0");
	const localNowIso = `2026-07-24T${pad}:00:00+08:00`;
	return buildComposeScene({
		entryMode: v.card.entryMode,
		actualEntry,
		chapterId: v.packageId,
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
}

export function composePreviewRenderedPrompt(input: {
	card: CallCardDefinition;
	characterDef: CharacterDef | null;
	scene: ComposeScene;
	softExtras: string[];
}): RenderedPrompt {
	const rendered = composeRenderedPrompt({
		card: input.card,
		characterDef: input.characterDef,
		scene: input.scene,
		softExtras: input.softExtras,
	});
	if (isEngineError(rendered)) {
		throw Object.assign(new Error(rendered.message), {
			code: rendered.code,
		});
	}
	return rendered;
}

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

/** 显式带上 description / inputSchema，避免观测窗只见冷元数据 */
export function projectToolsForPreview(
	toolsForCard: ToolDefinition[],
): ToolDefinition[] {
	return toolsForCard.map(function (t) {
		return {
			toolId: t.toolId,
			displayName: t.displayName,
			description: t.description,
			inputSchema: t.inputSchema,
			allowedCardKinds: t.allowedCardKinds,
			allowedInPlayback: t.allowedInPlayback,
			behavior: t.behavior,
		};
	});
}

export function toPromptPreviewResult(input: {
	v: PreviewValidateOk;
	composeScene: ComposeScene;
	rendered: RenderedPrompt;
	toolsForCard: ToolDefinition[];
	softExtras: string[];
}): PromptPreviewResult {
	const systemMessages = promptToSystemMessages(input.rendered);
	return {
		userId: input.v.userId,
		packageId: input.v.packageId,
		composeScene: input.composeScene,
		renderedPrompt: input.rendered,
		matchedLayerIds: input.rendered.matchedLayerIds,
		tools: projectToolsForPreview(input.toolsForCard),
		systemMessages,
		systemJoined: systemMessages.join("\n\n"),
		softExtras: input.softExtras,
	};
}
