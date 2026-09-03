/**
	* 清空记忆二次确认弹层。
	*/
"use client";

import type { FC } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";

export type CharacterMemoryClearDialogProps = {
	/** 弹层是否打开 */
	open: boolean;
	/** 关闭弹层 */
	onClose: () => void;
	/** 展示用昵称 */
	nickname: string;
	/** 清空中 */
	clearing: boolean;
	/** 确认清空 */
	onConfirm: () => Promise<void>;
};

export const CharacterMemoryClearDialog: FC<
	CharacterMemoryClearDialogProps
> = function CharacterMemoryClearDialog({
	// open 表示确认弹层是否打开，用于控制 Dialog 显隐
	open,
	// onClose 表示关闭回调，用于取消或点遮罩关闭弹层
	onClose,
	// nickname 表示展示用昵称，用于确认文案中的玩家名
	nickname,
	// clearing 表示清空进行中，用于禁用确认按钮
	clearing,
	// onConfirm 表示确认清空回调，用于执行清空记忆
	onConfirm,
}) {
	return (
		// 引用了Dialog组件，用于清空记忆二次确认
		<Dialog open={open} onClose={onClose}>
			{/* 引用了DialogTitle组件，用于确认弹层标题 */}
			<DialogTitle>清空记忆</DialogTitle>
			{/* 引用了DialogContent组件，用于确认说明正文区 */}
			<DialogContent>
				{/* 引用了DialogContentText组件，用于展示清空影响说明 */}
				<DialogContentText>
					将清空玩家「{nickname}」在当前角色下的全部对话惯性与记忆，确定继续？
				</DialogContentText>
			</DialogContent>
			{/* 引用了DialogActions组件，用于确认弹层操作行 */}
			<DialogActions>
				{/* 引用了Button组件，用于取消清空 */}
				<Button onClick={onClose}>取消</Button>
				{/* 引用了Button组件，用于确认执行清空 */}
				<Button
					color="error"
					disabled={clearing}
					onClick={async () => {
						onClose();
						await onConfirm();
					}}
				>
					确定清空
				</Button>
			</DialogActions>
		</Dialog>
	);
};
