/**
	* 调试器：对磁盘故事包只读 validate；不写盘、不 Host beginCall。
	*/
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import { fetchDiskStoryPackageValidation } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 调试器默认选中的正式第一幕包（非 mock pkg_memory_bar_1） */
export const DEBUGGER_DEFAULT_PACKAGE_ID = "wrong_number_act1";

/** 列表磁盘包，供调试器 Select */
export async function listPackagesForDebuggerValidate(): Promise<
	StoryPackageSummary[]
> {
	return listStoryPackagesFromDisk();
}

/**
	* 对已落盘 packageId 跑引擎校验；返回报告供调试器展示。
	* 禁止由此入口触发 beginCall / Effect。
	*/
export async function validateDiskPackageForDebugger(
	packageId: string,
): Promise<ValidationReport> {
	const { validation } = await fetchDiskStoryPackageValidation(packageId);
	return validation;
}
