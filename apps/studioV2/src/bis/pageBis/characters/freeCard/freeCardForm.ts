/**
	* FreeCallCard 编辑表单：context / promptScenes / 能力开关 → toolPolicy；强制无 exits。
	*/
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import {
	FREE_CAPABILITY_OPTIONS,
	type FreeCapabilityToolId,
	type ShellHangupCapabilityId,
} from "@studio-v2/typeFiles/library/characters/freeCard/freeCapabilityOptions";

/** Free 卡弹窗 Formik 值；落盘经 applyFreeCardForm → free-cards JSON */
export type FreeCardFormValues = {
	/** 卡标题；落盘 CallCard.title；空串校验失败 */
	title: string;
	/** Composer 私有简报；落盘 context.privateBrief；空串表示未填 */
	privateBrief: string;
	/** 可对用户说的简报；落盘 context.speakableBrief；空串表示未填 */
	speakableBrief: string;
	/** 背景叙事；落盘 context.background；空串表示未填 */
	background: string;
	/** 本通前提；落盘 context.premise；空串表示未填 */
	premise: string;
	/** 情绪提示；落盘 context.emotion；空串表示未填 */
	emotion: string;
	/** 本通目标摘要；落盘 context.objective；空串表示未填 */
	objective: string;
	/** 禁区；逗号或换行分隔，落盘为 context.forbidden string[] */
	forbiddenText: string;
	/** 场景提示词层；落盘 context.promptScenes；空数组表示未配置 */
	promptScenes: PromptSceneLayerForm[];
	/** toolId → 是否开放；固定键集，不可增删；映射 toolPolicy */
	capabilities: Record<FreeCapabilityToolId, boolean>;
	/** 壳侧主动挂机预留开关；落盘 context.studioShellHangup */
	shellHangup: Record<ShellHangupCapabilityId, boolean>;
};

function emptyScenes(): PromptSceneLayerForm[] {
	return [];
}

function defaultCapabilities(allOn: boolean): Record<FreeCapabilityToolId, boolean> {
	const out = {} as Record<FreeCapabilityToolId, boolean>;
	for (const opt of FREE_CAPABILITY_OPTIONS) {
		out[opt.toolId] = allOn;
	}
	return out;
}

function capabilitiesFromToolPolicy(
	policy: CallCardDefinition["toolPolicy"],
): Record<FreeCapabilityToolId, boolean> {
	if (!policy || policy.mode === "inherit_free" || policy.mode === undefined) {
		return defaultCapabilities(true);
	}
	if (policy.mode === "deny_all") {
		return defaultCapabilities(false);
	}
	const allowed = new Set(policy.allowedToolIds ?? []);
	const out = {} as Record<FreeCapabilityToolId, boolean>;
	for (const opt of FREE_CAPABILITY_OPTIONS) {
		out[opt.toolId] = allowed.has(opt.toolId);
	}
	return out;
}

function toolPolicyFromCapabilities(
	capabilities: Record<FreeCapabilityToolId, boolean>,
): CallCardDefinition["toolPolicy"] {
	const enabled = FREE_CAPABILITY_OPTIONS.filter(function (o) {
		return capabilities[o.toolId];
	}).map(function (o) {
		return o.toolId;
	});
	if (enabled.length === FREE_CAPABILITY_OPTIONS.length) {
		return { mode: "inherit_free" };
	}
	if (enabled.length === 0) {
		return { mode: "deny_all" };
	}
	return { mode: "allowlist", allowedToolIds: enabled };
}

function readShellHangup(
	context: CallCardDefinition["context"],
): Record<ShellHangupCapabilityId, boolean> {
	const bag =
		context &&
		typeof context === "object" &&
		"studioShellHangup" in context &&
		typeof (context as { studioShellHangup?: unknown }).studioShellHangup ===
			"object" &&
		(context as { studioShellHangup: unknown }).studioShellHangup !== null
			? ((context as { studioShellHangup: Record<string, unknown> })
					.studioShellHangup)
			: {};
	return {
		policyHangup: bag.policyHangup !== false,
		naturalHangup: bag.naturalHangup !== false,
	};
}

function mapScenesFromCard(
	raw: unknown,
): PromptSceneLayerForm[] {
	if (!Array.isArray(raw)) return emptyScenes();
	return raw.map(function (layer, index) {
		const l = layer as {
			layerId?: string;
			match?: {
				callDirection?: string;
				localHourRange?: { from?: number; to?: number };
			};
			patch?: Record<string, string>;
		};
		const dir = l.match?.callDirection;
		const callDirection =
			dir === "inbound" || dir === "outbound" || dir === "either"
				? dir
				: "either";
		return {
			layerId: typeof l.layerId === "string" ? l.layerId : `scene_${index + 1}`,
			priority: index * 10,
			match: {
				callDirection,
				localHourRange: {
					from: l.match?.localHourRange?.from ?? 0,
					to: l.match?.localHourRange?.to ?? 24,
				},
			},
			patch: {
				openingSpeakable: l.patch?.openingSpeakable ?? "",
				openingPrivate: l.patch?.openingPrivate ?? "",
				emotion: l.patch?.emotion ?? "",
				toneHint: l.patch?.toneHint ?? "",
				appendSpeakable: l.patch?.appendSpeakable ?? "",
				appendPrivate: l.patch?.appendPrivate ?? "",
			},
		};
	});
}

/** 磁盘卡 → 弹窗初值 */
export function toFreeCardFormValues(card: CallCardDefinition): FreeCardFormValues {
	const ctx = card.context ?? {};
	const forbidden = Array.isArray(ctx.forbidden) ? ctx.forbidden : [];
	return {
		title: card.title ?? "",
		privateBrief: ctx.privateBrief ?? "",
		speakableBrief: ctx.speakableBrief ?? "",
		background: ctx.background ?? "",
		premise: ctx.premise ?? "",
		emotion: ctx.emotion ?? "",
		objective: ctx.objective ?? "",
		forbiddenText: forbidden.join("\n"),
		promptScenes: mapScenesFromCard(ctx.promptScenes),
		capabilities: capabilitiesFromToolPolicy(card.toolPolicy),
		shellHangup: readShellHangup(ctx),
	};
}

function scenesToDisk(scenes: PromptSceneLayerForm[]) {
	return scenes.map(function (scene, index) {
		return {
			layerId: scene.layerId.trim() || `scene_${index + 1}`,
			priority: index * 10,
			match: {
				callDirection: scene.match.callDirection,
				localHourRange: {
					from: scene.match.localHourRange.from,
					to: scene.match.localHourRange.to,
				},
			},
			patch: {
				openingSpeakable: scene.patch.openingSpeakable.trim(),
				openingPrivate: scene.patch.openingPrivate.trim(),
				emotion: scene.patch.emotion.trim(),
				toneHint: scene.patch.toneHint.trim(),
				appendSpeakable: scene.patch.appendSpeakable.trim(),
				appendPrivate: scene.patch.appendPrivate.trim(),
			},
		};
	});
}

/**
	* 表单合并回既有卡；强制 cardKind=free、exits=[]。
	*/
export function applyFreeCardForm(
	previous: CallCardDefinition,
	values: FreeCardFormValues,
): CallCardDefinition {
	const forbidden = values.forbiddenText
		.split(/[\n,]/)
		.map(function (s) {
			return s.trim();
		})
		.filter(Boolean);
	const prevCtx =
		previous.context && typeof previous.context === "object"
			? { ...previous.context }
			: {};
	return {
		...previous,
		cardId: previous.cardId,
		cardKind: "free",
		title: values.title.trim() || previous.title,
		ownerAgentId: previous.ownerAgentId,
		entryMode: previous.entryMode ?? "either",
		interactionMode: previous.interactionMode ?? "realtime_dialogue",
		context: {
			...prevCtx,
			privateBrief: values.privateBrief.trim(),
			speakableBrief: values.speakableBrief.trim(),
			background: values.background.trim(),
			premise: values.premise.trim(),
			emotion: values.emotion.trim(),
			objective: values.objective.trim(),
			forbidden,
			promptScenes: scenesToDisk(values.promptScenes),
			studioShellHangup: {
				policyHangup: values.shellHangup.policyHangup,
				naturalHangup: values.shellHangup.naturalHangup,
			},
		},
		objectives: previous.objectives ?? { requiredBeats: [] },
		toolPolicy: toolPolicyFromCapabilities(values.capabilities),
		exits: [],
	};
}

/**
	* Free 卡弹窗校验：标题必填；能力开关无字段级错误（固定清单）。
	*/
export function validateFreeCardForm(
	values: FreeCardFormValues,
): { title?: string } {
	const errors: { title?: string } = {};
	if (!values.title.trim()) {
		errors.title = "请填写标题";
	}
	return errors;
}
