/**
	* 导入故事包编排：预检通过后 POST /api/stories/import 真写盘。
	*/
import { postImportDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type {
	DiskChapterBundle,
	DiskPackageContainer,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 导入提交结果 */
export type ImportPackageResult = {
	/** 落盘后的故事包目录键 */
	packageId: string;
};

/**
	* 将预检通过的 bundle 或 container 写入 storis-packages。
	* 同名冲突 / 校验失败由 ajax 层抛错。
	*/
export async function commitImportStoryPackage(input: {
	packageId: string;
	bundle?: DiskChapterBundle;
	container?: DiskPackageContainer;
}): Promise<ImportPackageResult> {
	if (input.container) {
		const saved = await postImportDiskStoryPackage({
			packageId: input.packageId,
			packageConf: input.container.packageConf,
			chapters: input.container.chapters,
		});
		return { packageId: saved.packageId };
	}
	if (!input.bundle) {
		throw new Error("导入载荷缺失");
	}
	const saved = await postImportDiskStoryPackage({
		packageId: input.packageId,
		conf: input.bundle.conf,
		cards: input.bundle.cards,
		layout: input.bundle.layout,
	});
	return { packageId: saved.packageId };
}
