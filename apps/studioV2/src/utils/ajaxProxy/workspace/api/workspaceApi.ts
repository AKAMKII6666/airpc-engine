/**
	* 工作区 BFF：读 / 改工作区元信息（经 /api/workspace）。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";

/** 与 server WorkspaceConfig 对齐的 FE 投影 */
export type WorkspaceConfigDto = {
	schemaVersion: number;
	title: string;
	engineMinVersion: string;
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

/** PUT /api/workspace */
export async function putWorkspaceConfig(
	workspace: WorkspaceConfigDto,
): Promise<WorkspaceConfigDto> {
	const res = await fetch("/api/workspace", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ workspace }),
	});
	const data = await parseStudioApiJson<WorkspaceApiData>(res);
	return data.workspace;
}
