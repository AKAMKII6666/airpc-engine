/**
	* 导出摘要编排：按磁盘列表摘要生成；正式导出禁 validation=error。
	* 起点/章节文案来自摘要字段，不再返回假 mock 句。
	*/
import type { ExportSummary } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
	* 按列表摘要生成导出预检投影。
	* 无选中返回 null；error 包禁止正式导出由调用方判 formalBlocked。
	*/
export function buildExportSummary(
	pkg: StoryPackageSummary | undefined,
): ExportSummary | null {
	if (!pkg) return null;
	const warnings =
		pkg.validation === "warning"
			? ["磁盘校验存在警告；建议先打开编辑器修复后再导出正式包。"]
			: [];
	const errors =
		pkg.validation === "error"
			? ["磁盘校验存在错误；禁止导出正式包。可导出调试/源工程包继续排查。"]
			: [];
	return {
		packageId: pkg.packageId,
		packageTitle: pkg.title,
		packageVersion: "schema-1",
		cardCount: pkg.cardCount,
		characterCount: pkg.characterCount,
		assetCount: pkg.assetCount,
		chapterEndSummary: "以包内章节节点为准（导出整包 JSON）",
		startCardTitle: "以 conf.entryCardId 为准",
		validation: pkg.validation,
		warnings,
		errors,
	};
}
