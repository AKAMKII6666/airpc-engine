/**
	* 玩家详情：强制重生成世界背景（Host bootstrapLore force）。
	* 有未保存表单修改时须先落盘，再 bootstrap，避免用旧 location 生成 lore。
	*/
import { postBootstrapUserLore } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type {
	LoreBootstrapResultDto,
	LorePreviewDto,
} from "@studio-v2/typeFiles/library/users/loreBootstrap";
import type { UserDetailFormValues } from "./userDetailForm";
import {
	commitSaveUserDetail,
	type SaveUserDetailResult,
} from "./save/saveUser_bis";

/**
	* 详情「重新生成世界背景」成功投影；不进 store，仅本页瞬时展示。
	*/
export type BootstrapUserLoreResult = {
	/** 写入后的 lore 只读预览 */
	lorePreview: LorePreviewDto;
	/** true 表示本次走了降级模板（无 Key／LLM 失败） */
	usedFallback: boolean;
	/** 给人看的提示（fallback／LLM 错误）；成功 llm 时可空 */
	notice?: string;
};

function toNotice(data: LoreBootstrapResultDto): string | undefined {
	if (!data.usedFallback) return undefined;
	if (data.errorMessage && data.errorMessage.trim() !== "") {
		return `世界背景已用降级模板：${data.errorMessage}`;
	}
	return "世界背景已用降级模板（未配置 LLM 或调用失败）";
}

/**
	* 强制重写 Profile.world.lore；详情按钮专用。
	*/
export async function commitBootstrapUserLore(
	userId: string,
): Promise<BootstrapUserLoreResult> {
	const data = await postBootstrapUserLore(userId, { force: true });
	return {
		lorePreview: data.lore,
		usedFallback: data.usedFallback,
		notice: toNotice(data),
	};
}

/** 「重新生成」编排结果：可选先保存 user 段，再 force bootstrap。 */
export type BootstrapUserLoreWithSaveResult = {
	/** dirty 时先 PUT 的回读投影；未改表单则为空 */
	save?: SaveUserDetailResult;
	bootstrap: BootstrapUserLoreResult;
};

/**
	* 详情「重新生成」：表单 dirty 时先 commitSaveUserDetail，再 force bootstrap。
	* 校验须在调用方（Formik validateForm）完成后再进入本函数。
	*/
export async function commitBootstrapUserLoreWithOptionalSave(
	profile: UserProfileSummary,
	values: UserDetailFormValues,
	input: { dirty: boolean },
): Promise<BootstrapUserLoreWithSaveResult> {
	let save: SaveUserDetailResult | undefined;
	if (input.dirty) {
		save = await commitSaveUserDetail(profile, values);
	}
	const bootstrap = await commitBootstrapUserLore(profile.userId);
	return { save, bootstrap };
}
