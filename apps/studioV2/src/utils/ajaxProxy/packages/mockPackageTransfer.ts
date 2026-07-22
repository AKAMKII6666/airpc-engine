/**
	* 导入预检 / 导出摘要静态 mock（导出选包列表已改磁盘）。
	* 演示「先检查再确认」与「有错误禁正式导出」；不接真实打包管线。
	*/
import type {
	ExportSummary,
	ImportPrecheckReport,
} from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 演示用预检报告：可导入但有警告。 */
export const MOCK_IMPORT_PRECHECK: ImportPrecheckReport = {
	packageTitle: "外来包：张老板回电",
	schemaVersion: "0.9",
	cardCount: 7,
	characterCount: 2,
	assetCount: 3,
	missingAssets: true,
	unknownEffects: false,
	unreachableCards: false,
	idConflict: false,
	needsMigration: true,
	verdict: "ready_with_warnings",
	messages: [
		"这个故事包来自较早版本，可以迁移后导入。",
		"迁移不会修改原文件。",
		"缺少 1 个音频资源，导入后可在资源库补齐。",
	],
};

/**
	* 按磁盘列表摘要生成导出 mock。
	* error 包禁止正式导出；warning 可导出但展示警告。
	*/
export function buildMockExportSummary(
	pkg: StoryPackageSummary | undefined,
): ExportSummary | null {
	if (!pkg) return null;
	const warnings =
		pkg.validation === "warning"
			? ["存在未连接的出口触点，正式包仍可导出但建议先修。"]
			: [];
	const errors =
		pkg.validation === "error"
			? ["存在不可达卡片，禁止导出正式包。可导出调试包继续排查。"]
			: [];
	return {
		packageId: pkg.packageId,
		packageTitle: pkg.title,
		packageVersion: "1.0.0-static",
		cardCount: pkg.cardCount,
		characterCount: pkg.characterCount,
		assetCount: pkg.assetCount,
		chapterEndSummary: "结束本章 · 等待用户拨入下一章",
		startCardTitle: "章节起点",
		validation: pkg.validation,
		warnings,
		errors,
	};
}
