/**
	* 工作台右侧：工程状态 / 最近调试 mock（允许暂留）。
	* 故事包列表已迁磁盘；本文件不再提供 MOCK_STORY_PACKAGES。
	*/
import type {
	EngineeringStatusItem,
	RecentDebugSummary,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 右侧工程状态 mock。 */
export const MOCK_ENGINEERING_STATUS: readonly EngineeringStatusItem[] = [
	{
		id: "schema",
		label: "Schema 校验器",
		level: "ok",
		detail: "可用 · 引擎 schema 1.0",
	},
	{
		id: "last_export",
		label: "最近导出",
		level: "ok",
		detail: "正式包导出成功",
	},
	{
		id: "open_errors",
		label: "未处理问题",
		level: "warning",
		detail: "1 个故事包有校验警告",
	},
	{
		id: "migration",
		label: "迁移需求",
		level: "ok",
		detail: "当前工作区无需迁移",
	},
];

/** 最近调试 mock；叙事摘要，非 JSON log。 */
export const MOCK_RECENT_DEBUGS: readonly RecentDebugSummary[] = [
	{
		sessionId: "dbg_mem_01",
		packageTitle: "第一幕：打错电话",
		packageId: "wrong_number_act1",
		startCardTitle: "打错电话",
		hitExitTitle: "挂机后补打",
		resultLabel: "出口命中 · Effect 完成",
		at: "2026-07-22T11:30:00.000Z",
	},
	{
		sessionId: "dbg_night_02",
		packageTitle: "演示：黄金交接",
		packageId: "golden_handoff",
		startCardTitle: "章节起点",
		hitExitTitle: "",
		resultLabel: "通话中断 · 未选出口",
		at: "2026-07-14T22:18:00.000Z",
	},
];
