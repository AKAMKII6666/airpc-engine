/**
	* 首通预览旁挂 UserGate：无玩家时硬门禁。
	*/
"use client";

import type { FC } from "react";
// 引用了UserGate组件，用于无玩家时硬门禁
import { UserGate } from "@studio-v2/src/commonUiComponents/userGate/UserGate";

export type FirstConnectPromptPreviewGateProps = {
	open: boolean;
	userId: string;
	onClose: () => void;
};

export const FirstConnectPromptPreviewGate: FC<
	FirstConnectPromptPreviewGateProps
> = function FirstConnectPromptPreviewGate({
	// open 表示是否挂载门禁，用于显隐
	open,
	// userId 表示当前玩家，用于高亮
	userId,
	// onClose 用于关闭门禁
	onClose,
}) {
	if (!open) return null;
	return (
		// 引用了UserGate组件，用于无玩家时硬门禁（水合后按需挂载）
		<UserGate
			open
			currentUserId={userId}
			allowDismissWhenSelected
			onClose={onClose}
			onSelected={onClose}
			title="选择玩家（提示词预览需要 Memory 上下文）"
		/>
	);
};
