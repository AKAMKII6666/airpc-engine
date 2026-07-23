/**
	* 为 AvatarUpload 注入直传回调；commonUi 不直调 ajax，由 bis 编排。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import { commitUploadAvatarImage } from "./uploadAvatar_bis";

/**
	* 克隆 items，给 AvatarUpload 挂 uploadFile（返回 assetId）。
	*/
export function withAvatarUploadItems(items: AutoFormItem[]): AutoFormItem[] {
	return items.map(function mapItem(item) {
		if (item.comType !== "AvatarUpload") return item;
		return {
			...item,
			helperText:
				item.helperText ??
				"选择 PNG / JPG / WebP 直传；上传后须点「保存」才写入角色。assetId 由系统生成。",
			comProps: {
				...item.comProps,
				uploadFile: async function uploadFile(file: File): Promise<string> {
					const result = await commitUploadAvatarImage(file);
					return result.assetId;
				},
			},
		};
	});
}
