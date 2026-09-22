/**
	* FreeCallCard 编辑表单：context / promptScenes / 能力开关 → toolPolicy；强制无 exits。
	*/
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { mapScenesFromCard } from "./freeCardFormScenes.helpers";

export { applyFreeCardForm } from "./freeCardFormApply.helpers";

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
	/** 工具策略模式；保存为 ToolPolicy v2，决定继承、显式白名单或全禁用。 */
	toolPolicyMode: "inherit_free" | "allowlist" | "deny_all";
	/** 当前草稿保留的完整 toolId；allowlist 保存，缺失 provider 的 id 也不静默删除。 */
	allowedToolIds: string[];
	/** NPC 主动挂机允许原因；仅 request_hangup 被选中或继承时生效。 */
	allowedHangupReasonKinds: Array<"natural" | "policy" | "handoff">;
};

function readShellHangup(
	context: CallCardDefinition["context"],
): Array<"natural" | "policy"> {
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
	const reasons: Array<"natural" | "policy"> = [];
	if (bag.naturalHangup !== false) reasons.push("natural");
	if (bag.policyHangup !== false) reasons.push("policy");
	return reasons;
}

function textOrEmpty(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function readContextValues(
	context: CallCardDefinition["context"],
): Pick<
	FreeCardFormValues,
	| "privateBrief"
	| "speakableBrief"
	| "background"
	| "premise"
	| "emotion"
	| "objective"
	| "forbiddenText"
	| "promptScenes"
> {
	const ctx = context ?? {};
	const forbidden = Array.isArray(ctx.forbidden) ? ctx.forbidden : [];
	return {
		privateBrief: textOrEmpty(ctx.privateBrief),
		speakableBrief: textOrEmpty(ctx.speakableBrief),
		background: textOrEmpty(ctx.background),
		premise: textOrEmpty(ctx.premise),
		emotion: textOrEmpty(ctx.emotion),
		objective: textOrEmpty(ctx.objective),
		forbiddenText: forbidden.join("\n"),
		promptScenes: mapScenesFromCard(ctx.promptScenes),
	};
}

function readAllowedToolIds(card: CallCardDefinition): string[] {
	const ids = [...(card.toolPolicy?.allowedToolIds ?? [])];
	const legacyAllowlist =
		card.toolPolicy?.mode === "allowlist" &&
		card.toolPolicy.schemaVersion !== 2;
	if (legacyAllowlist && !ids.includes("request_hangup")) {
		ids.push("request_hangup");
	}
	return ids;
}

/** 磁盘卡 → 弹窗初值 */
export function toFreeCardFormValues(card: CallCardDefinition): FreeCardFormValues {
	const ctx = card.context ?? {};
	return {
		title: textOrEmpty(card.title),
		...readContextValues(ctx),
		toolPolicyMode: card.toolPolicy?.mode ?? "inherit_free",
		allowedToolIds: readAllowedToolIds(card),
		allowedHangupReasonKinds:
			card.toolPolicy?.options?.request_hangup?.allowedReasonKinds ??
			readShellHangup(ctx),
	};
}

/**
	* Free 卡弹窗校验：标题必填；能力开关无字段级错误（固定清单）。
	*/
export function validateFreeCardForm(
	values: FreeCardFormValues,
): { title?: string } {
	if (values.title.trim().length === 0) {
		return { title: "请填写标题" };
	}
	return {};
}
