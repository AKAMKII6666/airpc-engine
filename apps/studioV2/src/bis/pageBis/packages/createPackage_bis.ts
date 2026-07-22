/**
	* 新建故事包编排：本步未接磁盘落盘；调用方应禁用入口或提示后续批次。
	*/
import type { CreatePackageFormValues } from "./createPackageForm";

/** 新建故事包结果；packageId 仅当落盘成功时有意义 */
export type CreatePackageResult = {
	/** 落盘成功后的故事包目录键；与 data/storis-packages 下文件夹名一致 */
	packageId: string;
};

/**
	* 新建故事包落盘尚未接通（第三步 B 末可选）。
	* @throws 始终抛错，防止误写会话 mock
	*/
export function commitCreatePackageMock(
	_values: CreatePackageFormValues,
): CreatePackageResult {
	throw new Error("新建故事包落盘尚未接通；请打开已有磁盘包或等待后续批次");
}
