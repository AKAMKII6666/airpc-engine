/**
	* GET /api/stories — 扫描 data/storis-packages 下各包的 story.conf.json。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";

export async function GET(): Promise<Response> {
	try {
		const packages = await listDiskStoryPackages();
		return apiOk({ packages });
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
