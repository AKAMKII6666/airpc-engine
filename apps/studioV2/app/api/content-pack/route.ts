/**
	* GET /api/content-pack — 导出内容包（多故事包 + workspace.startupPackageId）。
	* 导出前校验首故事有效；单包 .storypack 不走本路由。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { buildContentPackFile } from "@studio-v2/src/utils/server/contentPack/contentPackFs.server";

export async function GET(): Promise<Response> {
	try {
		const file = await buildContentPackFile();
		return apiOk({ contentPack: file });
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
