/**
	* 属性浮窗 Formik 契约：对齐 CallCardDefinition 可编辑字段。
	* 校验态 / exitCount / 包配置不进表单（包级见 PackageConfigFloat）；仅会话内节点 data，不写盘。
	*/
import type { FormikErrors } from "formik";
import type { CardKind } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type {
	EditorCallCardProjection,
	EditorEntryMode,
	EditorInteractionMode,
	EditorScheduleMetaProjection,
	EditorToolPolicyProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import {
	BUILTIN_TOOL_ID_SET,
	cardKindLabel,
} from "@studio-v2/typeFiles/story/callCardLabels";
import { asPromptSceneList } from "@studio-v2/src/utils/promptScene/promptSceneListHelpers";
import {
	normalizeExitList,
	type ExitListFormRow,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";

export {
	buildNodeBasicItems,
	buildNodeContextItems,
	buildNodeToolPolicyItems,
	NODE_BASIC_ITEMS,
	NODE_CONTEXT_ITEMS,
	NODE_PROMPT_SCENE_ITEMS,
	NODE_SCHEDULE_ITEMS,
	NODE_TOOL_POLICY_ITEMS,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyFormItems";

/**
	* 属性浮窗 values；嵌套路径与 AutoForm name 对齐。
	* ownerAgentId / ownerDisplayName 经归属 Select 即时写回，不经 Formik 提交。
	* validationBadge 不在此可写。
	*/
export type NodePropertyFormValues = {
	/** 卡片类型；对齐 CardKind，可在面板切换 */
	cardKind: CardKind;
	/** 卡片人类标题；必填 */
	title: string;
	/** 对齐 EntryModeSchema */
	entryMode: EditorEntryMode | "";
	/** 对齐 InteractionModeSchema */
	interactionMode: EditorInteractionMode | "";
	context: {
		objective: string;
		privateBrief: string;
		speakableBrief: string;
		background: string;
		premise: string;
		emotion: string;
		playbackClipId: string;
		forbidden: string[];
		/** 场景提示词层；写回 context.promptScenes */
		promptScenes: PromptSceneLayerForm[];
	};
	objectives: {
		requiredBeats: string[];
	};
	/** 出口列表；提交后同步画布 Handle */
	exits: ExitListFormRow[];
	toolPolicy: {
		mode: EditorToolPolicyProjection["mode"] | "";
		allowedToolIds: string[];
	};
	/**
		* 调度字段；IntegerInput 空串表示未填。
		* 仅 cardKind=schedule 时写回节点；其它种类忽略。
		*/
	schedule: {
		mode: "daily" | "weekly" | "";
		hour: number | "";
		minute: number | "";
		cooldownMs: number | "";
		priority: number | "";
	};
} & Record<string, unknown>;

/** 空串回落：把可选字符串投影成表单可绑的 string */
function strOrEmpty(value: string | undefined): string {
	return value ?? "";
}

/** 空数组回落：避免 Formik 对 undefined 列表绑定失败 */
function listOrEmpty<T>(value: readonly T[] | undefined): T[] {
	return value ? [...value] : [];
}

/** 把节点 context 投影成表单 context；集中 ?? 以压低主映射圈复杂度 */
function toContextFormValues(
	context: EditorCallCardProjection["context"],
): NodePropertyFormValues["context"] {
	return {
		objective: strOrEmpty(context.objective),
		privateBrief: strOrEmpty(context.privateBrief),
		speakableBrief: strOrEmpty(context.speakableBrief),
		background: strOrEmpty(context.background),
		premise: strOrEmpty(context.premise),
		emotion: strOrEmpty(context.emotion),
		playbackClipId: strOrEmpty(context.playbackClipId),
		forbidden: listOrEmpty(context.forbidden),
		promptScenes: asPromptSceneList(context.promptScenes ?? []),
	};
}

/** 把 toolPolicy / schedule 投影成表单嵌套值 */
function toPolicyAndScheduleFormValues(data: EditorCallCardProjection): Pick<
	NodePropertyFormValues,
	"toolPolicy" | "schedule"
> {
	return {
		toolPolicy: {
			mode: data.toolPolicy?.mode ?? "",
			allowedToolIds: listOrEmpty(data.toolPolicy?.allowedToolIds),
		},
		schedule: {
			mode: data.schedule?.mode ?? "",
			hour: data.schedule?.hour ?? "",
			minute: data.schedule?.minute ?? "",
			cooldownMs: data.schedule?.cooldownMs ?? "",
			priority: data.schedule?.priority ?? "",
		},
	};
}

/** 将节点 data 投影为 Formik 初始 values */
export function toNodePropertyFormValues(
	data: EditorCallCardProjection,
): NodePropertyFormValues {
	const { toolPolicy, schedule } = toPolicyAndScheduleFormValues(data);
	return {
		cardKind: data.cardKind,
		title: data.title,
		entryMode: data.entryMode ?? "",
		interactionMode: data.interactionMode ?? "",
		context: toContextFormValues(data.context),
		objectives: {
			requiredBeats: listOrEmpty(data.objectives?.requiredBeats),
		},
		exits: data.exits.map((exit) => ({
			...exit,
			effects: listOrEmpty(exit.effects).map((fx) => ({ ...fx })),
		})),
		toolPolicy,
		schedule,
	};
}

/** 属性浮窗提交前校验；标题必填 */
export function validateNodePropertyForm(
	values: NodePropertyFormValues,
): FormikErrors<NodePropertyFormValues> {
	const errors: FormikErrors<NodePropertyFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写标题";
	}
	return errors;
}

function optionalTrimmed(value: string): string | undefined {
	const next = value.trim();
	return next.length > 0 ? next : undefined;
}

function optionalMode<T extends string>(value: T | ""): T | undefined {
	return value === "" ? undefined : value;
}

function optionalInt(value: number | ""): number | undefined {
	return value === "" ? undefined : value;
}

/**
	* 写回 toolPolicy：非 allowlist 不带 allowedToolIds；
	* allowlist 仅保留内置 toolId，过滤自由文本残留。
	*/
function applyToolPolicy(
	values: NodePropertyFormValues["toolPolicy"],
): EditorToolPolicyProjection | undefined {
	const mode = optionalMode(values.mode);
	if (!mode) return undefined;
	if (mode !== "allowlist") {
		return { mode };
	}
	const allowedToolIds = values.allowedToolIds
		.map((item) => item.trim())
		.filter((item) => BUILTIN_TOOL_ID_SET.has(item));
	return {
		mode,
		allowedToolIds: allowedToolIds.length > 0 ? allowedToolIds : undefined,
	};
}

function applySchedule(
	values: NodePropertyFormValues["schedule"],
): EditorScheduleMetaProjection | undefined {
	const mode = optionalMode(values.mode);
	const hour = optionalInt(values.hour);
	const minute = optionalInt(values.minute);
	const cooldownMs = optionalInt(values.cooldownMs);
	const priority = optionalInt(values.priority);
	if (
		mode === undefined &&
		hour === undefined &&
		minute === undefined &&
		cooldownMs === undefined &&
		priority === undefined
	) {
		return undefined;
	}
	return { mode, hour, minute, cooldownMs, priority };
}

/**
	* 将表单合并回节点 data。
	* 保留 cardId / owner* / validationBadge；cardKind / exits/toolPolicy/promptScenes 可改。
	* schedule 仅 cardKind=schedule 写回。
	* voicemail：强制 mailbox_open + playback_only + deny_all（与引擎校验一致）。
	*/
export function applyNodePropertyForm(
	previous: EditorCallCardProjection,
	values: NodePropertyFormValues,
): EditorCallCardProjection {
	const promptScenes = asPromptSceneList(values.context.promptScenes);
	const cardKind = values.cardKind;
	const voicemail = cardKind === "voicemail";
	return {
		...previous,
		cardKind,
		title: values.title.trim(),
		entryMode: voicemail
			? "mailbox_open"
			: optionalMode(values.entryMode),
		interactionMode: voicemail
			? "playback_only"
			: optionalMode(values.interactionMode),
		context: {
			...previous.context,
			objective: optionalTrimmed(values.context.objective),
			privateBrief: optionalTrimmed(values.context.privateBrief),
			speakableBrief: optionalTrimmed(values.context.speakableBrief),
			background: optionalTrimmed(values.context.background),
			premise: optionalTrimmed(values.context.premise),
			emotion: optionalTrimmed(values.context.emotion),
			playbackClipId: optionalTrimmed(values.context.playbackClipId),
			forbidden: values.context.forbidden
				.map((item) => item.trim())
				.filter((item) => item.length > 0),
			promptScenes: promptScenes.length > 0 ? promptScenes : undefined,
		},
		objectives: {
			requiredBeats: values.objectives.requiredBeats
				.map((item) => item.trim())
				.filter((item) => item.length > 0),
		},
		exits: normalizeExitList(values.exits),
		toolPolicy: voicemail
			? { mode: "deny_all" }
			: applyToolPolicy(values.toolPolicy),
		schedule:
			cardKind === "schedule"
				? applySchedule(values.schedule) ??
					previous.schedule ?? { mode: "daily", hour: 10 }
				: undefined,
	};
}

/** 类型徽章人话 */
export function nodeKindBadgeLabel(kind: CardKind): string {
	return cardKindLabel(kind);
}
