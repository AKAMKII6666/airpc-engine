/**
	* POST /api/content-pack/import — 覆盖导入内容包。
	* 校验 startupPackageId 后覆盖 storis-packages + workspace.json。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import { importContentPackOverwrite } from "@studio-v2/src/utils/server/contentPack/contentPackFs.server";

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { contentPack?: unknown };
		if (body.contentPack === undefined) {
			return apiFail("VALIDATION_FAILED", "contentPack object required");
		}
		const result = await importContentPackOverwrite(body.contentPack);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(result);
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
