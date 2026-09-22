/**
	* 玩家详情 lore 状态辅助：错误文案与 bootstrap 提示。
	*/
import type { BootstrapUserLoreResult } from "@studio-v2/src/bis/pageBis/users/detail/bootstrapUserLore_bis";

export function toLoreErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "操作失败，请稍后重试";
}

export function bootstrapLoreNotice(
	result: BootstrapUserLoreResult,
): string | undefined {
	return (
		result.notice ??
		(result.lorePreview.source === "llm"
			? "世界背景已用 LLM 重新生成"
			: undefined)
	);
}
