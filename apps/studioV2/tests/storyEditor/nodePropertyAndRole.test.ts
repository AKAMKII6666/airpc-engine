/**
 * 属性浮窗 / 角色归属连线 / 出口 Handle 纯函数轻量回归。
 */
import { describe, expect, it } from "vitest";
import type { Connection, Edge, Node } from "@xyflow/react";
import {
	applyNodePropertyForm,
	buildNodeToolPolicyItems,
	toNodePropertyFormValues,
	validateNodePropertyForm,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	buildRoleEdge,
	findAnchorNodeIdByAgentId,
	isRoleAssignmentConnection,
	withoutRoleEdgesForCard,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { exitHandleTopPercent } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/exitHandleLayout";
import {
	emptyExitRow,
	normalizeEffectList,
	normalizeExitList,
	coerceKnownEffectName,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import {
	applyChapterPropertyForm,
	syncEntryAfterPackageChange,
	toChapterPropertyFormValues,
	validateChapterPropertyForm,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import {
	BUILTIN_TOOL_OPTIONS,
	cardKindLabel,
	EFFECT_NAME_OPTIONS,
	effectNameLabel,
	entryModeLabel,
	exitHandleTooltipTitle,
} from "@studio-v2/typeFiles/story/callCardLabels";
import { CHARACTER_BASIC_ITEMS } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailFormItems";
import { USER_BASIC_ITEMS } from "@studio-v2/src/bis/pageBis/users/form/userFormItems";
import { CREATE_CHARACTER_FORM_ITEMS } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";

const sampleCard: EditorCallCardProjection = {
	cardId: "card_sample",
	cardKind: "story",
	title: "试卡",
	ownerAgentId: "agent_lanxing",
	ownerDisplayName: "澜星姐姐",
	entryMode: "inbound_user_dial",
	interactionMode: "realtime_dialogue",
	context: {
		objective: "目标",
	},
	exits: [
		{
			exitId: "exit_a",
			title: "出口A",
			exitKind: "handoff",
			priority: 0,
			conditionSummary: "转交",
			effects: [
				{
					id: "fx_a",
					effect: "attach_call_card",
					summary: "挂载下一卡",
				},
			],
		},
		{
			exitId: "exit_b",
			title: "出口B",
			exitKind: "terminal",
			priority: 0,
			conditionSummary: "终结",
			effects: [],
		},
	],
	toolPolicy: {
		mode: "allowlist",
		allowedToolIds: ["refer_to_expert"],
	},
	validationBadge: "ok",
};

describe("nodePropertyForm", () => {
	it("rejects empty title", () => {
		const values = toNodePropertyFormValues(sampleCard);
		values.title = "  ";
		const errors = validateNodePropertyForm(values);
		expect(errors.title).toBe("请填写标题");
	});

	it("applies edits including exits toolPolicy and promptScenes", () => {
		const values = toNodePropertyFormValues(sampleCard);
		values.title = " 新标题 ";
		values.entryMode = "outbound_auto";
		values.context.objective = " 新目标 ";
		values.toolPolicy.mode = "deny_all";
		values.toolPolicy.allowedToolIds = [];
		values.exits = [
			{
				exitId: "exit_ok",
				title: "完成",
				exitKind: "terminal",
				priority: 5,
				conditionSummary: "结束本话",
				effects: [
					{
						id: "fx_end",
						effect: "end_story",
						summary: "结束本章",
					},
				],
			},
		];
		values.context.promptScenes = [
			{
				layerId: "s1",
				priority: 0,
				match: {
					callDirection: "either",
					localHourRange: { from: 0, to: 24 },
				},
				patch: {
					openingSpeakable: "你好",
					openingPrivate: "",
					emotion: "",
					toneHint: "",
					appendSpeakable: "",
					appendPrivate: "",
				},
			},
		];
		const next = applyNodePropertyForm(sampleCard, values);
		expect(next.title).toBe("新标题");
		expect(next.entryMode).toBe("outbound_auto");
		expect(next.context.objective).toBe("新目标");
		expect(next.cardKind).toBe("story");
		expect(next.cardId).toBe("card_sample");
		expect(next.ownerAgentId).toBe("agent_lanxing");
		expect(next.ownerDisplayName).toBe("澜星姐姐");
		expect(next.exits).toHaveLength(1);
		expect(next.exits[0]?.exitId).toBe("exit_ok");
		expect(next.exits[0]?.effects).toEqual([
			{
				id: "fx_end",
				effect: "end_story",
				summary: "结束本章",
			},
		]);
		expect(next.toolPolicy?.mode).toBe("deny_all");
		expect(next.context.promptScenes?.[0]?.layerId).toBe("s1");
		expect(next.validationBadge).toBe("ok");
		expect(next.schedule).toBeUndefined();
	});

	it("writes schedule only for schedule cards", () => {
		const scheduleCard: EditorCallCardProjection = {
			...sampleCard,
			cardKind: "schedule",
			schedule: { mode: "daily", hour: 10 },
		};
		const values = toNodePropertyFormValues(scheduleCard);
		values.schedule.hour = 15;
		values.schedule.minute = 45;
		const next = applyNodePropertyForm(scheduleCard, values);
		expect(next.schedule?.hour).toBe(15);
		expect(next.schedule?.minute).toBe(45);

		const storyValues = toNodePropertyFormValues(sampleCard);
		storyValues.schedule.hour = 3;
		const storyNext = applyNodePropertyForm(sampleCard, storyValues);
		expect(storyNext.schedule).toBeUndefined();
	});
});

describe("exitHandleLayout and tooltip", () => {
	it("centers single exit and spreads multiple", () => {
		expect(exitHandleTopPercent(0, 1)).toBe("50%");
		expect(exitHandleTopPercent(0, 2)).toBe("28%");
		expect(exitHandleTopPercent(1, 2)).toBe("72%");
	});

	it("builds tooltip from title and summary", () => {
		expect(
			exitHandleTooltipTitle({
				exitId: "exit_a",
				title: "转交小雨",
				exitKind: "handoff",
				conditionSummary: "转交 · 交给小雨",
			}),
		).toBe("转交小雨 · 转交 · 交给小雨");
		expect(
			exitHandleTooltipTitle({
				exitId: "exit_x",
				exitKind: "terminal",
				conditionSummary: "",
			}),
		).toBe("exit_x · 终结");
	});

	it("allocates unique exit ids", () => {
		const first = emptyExitRow([]);
		expect(first.exitId).toBe("exit_1");
		const second = emptyExitRow([first]);
		expect(second.exitId).toBe("exit_2");
		expect(normalizeExitList([{ ...first, exitId: "  " }])).toHaveLength(0);
	});
});

describe("callCardLabels", () => {
	it("maps entryMode and cardKind to Chinese labels", () => {
		expect(entryModeLabel("inbound_user_dial")).toBe("用户呼入");
		expect(cardKindLabel("schedule")).toBe("调度卡");
	});

	it("exposes EFFECT_NAME_OPTIONS covering keep_card_pending", () => {
		expect(effectNameLabel("keep_card_pending")).toBe("保持卡待处理");
		expect(
			EFFECT_NAME_OPTIONS.some((o) => o.value === "keep_card_pending"),
		).toBe(true);
	});

	it("exposes BUILTIN_TOOL_OPTIONS for allowlist multi-select", () => {
		expect(
			BUILTIN_TOOL_OPTIONS.some((o) => o.value === "refer_to_expert"),
		).toBe(true);
		expect(BUILTIN_TOOL_OPTIONS.every((o) => o.label.trim().length > 0)).toBe(
			true,
		);
	});
});

describe("toolPolicy allowlist multi-select", () => {
	it("uses OptionMultiSelect only when mode is allowlist", () => {
		const hidden = buildNodeToolPolicyItems("deny_all");
		const allow = buildNodeToolPolicyItems("allowlist");
		expect(hidden.find((i) => i.name === "toolPolicy.allowedToolIds")?.hidden).toBe(
			true,
		);
		const allowItem = allow.find((i) => i.name === "toolPolicy.allowedToolIds");
		expect(allowItem?.hidden).toBe(false);
		expect(allowItem?.comType).toBe("OptionMultiSelect");
		expect(allowItem?.options?.some((o) => o.value === "search_memory")).toBe(
			true,
		);
	});

	it("filters unknown tool ids and drops allowlist when mode leaves allowlist", () => {
		const values = toNodePropertyFormValues(sampleCard);
		values.toolPolicy.allowedToolIds = ["refer_to_expert", "not_a_tool", ""];
		const next = applyNodePropertyForm(sampleCard, values);
		expect(next.toolPolicy).toEqual({
			mode: "allowlist",
			allowedToolIds: ["refer_to_expert"],
		});

		values.toolPolicy.mode = "inherit_free";
		values.toolPolicy.allowedToolIds = ["refer_to_expert"];
		const cleared = applyNodePropertyForm(sampleCard, values);
		expect(cleared.toolPolicy).toEqual({ mode: "inherit_free" });
	});
});

describe("enum audit Select contracts", () => {
	it("keeps character gender/voice and user gender as Select", () => {
		const gender = CHARACTER_BASIC_ITEMS.find(
			(i) => i.name === "identity.gender",
		);
		const voice = CHARACTER_BASIC_ITEMS.find((i) => i.name === "persona.voiceId");
		const userGender = USER_BASIC_ITEMS.find((i) => i.name === "gender");
		const kind = CREATE_CHARACTER_FORM_ITEMS.find((i) => i.name === "kind");
		expect(gender?.comType).toBe("Select");
		expect(voice?.comType).toBe("Select");
		expect(userGender?.comType).toBe("Select");
		expect(kind?.comType).toBe("Select");
		expect(gender?.comType).not.toBe("TextField");
		expect(gender?.comType).not.toBe("StringListEditor");
		expect(userGender?.comType).not.toBe("TextField");
	});
});

describe("effect enum coerce", () => {
	it("coerces unknown effect strings to keep_card_pending", () => {
		expect(coerceKnownEffectName("keep_card_pending")).toBe(
			"keep_card_pending",
		);
		expect(coerceKnownEffectName("not_a_real_effect")).toBe(
			"keep_card_pending",
		);
		expect(
			normalizeEffectList([
				{ id: "fx_1", effect: "free_text_junk", summary: "x" },
			]),
		).toEqual([
			{ id: "fx_1", effect: "keep_card_pending", summary: "x" },
		]);
	});
});

describe("chapterPropertyForm", () => {
	it("rejects empty title and syncs entry after package change", () => {
		const data = {
			kind: "chapter_end" as const,
			title: "结束",
			summary: "安排下一章",
			nextPackageId: "pkg_memory_bar_1",
			nextEntryCardId: "doubao_intro_outbound",
		};
		const values = toChapterPropertyFormValues(data);
		values.title = "  ";
		expect(validateChapterPropertyForm(values).title).toBe("请填写标题");

		const synced = syncEntryAfterPackageChange(
			"pkg_night_shift_2",
			"doubao_intro_outbound",
		);
		expect(synced.nextPackageId).toBe("pkg_night_shift_2");
		expect(synced.nextEntryCardId).toBe("night_shift_open");

		const applied = applyChapterPropertyForm(data, {
			title: "章节结束",
			summary: "清理 pending",
			nextPackageId: "pkg_quiet_prologue",
			nextEntryCardId: "quiet_free_open",
		});
		expect(applied.nextPackageId).toBe("pkg_quiet_prologue");
		expect(applied.nextEntryCardId).toBe("quiet_free_open");
	});

	it("omits next-package fields for chapter_start", () => {
		const start = {
			kind: "chapter_start" as const,
			title: "开始",
			summary: "入口",
		};
		const next = applyChapterPropertyForm(start, {
			title: "章节开始",
			summary: "入口点",
			nextPackageId: "pkg_memory_bar_1",
			nextEntryCardId: "doubao_intro_outbound",
		});
		expect(next.kind).toBe("chapter_start");
		expect(next.nextPackageId).toBeUndefined();
		expect(next.nextEntryCardId).toBeUndefined();
	});
});

describe("roleConnection", () => {
	const nodes: Node[] = [
		{
			id: "card_a",
			type: "callCard",
			position: { x: 0, y: 0 },
			data: sampleCard,
		},
		{
			id: "anchor_lanxing",
			type: "characterAnchor",
			position: { x: 0, y: 0 },
			data: {
				agentId: "agent_lanxing",
				displayName: "澜星姐姐",
				statusLabel: "有待呼入卡",
				pendingCardCount: 1,
			},
		},
	];

	it("recognizes role assignment connection", () => {
		const connection: Connection = {
			source: "card_a",
			target: "anchor_lanxing",
			sourceHandle: "role",
			targetHandle: "role",
		};
		expect(isRoleAssignmentConnection(connection, nodes)).toBe(true);
	});

	it("replaces previous role edge for the same card", () => {
		const edges: Edge[] = [
			buildRoleEdge("card_a", "anchor_old"),
			{
				id: "story_1",
				source: "card_a",
				target: "card_b",
				data: { edgeKind: "story" },
			},
		];
		const next = withoutRoleEdgesForCard(edges, "card_a");
		expect(next).toHaveLength(1);
		expect(next[0]?.id).toBe("story_1");
		expect(findAnchorNodeIdByAgentId(nodes, "agent_lanxing")).toBe(
			"anchor_lanxing",
		);
	});
});
