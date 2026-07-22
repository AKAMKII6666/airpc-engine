/**
	* 导入故事包编排：本步未接真写盘；预检仍为 mock。
	*/
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";

/** 导入 mock 提交结果；仅当落盘成功时有意义 */
export type ImportPackageResult = {
	/** 导入落盘后的故事包目录键；与 data/storis-packages 下文件夹名一致 */
	packageId: string;
};

/**
	* 导入落盘尚未接通（第三步 B 末可选）。
	* @throws 始终抛错，防止误写会话 mock
	*/
export function commitImportPackageMock(
	_report: ImportPrecheckReport,
): ImportPackageResult {
	throw new Error("导入故事包落盘尚未接通；请使用已有磁盘包");
}
