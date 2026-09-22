/**
	* RenderedPrompt → Debugger Prompt Trace DTO。
	*/
import type { RenderedPrompt } from "@airpc/rpg-engine";
import {
	projectToolResolutionTrace,
	type CallSession,
	type ToolResolutionTrace,
} from "@airpc/rpg-engine";

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
	firstTurnMode: string | null;
	firstTurnStatus: string | null;
	callerVisibility: string | null;
	llmContextPolicy: {
		includeSoftContext: boolean;
		includeMemory: boolean;
		includeInertia: boolean;
	} | null;
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
	toolResolution: ToolResolutionTrace;
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

type OpeningSoftFilterPolicy = {
	includeSoftContext: boolean;
	includeMemory: boolean;
	includeInertia: boolean;
};

/**
	* 用户尚未开口时，Trace 按 opening llmContextPolicy 过滤 memory/inertia，
	* 与 08§6.1 / appendRenderedPrompt 开场隔离对齐；用户发言后恢复完整 soft/hard。
	*/
function readOpeningSoftFilter(
	session: CallSession | undefined,
): OpeningSoftFilterPolicy | null {
	if (!session) return null;
	const policy = (
		session as CallSession & {
			openingFirstTurn?: {
				llmContextPolicy?: {
					includeSoftContext?: boolean;
					includeMemory?: boolean;
					includeInertia?: boolean;
				};
			};
		}
	).openingFirstTurn?.llmContextPolicy;
	if (!policy) return null;
	const hasUserTurn = (session.chatTurns ?? []).some(function (turn) {
		return turn.role === "user";
	});
	if (hasUserTurn) return null;
	return {
		includeSoftContext: policy.includeSoftContext !== false,
		includeMemory: policy.includeMemory !== false,
		includeInertia: policy.includeInertia !== false,
	};
}

function filterPromptBlocksForOpening(
	blocks: readonly string[],
	policy: OpeningSoftFilterPolicy | null,
	kind: "systemHard" | "softContext",
): readonly string[] {
	if (!policy) return blocks;
	if (kind === "softContext" && !policy.includeSoftContext) {
		return [];
	}
	return blocks.filter(function (block) {
		if (!policy.includeMemory && block.startsWith("[memory]")) {
			return false;
		}
		if (
			!policy.includeInertia &&
			block.startsWith("[conversation.inertia")
		) {
			return false;
		}
		return true;
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
		firstTurnMode: blockBodyValue(block, "firstTurnMode"),
		firstTurnStatus: null,
		callerVisibility: null,
		llmContextPolicy: null,
	};
}

type OpeningFirstTurnRaw = {
	mode?: unknown;
	status?: unknown;
	callerVisibility?: unknown;
	llmContextPolicy?: {
		includeSoftContext?: unknown;
		includeMemory?: unknown;
		includeInertia?: unknown;
	};
};

type RenderedPromptWithOpeningFirstTurn = RenderedPrompt & {
	openingFirstTurn?: OpeningFirstTurnRaw;
};

function asOptionalString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function projectLlmContextPolicy(
	policy: OpeningFirstTurnRaw["llmContextPolicy"],
): DebuggerOpeningSituationView["llmContextPolicy"] {
	if (!policy) return null;
	return {
		includeSoftContext: policy.includeSoftContext !== false,
		includeMemory: policy.includeMemory !== false,
		includeInertia: policy.includeInertia !== false,
	};
}

function pickOr<T>(value: T | null | undefined, fallback: T): T {
	return value ?? fallback;
}

function mergeOpeningSituation(
	parsed: DebuggerOpeningSituationView | null,
	firstTurn: OpeningFirstTurnRaw,
): DebuggerOpeningSituationView {
	return {
		kind: pickOr(parsed?.kind, "unknown"),
		control: pickOr(parsed?.control, "unknown"),
		priority: pickOr(parsed?.priority, null),
		reason: pickOr(parsed?.reason, ""),
		tags: pickOr(parsed?.tags, []),
		overridden: pickOr(parsed?.overridden, false),
		firstTurnMode: pickOr(
			asOptionalString(firstTurn.mode),
			pickOr(parsed?.firstTurnMode, null),
		),
		firstTurnStatus: asOptionalString(firstTurn.status),
		callerVisibility: asOptionalString(firstTurn.callerVisibility),
		llmContextPolicy: projectLlmContextPolicy(firstTurn.llmContextPolicy),
	};
}

function projectOpeningSituationFromPrompt(
	prompt: RenderedPromptWithOpeningFirstTurn | undefined,
): DebuggerOpeningSituationView | null {
	const parsed = parseOpeningSituation(prompt?.systemHard ?? []);
	if (!prompt?.openingFirstTurn) return parsed;
	return mergeOpeningSituation(parsed, prompt.openingFirstTurn);
}

function emptyToolResolutionTrace(): ToolResolutionTrace {
	return {
		registryToolIds: [],
		characterCapabilityToolIds: [],
		cardPolicyMode: "unknown",
		cardPolicyToolIds: null,
		finalToolIds: [],
		items: [],
	};
}

export function projectPromptTrace(
	session: CallSession | undefined,
): DebuggerPromptTraceView {
	const prompt = session?.renderedPrompt;
	const providerIds = prompt?.debug?.providerIds ?? [];
	const openingFilter = readOpeningSoftFilter(session);
	const systemHard = filterPromptBlocksForOpening(
		prompt?.systemHard ?? [],
		openingFilter,
		"systemHard",
	);
	const softContext = filterPromptBlocksForOpening(
		prompt?.softContext ?? [],
		openingFilter,
		"softContext",
	);
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
		openingSituation: projectOpeningSituationFromPrompt(
			prompt as RenderedPromptWithOpeningFirstTurn | undefined,
		),
		systemHardBlocks: projectPromptBlocks(systemHard, "systemHard"),
		softContextBlocks: projectPromptBlocks(softContext, "softContext"),
		toolResolution: session
			? projectToolResolutionTrace(session.frozenCard, {
					characterDef: session.frozenCharacter,
				})
			: emptyToolResolutionTrace(),
	};
}
