/**
	* 故事包磁盘 validate：经 ContentPort 装包后调引擎纯规则 validatePackage。
	* 仅 Next API / server FS 调用；禁止 client 直引。
	*/
import {
	validatePackage,
	type ValidationReport,
} from "@airpc/rpg-engine";
// 引用了本机 ContentPort，用于 loadPackageForValidate（禁止引擎直 fs）
import { createFsContentPort } from "@studio-v2/engineIOModule/content/fsContentPort";
import { getStudioV2DataRoot } from "../../data/dataRoot.server";

/**
	* 对已落盘的 packageId 跑引擎校验（读 data/storis-packages）。
	* 保存闸门须在写盘后调用；失败时由写盘层回滚。
	*/
export async function validateStoryPackageOnDisk(
	packageId: string,
): Promise<ValidationReport> {
	const workspaceKey = getStudioV2DataRoot();
	const content = createFsContentPort();
	const bundle = await content.loadPackageForValidate({
		workspaceKey,
		packageId,
	});
	return validatePackage({
		bundle,
		workspaceKey,
		content,
	});
}
