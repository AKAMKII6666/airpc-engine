/**
	* GET/PUT /api/workspace — 工作区元信息。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	readWorkspaceConfig,
	writeWorkspaceConfig,
	type WorkspaceConfig,
} from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import { failFromUnknown, mergeWorkspacePatch } from "./route.helpers";

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
		const prev = await readWorkspaceConfig();
		const next = mergeWorkspacePatch(prev, body.workspace);
		if (!next) {
			return apiFail("VALIDATION_FAILED", "workspace object required");
		}
		await writeWorkspaceConfig(next);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({ workspace: next });
	} catch (err) {
		return failFromUnknown(err);
	}
}
