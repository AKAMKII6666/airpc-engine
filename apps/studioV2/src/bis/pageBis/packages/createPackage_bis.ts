/**
	* 新建故事包编排：POST /api/stories 落盘最小 conf + layout + 可选入口卡。
	* 已清零 commitCreatePackageMock throw 路径。
	*/
import type { CreatePackageFormValues } from "./createPackageForm";
import { postDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

/** 新建故事包结果；packageId 与 data/storis-packages 目录名一致 */
export type CreatePackageResult = {
	/** 落盘成功后的故事包目录键 */
	packageId: string;
};

/**
	* 由表单提交新建磁盘故事包；成功返回 packageId 供跳转编辑器。
	*/
export async function commitCreatePackage(
	values: CreatePackageFormValues,
): Promise<CreatePackageResult> {
	const title = values.title.trim();
	const packageId = createStudioId("package", title);
	const bundle = await postDiskStoryPackage({
		packageId,
		title,
		description: values.description.trim(),
		withStartCard: values.withStartCard !== false,
	});
	return { packageId: bundle.conf.packageId };
}
