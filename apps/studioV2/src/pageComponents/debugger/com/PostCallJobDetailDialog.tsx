/**
	* PostCallJob 详情弹层。
	*/
"use client";

import type { FC } from "react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	Stack,
	Typography,
} from "@mui/material";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";
import { POST_CALL_STATUS_LABEL } from "./PostCallJobTipCard";

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
					{/* 引用了Stack组件，用于详情字段纵向排版 */}
					<Stack spacing={1}>
						{/* 引用了Typography组件，用于展示 jobId */}
						<Typography variant="body2">jobId: {job?.jobId}</Typography>
						{/* 引用了Typography组件，用于展示 status */}
						<Typography variant="body2">
							status: {job?.status}
							{job
								? `（${POST_CALL_STATUS_LABEL[job.status] ?? job.status}）`
								: ""}
						</Typography>
						{/* 引用了Typography组件，用于展示 sessionId */}
						<Typography variant="body2">session: {job?.sessionId}</Typography>
						{job?.steps.map(function (step) {
							return (
								// 引用了Typography组件，用于展示单步执行状态
								<Typography key={step.id} variant="body2">
									{step.id}: {step.status}
									{step.detail ? ` · ${step.detail}` : ""}
								</Typography>
							);
						})}
						{job?.failedSteps.map(function (failed) {
							return (
								// 引用了Typography组件，用于展示失败步骤错误
								<Typography
									key={failed.stepId}
									variant="body2"
									sx={{ color: "#b91c1c" }}
								>
									{failed.stepId}: {failed.error}
								</Typography>
							);
						})}
						{/* 引用了Stack组件，用于详情底部操作行 */}
						<Stack direction="row" spacing={1}>
							{job?.status === "failed_retryable" && onRetry ? (
								// 引用了Button组件，用于一键重试失败 job
								<Button
									variant="contained"
									disabled={retryingJobId === job.jobId}
									onClick={function () {
										onRetry(job.jobId);
									}}
								>
									{retryingJobId === job.jobId ? "重试中…" : "重试"}
								</Button>
							) : null}
							{/* 引用了Button组件，用于关闭详情弹层 */}
							<Button onClick={onClose}>关闭</Button>
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		);
	};
