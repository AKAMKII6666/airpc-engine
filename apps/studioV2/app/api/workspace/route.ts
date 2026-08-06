/**
	* GET/PUT /api/workspace — 工作区元信息。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	readWorkspaceConfig,
	writeWorkspaceConfig,
	type WorkspaceConfig,
} from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";

export async function GET(): Promise<Response> {
	try {
		const workspace = await readWorkspaceConfig();
		return apiOk({ workspace });
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}

/** PUT body: { workspace }；仅允许改工作区元信息。 */
export async function PUT(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			workspace?: Partial<WorkspaceConfig>;
		};
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
			};
			await writeWorkspaceConfig(next);
			await reloadStudioV2WorkspaceIfBooted();
			return apiOk({ workspace: next });
		}
		return apiFail("VALIDATION_FAILED", "workspace object required");
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
