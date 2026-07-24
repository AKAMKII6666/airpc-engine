/**
	* 设定工作区首故事：PUT /api/workspace → 调用方 bump 重拉列表。
	*/
import { putWorkspaceStartupPackageId } from "@studio-v2/src/utils/ajaxProxy/workspace/api/workspaceApi";

/**
	* 将指定 packageId 设为工作区首故事。
	* 成功返回新指针；失败由 ajax 层抛人话错误。
	*/
export async function setStartupPackage(
	packageId: string,
): Promise<{ startupPackageId: string }> {
	const workspace = await putWorkspaceStartupPackageId(packageId);
	return { startupPackageId: workspace.startupPackageId };
}
