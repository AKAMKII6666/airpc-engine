/**
	* 工作区 BFF：读 / 改首故事指针（经 /api/workspace）。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";

/** 与 server WorkspaceConfig 对齐的 FE 投影 */
export type WorkspaceConfigDto = {
	schemaVersion: number;
	title: string;
	engineMinVersion: string;
	/** 首故事 packageId；必填且须存在 */
	startupPackageId: string;
};

export type WorkspaceApiData = {
	workspace: WorkspaceConfigDto;
};

/** GET /api/workspace */
export async function fetchWorkspaceConfig(): Promise<WorkspaceConfigDto> {
	const res = await fetch("/api/workspace");
	const data = await parseStudioApiJson<WorkspaceApiData>(res);
	return data.workspace;
}

/**
	* PUT /api/workspace：仅改首故事指针。
	* 服务端校验包存在；失败抛 VALIDATION_FAILED。
	*/
export async function putWorkspaceStartupPackageId(
	startupPackageId: string,
): Promise<WorkspaceConfigDto> {
	const res = await fetch("/api/workspace", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ startupPackageId }),
	});
	const data = await parseStudioApiJson<WorkspaceApiData>(res);
	return data.workspace;
}
