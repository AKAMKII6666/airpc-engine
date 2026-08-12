/**
	* RenderedPrompt → Debugger Prompt Trace DTO。
	*/
import type { RenderedPrompt } from "@airpc/rpg-engine";

export type DebuggerPromptBlockView = {
	title: string;
	text: string;
	charCount: number;
	preview: string;
	truncated: boolean;
};

export type DebuggerPromptProviderView = {
	providerId: string;
	index: number;
	group: string;
	label: string;
	important: boolean;
};

export type DebuggerPromptTraceView = {
	providerIds: string[];
	providerRows: DebuggerPromptProviderView[];
	notes: string[];
	matchedLayerIds: string[];
	openingSpeakable: string | null;
	openingPolicy: {
		mode: string;
		reason: string;
		maxSentences: number;
		forbidden: string[];
	} | null;
	systemHardBlocks: DebuggerPromptBlockView[];
	softContextBlocks: DebuggerPromptBlockView[];
};

const PROVIDER_GROUP_BY_PREFIX: Record<string, string> = {
	base: "base",
	scene: "scene",
	opening: "opening",
	hard: "hard",
	style: "style",
	call: "call",
	conversation: "memory",
	persona: "persona",
	identity: "identity",
	time: "time",
	soft: "soft",
};

const IMPORTANT_PROVIDER_IDS = new Set([
	"call.missed_outbound",
	"conversation.inertia",
	"call.scheduled_callback",
	"style.phone_global",
	"persona.style",
]);

function previewText(value: string, maxChars: number): string {
	return value.length > maxChars ? `${value.slice(0, maxChars - 3)}...` : value;
}

function titleFromPromptBlock(text: string, fallback: string): string {
	const first = text.split("\n")[0]?.trim() ?? "";
	const bracket = first.match(/^\[([^\]]+)\]/);
	if (bracket?.[1]) return bracket[1];
	return first || fallback;
}

function providerGroup(providerId: string): string {
	const prefix = providerId.split(".")[0] ?? "other";
	return PROVIDER_GROUP_BY_PREFIX[prefix] ?? "other";
}

function projectPromptProviders(
	providerIds: readonly string[],
): DebuggerPromptProviderView[] {
	return providerIds.map(function (providerId, index) {
		const group = providerGroup(providerId);
		return {
			providerId,
			index: index + 1,
			group,
			label: `${index + 1}. ${providerId}`,
			important: IMPORTANT_PROVIDER_IDS.has(providerId),
		};
	});
}

function projectPromptBlocks(
	blocks: readonly string[],
	fallbackPrefix: string,
): DebuggerPromptBlockView[] {
	return blocks.map(function (block, index) {
		const text = previewText(block, 1200);
		return {
			title: titleFromPromptBlock(block, `${fallbackPrefix}.${index + 1}`),
			text,
			charCount: block.length,
			preview: previewText(block.replace(/\s+/g, " ").trim(), 180),
			truncated: text.length < block.length,
		};
	});
}

export function projectPromptTrace(
	prompt: RenderedPrompt | undefined,
): DebuggerPromptTraceView {
	const providerIds = prompt?.debug?.providerIds ?? [];
	return {
		providerIds,
		providerRows: projectPromptProviders(providerIds),
		notes: prompt?.debug?.notes ?? [],
		matchedLayerIds: prompt?.matchedLayerIds ?? [],
		openingSpeakable: prompt?.openingSpeakable?.trim() || null,
		openingPolicy: prompt?.openingPolicy
			? {
					mode: prompt.openingPolicy.mode,
					reason: prompt.openingPolicy.reason,
					maxSentences: prompt.openingPolicy.maxSentences,
					forbidden: prompt.openingPolicy.forbidden,
				}
			: null,
		systemHardBlocks: projectPromptBlocks(
			prompt?.systemHard ?? [],
			"systemHard",
		),
		softContextBlocks: projectPromptBlocks(
			prompt?.softContext ?? [],
			"softContext",
		),
	};
}
