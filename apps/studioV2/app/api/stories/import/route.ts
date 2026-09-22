/**
	* POST /api/stories/import — 导入 .storypack.json 整包（多章）落盘。
	*/
import { PackageConfSchema } from "@airpc/rpg-engine";
import {
	apiFail,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	packageExists,
	writeDiskPackageContainer,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { parseImportBody } from "@studio-v2/src/utils/server/packages/import/importBodyParse.server";
import {
	failFromUnknown,
	validateImportedEntryChapter,
} from "./route.helpers";

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as Record<string, unknown>;
		const parsed = parseImportBody(body);
		if (!parsed) {
			return apiFail(
				"VALIDATION_FAILED",
				"import body 须含 packageConf+chapters 或 legacy conf+cards",
			);
		}
		const { packageId, packageConf, chapters } = parsed;
		const confParsed = PackageConfSchema.safeParse({
			...(packageConf as object),
			packageId,
		});
		if (!confParsed.success) {
			return apiFail("VALIDATION_FAILED", "packageConf invalid");
		}
		if (await packageExists(packageId)) {
			return apiFail(
				"CONFLICT",
				`工作区已存在同名故事包：${packageId}`,
				409,
				{ packageId },
			);
		}

		await writeDiskPackageContainer(packageId, {
			packageConf: confParsed.data,
			chapters,
		});

		return await validateImportedEntryChapter({
			packageId,
			packageConf: confParsed.data,
			chapters,
		});
	} catch (err) {
		return failFromUnknown(err);
	}
}
