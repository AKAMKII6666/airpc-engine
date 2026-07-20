/**
 * 导入故事包编排（静态阶段）：预检通过后写入会话 mock。
 * 禁止 Host 写口、真写盘与「已保存到磁盘」文案。
 */
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import { appendMockPackage } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";

/** 导入 mock 提交结果；仅返回路由用 packageId */
export type ImportPackageResult = {
  /** 导入为新包后的路由用 packageId */
  packageId: string;
};

/**
 * 按预检报告生成会话内新包摘要并前置到列表。
 * 始终「导入为新故事包」并重新生成内部 ID，不覆盖已有包。
 */
export function commitImportPackageMock(
  report: ImportPrecheckReport,
): ImportPackageResult {
  const packageId = createStudioId("package", report.packageTitle);
  const summary: StoryPackageSummary = {
    packageId,
    title: report.packageTitle,
    description: "会话内 mock 导入（未写盘）",
    lastEditedAt: new Date().toISOString(),
    cardCount: report.cardCount,
    characterCount: report.characterCount,
    assetCount: report.assetCount,
    validation: report.verdict === "ready" ? "ok" : "warning",
    saveState: "unsaved",
    lastExportedAt: null,
  };
  appendMockPackage(summary);
  return { packageId };
}
