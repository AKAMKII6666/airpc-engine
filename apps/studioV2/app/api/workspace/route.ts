/**
	* GET/PUT /api/workspace — 工作区配置（含首故事 startupPackageId）。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	ensureWorkspaceStartupPackageId,
	readWorkspaceConfig,
	setWorkspaceStartupPackageId,
	validateStartupPackageId,
	writeWorkspaceConfig,
	type WorkspaceConfig,
} from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";

export async function GET(): Promise<Response> {
	try {
		const workspace = await ensureWorkspaceStartupPackageId();
		return apiOk({ workspace });
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}

/**
	* PUT body: { startupPackageId } 或完整 { workspace }。
	* 仅允许改工作区元数据；首故事必须指向已存在包。
	*/
export async function PUT(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			startupPackageId?: unknown;
			workspace?: Partial<WorkspaceConfig>;
		};
		if (typeof body.startupPackageId === "string") {
			const workspace = await setWorkspaceStartupPackageId(
				body.startupPackageId,
			);
			await reloadStudioV2WorkspaceIfBooted();
			return apiOk({ workspace });
		}
		if (body.workspace && typeof body.workspace === "object") {
			const prev = await readWorkspaceConfig();
			const next: WorkspaceConfig = {
				schemaVersion:
					typeof body.workspace.schemaVersion === "number"
						? body.workspace.schemaVersion
						: prev.schemaVersion,
				title:
					typeof body.workspace.title === "string"
						? body.workspace.title
						: prev.title,
				engineMinVersion:
					typeof body.workspace.engineMinVersion === "string"
						? body.workspace.engineMinVersion
						: prev.engineMinVersion,
				startupPackageId:
					typeof body.workspace.startupPackageId === "string"
						? body.workspace.startupPackageId.trim()
						: prev.startupPackageId,
			};
			const err = await validateStartupPackageId(next.startupPackageId);
			if (err) {
				return apiFail("VALIDATION_FAILED", err);
			}
			await writeWorkspaceConfig(next);
			await reloadStudioV2WorkspaceIfBooted();
			return apiOk({ workspace: next });
		}
		return apiFail(
			"VALIDATION_FAILED",
			"startupPackageId or workspace object required",
		);
	} catch (err) {
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}
