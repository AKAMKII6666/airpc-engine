/**
	* 删除故事包：经 API 删除 data/storis-packages/<packageId>/。
	*/
import { deleteDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";

/**
	* 删除成功回执；调用方 bump 列表。
	* 首故事 / 最后一包由服务端拒删。
	*/
export type DeletePackageResult = {
	/** 已删除的 packageId */
	packageId: string;
};

/**
	* 提交删除；失败抛人话错误，不假定本地已删。
	*/
export async function commitDeletePackage(
	packageId: string,
): Promise<DeletePackageResult> {
	const result = await deleteDiskStoryPackage(packageId);
	return { packageId: result.packageId };
}
