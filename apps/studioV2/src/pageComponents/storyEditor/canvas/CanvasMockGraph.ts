/**
	* 画布初始节点 / 边：CallCard、章节、角色锚点与出口/归属连线。
	* 坐标为画布像素；静态验收用，非持久化布局真源。
	* 角色锚点 agentId 对齐 data/characters，可点选编辑。
	*/
import type { Edge, Node } from "@xyflow/react";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import { MOCK_EDITOR_CHARACTERS } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import { ROLE_EDGE_STYLE } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";

export type EditorCanvasNodeData =
	| EditorCallCardProjection
	| EditorChapterNodeData
	| CharacterAnchorNodeData;

export const INITIAL_EDITOR_NODES: Node<EditorCanvasNodeData>[] = [
	{
		id: "anchor_doubao_sister",
		type: "characterAnchor",
		position: { x: -40, y: 40 },
		data: {
			agentId: MOCK_EDITOR_CHARACTERS[0].agentId,
			displayName: MOCK_EDITOR_CHARACTERS[0].displayName,
			statusLabel: MOCK_EDITOR_CHARACTERS[0].statusLabel,
			pendingCardCount: MOCK_EDITOR_CHARACTERS[0].pendingCardCount,
		},
		draggable: false,
		selectable: true,
	},
	{
		id: "anchor_xiaoyu",
		type: "characterAnchor",
		position: { x: -40, y: 160 },
		data: {
			agentId: MOCK_EDITOR_CHARACTERS[1].agentId,
			displayName: MOCK_EDITOR_CHARACTERS[1].displayName,
			statusLabel: MOCK_EDITOR_CHARACTERS[1].statusLabel,
			pendingCardCount: MOCK_EDITOR_CHARACTERS[1].pendingCardCount,
		},
		draggable: false,
		selectable: true,
	},
	{
		id: "chapter_start",
		type: "chapter",
		position: { x: 200, y: 180 },
		data: {
			kind: "chapter_start",
			title: "章节开始",
			summary: "进入本话",
		},
	},
	{
		id: "card_intro",
		type: "callCard",
		position: { x: 420, y: 120 },
		data: {
			cardId: "doubao_intro_outbound",
			cardKind: "story",
			title: "澜星开场",
			ownerAgentId: "doubao-sister",
			ownerDisplayName: "澜星",
			entryMode: "inbound_user_dial",
			interactionMode: "realtime_dialogue",
			context: {
				objective: "说明内存条事由并约定回电",
				privateBrief: "用户刚装机缺内存条，澜星先稳住预期。",
				speakableBrief: "内存条的事我记下了，稍后让小雨回电。",
				emotion: "稳妥关切",
				promptScenes: [
					{
						layerId: "intro_day",
						priority: 0,
						match: {
							callDirection: "either",
							localHourRange: { from: 9, to: 21 },
						},
						patch: {
							openingSpeakable: "先把内存条的事说清楚。",
							openingPrivate: "",
							emotion: "稳妥",
							toneHint: "",
							appendSpeakable: "",
							appendPrivate: "",
						},
					},
				],
			},
			objectives: {
				requiredBeats: ["说明事由", "约定回电"],
			},
			toolPolicy: {
				mode: "inherit_free",
			},
			exits: [
				{
					exitId: "exit_a",
					title: "转交小雨",
					exitKind: "handoff",
					priority: 10,
					conditionSummary: "转交 · 交给小雨跟进",
					effects: [
						{
							id: "fx_attach",
							effect: "attach_call_card",
							summary: "挂载小雨跟进卡",
						},
					],
				},
				{
					exitId: "exit_b",
					title: "用户先拨",
					exitKind: "callback",
					priority: 0,
					conditionSummary: "回电 · 用户先拨小雨",
					effects: [],
				},
			],
			validationBadge: "ok",
			selected: true,
		},
	},
	{
		id: "card_delay",
		type: "callCard",
		position: { x: 760, y: 60 },
		data: {
			cardId: "xiaoyu_delay_confirm",
			cardKind: "schedule",
			title: "小雨延迟外呼",
			ownerAgentId: "xiaoyu",
			ownerDisplayName: "小雨",
			entryMode: "either",
			interactionMode: "realtime_dialogue",
			context: {
				objective: "挂机后数分钟外呼确认库存",
				premise: "库存需二次核对后再回电。",
			},
			exits: [
				{
					exitId: "exit_a",
					title: "确认后回电",
					exitKind: "callback",
					priority: 0,
					conditionSummary: "回电 · 库存确认后",
					effects: [
						{
							id: "fx_schedule",
							effect: "schedule_call_card",
							summary: "预约回电",
						},
					],
				},
			],
			schedule: {
				mode: "daily",
				hour: 14,
				minute: 30,
				cooldownMs: 300_000,
				priority: 1,
			},
			validationBadge: "warning",
		},
	},
	{
		id: "card_boss",
		type: "callCard",
		position: { x: 760, y: 280 },
		data: {
			cardId: "xiaoyu_stock_callback",
			cardKind: "story",
			title: "小雨回电",
			ownerAgentId: "xiaoyu",
			ownerDisplayName: "小雨",
			entryMode: "outbound_auto",
			interactionMode: "realtime_dialogue",
			context: {
				objective: "告知库存与取货时间",
				speakableBrief: "货到了，可以来取。",
			},
			objectives: {
				requiredBeats: ["告知库存", "约定取货"],
			},
			exits: [
				{
					exitId: "exit_a",
					title: "完成本话",
					exitKind: "terminal",
					priority: 0,
					conditionSummary: "终结 · 进入章节结束",
					effects: [
						{
							id: "fx_end",
							effect: "end_story",
							summary: "结束本章",
						},
					],
				},
			],
			validationBadge: "ok",
		},
	},
	{
		id: "chapter_end",
		type: "chapter",
		position: { x: 1100, y: 180 },
		data: {
			kind: "chapter_end",
			title: "章节结束",
			summary: "清理 pending · 安排下一章",
			nextPackageId: "pkg_night_shift_2",
			nextEntryCardId: "night_shift_open",
		},
	},
];

export const INITIAL_EDITOR_EDGES: Edge[] = [
	{
		id: "role_intro_doubao",
		source: "card_intro",
		target: "anchor_doubao_sister",
		sourceHandle: "role",
		targetHandle: "role",
		style: { ...ROLE_EDGE_STYLE },
		data: { edgeKind: "role" },
	},
	{
		id: "role_delay_xiaoyu",
		source: "card_delay",
		target: "anchor_xiaoyu",
		sourceHandle: "role",
		targetHandle: "role",
		style: { ...ROLE_EDGE_STYLE },
		data: { edgeKind: "role" },
	},
	{
		id: "role_boss_xiaoyu",
		source: "card_boss",
		target: "anchor_xiaoyu",
		sourceHandle: "role",
		targetHandle: "role",
		style: { ...ROLE_EDGE_STYLE },
		data: { edgeKind: "role" },
	},
	{
		id: "e_start_intro",
		source: "chapter_start",
		target: "card_intro",
		sourceHandle: "exit",
		targetHandle: "parent",
		style: { stroke: "#7e8da4" },
		data: { edgeKind: "story" },
	},
	{
		id: "e_intro_delay",
		source: "card_intro",
		target: "card_delay",
		sourceHandle: "exit_a",
		targetHandle: "parent",
		label: "转交小雨",
		style: { stroke: "#5b6cff" },
		data: { edgeKind: "story" },
	},
	{
		id: "e_intro_boss",
		source: "card_intro",
		target: "card_boss",
		sourceHandle: "exit_b",
		targetHandle: "parent",
		label: "用户先拨",
		style: { stroke: "#5b6cff" },
		data: { edgeKind: "story" },
	},
	{
		id: "e_boss_end",
		source: "card_boss",
		target: "chapter_end",
		sourceHandle: "exit_a",
		targetHandle: "parent",
		style: { stroke: "#7e8da4" },
		data: { edgeKind: "story" },
	},
];
