/**
	* 编辑故事包容器元数据：写 package.conf.json。
	*/
import { patchDiskPackageConf } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { EditPackageFormValues } from "./editPackageForm";

/**
	* 提交故事包容器元数据编辑；只 PATCH title，不改章节与入口章。
	*/
export async function commitEditPackage(
	packageId: string,
	values: EditPackageFormValues,
): Promise<{ packageId: string }> {
	await patchDiskPackageConf(packageId, {
		title: values.title.trim(),
	});
	return { packageId };
}
