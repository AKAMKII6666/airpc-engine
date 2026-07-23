/**
	* 角色头像直传编排：系统 assetId → POST /api/assets/upload → 回填 avatarAssetId。
	* UI 禁止手填 assetId；本函数是唯一写口。
	*/
import { postAssetBinaryUpload } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 头像上传结果；assetId 写入 CharacterDef.meta.avatarAssetId */
export type UploadAvatarResult = {
	/** 新建全局 image 资产 id */
	assetId: string;
	/** 列表/预览用投影 */
	summary: AssetSummary;
};

/**
	* 上传本地头像图到 data/assets，返回 assetId 供表单写回。
	*/
export async function commitUploadAvatarImage(
	file: File,
): Promise<UploadAvatarResult> {
	const stem = file.name.replace(/\.[^.]+$/, "").trim() || "avatar";
	const assetId = createStudioId("asset", `avatar_${stem}`);
	const summary = await postAssetBinaryUpload({
		assetId,
		file,
		displayName: stem,
		usage: "avatar",
	});
	return { assetId: summary.assetId, summary };
}
