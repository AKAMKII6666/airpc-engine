/**
	* 首通预览弹层动作区：关闭 + 渲染。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";

export type FirstConnectPromptPreviewActionsProps = {
	busy: boolean;
	onClose: () => void;
	onRender: () => void;
};

export const FirstConnectPromptPreviewActions: FC<
	FirstConnectPromptPreviewActionsProps
> = function FirstConnectPromptPreviewActions({
	// busy 表示渲染进行中，用于禁用按钮
	busy,
	// onClose 关闭弹层
	// onClose 是组件入参，用于渲染与交互
	onClose,
	// onRender 触发预览渲染
	// onRender 是组件入参，用于渲染与交互
	onRender,
}) {
	return (
		<>
			{/* 引用了Button组件，用于关闭 */}
			<Button onClick={onClose} disabled={busy}>
				关闭
			</Button>
			{/* 引用了Button组件，用于触发渲染 */}
			<Button variant="contained" disabled={busy} onClick={onRender}>
				渲染提示词
			</Button>
		</>
	);
};
