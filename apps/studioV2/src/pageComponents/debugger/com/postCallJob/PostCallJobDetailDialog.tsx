/**
	* PostCallJob 详情弹层。
	*/
"use client";

import type { FC } from "react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
// 引用了PostCallJobDetailBody组件，用于详情字段与操作
import { PostCallJobDetailBody } from "./PostCallJobDetailBody";

export type PostCallJobDetailDialogProps = {
	job: DebuggerPostCallJobView | null;
	onClose: () => void;
	onRetry?: (jobId: string) => void;
	retryingJobId?: string | null;
};

export const PostCallJobDetailDialog: FC<PostCallJobDetailDialogProps> =
	function PostCallJobDetailDialog({
		// job 表示当前选中详情；null 表示关闭，用于驱动 Dialog open
		job,
		// onClose 表示关闭回调，用于关掉详情弹层
		onClose,
		// onRetry 表示一键重试回调，用于失败可重试 job
		onRetry,
		// retryingJobId 表示重试中的 jobId，用于禁用重试按钮
		retryingJobId,
	}) {
		return (
			// 引用了Dialog组件，用于副作用详情弹层
			<Dialog open={job !== null} onClose={onClose} maxWidth="sm" fullWidth>
				{/* 引用了DialogTitle组件，用于详情标题 */}
				<DialogTitle>副作用执行详情 · {job?.primaryAgentId}</DialogTitle>
				{/* 引用了DialogContent组件，用于详情正文区 */}
				<DialogContent dividers>
					{job ? (
						// 引用了PostCallJobDetailBody组件，用于字段与步骤
						<PostCallJobDetailBody
							job={job}
							onClose={onClose}
							onRetry={onRetry}
							retryingJobId={retryingJobId}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		);
	};
