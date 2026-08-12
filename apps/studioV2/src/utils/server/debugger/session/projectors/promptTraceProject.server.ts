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

export type DebuggerOpeningSituationView = {
	kind: string;
	control: string;
	priority: number | null;
	reason: string;
	tags: string[];
	overridden: boolean;
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
	openingSituation: DebuggerOpeningSituationView | null;
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

function blockBodyValue(block: string, key: string): string | null {
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = block.match(new RegExp(`^- ${escaped}=(.*)$`, "m"));
	return match?.[1]?.trim() || null;
}

function parseOpeningSituation(
	blocks: readonly string[],
): DebuggerOpeningSituationView | null {
	const block = blocks.find(function (item) {
		return item.startsWith("[opening.situation]");
	});
	if (!block) return null;
	const priority = blockBodyValue(block, "priority");
	return {
		kind: blockBodyValue(block, "kind") ?? "unknown",
		control: blockBodyValue(block, "control") ?? "unknown",
		priority: priority === null ? null : Number.parseInt(priority, 10),
		reason: blockBodyValue(block, "reason") ?? "",
		tags: (blockBodyValue(block, "tags") ?? "")
			.split(",")
			.map(function (tag) {
				return tag.trim();
			})
			.filter(function (tag) {
				return tag.length > 0 && tag !== "none";
			}),
		overridden: block.includes("已决定/覆盖首句 opening"),
	};
}

export function projectPromptTrace(
	prompt: RenderedPrompt | undefined,
): DebuggerPromptTraceView {
	const providerIds = prompt?.debug?.providerIds ?? [];
	const systemHard = prompt?.systemHard ?? [];
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
		openingSituation: parseOpeningSituation(systemHard),
		systemHardBlocks: projectPromptBlocks(
			systemHard,
			"systemHard",
		),
		softContextBlocks: projectPromptBlocks(
			prompt?.softContext ?? [],
			"softContext",
		),
	};
}
