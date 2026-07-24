/**
	* 导入故事包编排：预检通过后 POST /api/stories/import 真写盘。
	*/
import { postImportDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 导入提交结果 */
export type ImportPackageResult = {
	/** 落盘后的故事包目录键 */
	packageId: string;
};

/**
	* 将预检通过的 bundle 写入 storis-packages。
	* 同名冲突 / 校验失败由 ajax 层抛错。
	*/
export async function commitImportStoryPackage(input: {
	packageId: string;
	bundle: DiskStoryPackageBundle;
}): Promise<ImportPackageResult> {
	const conf = {
		...input.bundle.conf,
		packageId: input.packageId,
	};
	const saved = await postImportDiskStoryPackage({
		packageId: input.packageId,
		conf,
		cards: input.bundle.cards,
		layout: input.bundle.layout,
	});
	return { packageId: saved.packageId };
}
