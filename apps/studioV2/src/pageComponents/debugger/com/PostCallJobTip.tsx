/**
	* 挂机后副作用 tip：右下角非阻塞提示，点击打开详情；失败可一键重试。
	*/
"use client";

import { useState, type FC } from "react";
import { Box, Typography } from "@mui/material";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";
import { PostCallJobDetailDialog } from "./PostCallJobDetailDialog";
import {
	POST_CALL_TERMINAL,
	PostCallJobTipCard,
} from "./PostCallJobTipCard";

export type PostCallJobTipProps = {
	jobs: DebuggerPostCallJobView[];
	loading?: boolean;
	error?: string;
	/** 重试 failed_retryable job；由 bis 注入 */
	onRetry?: (jobId: string) => void;
	/** 重试请求进行中 */
	retryingJobId?: string | null;
};

export const PostCallJobTip: FC<PostCallJobTipProps> = function PostCallJobTip({
	// jobs 表示当前用户挂机副作用列表，用于右下角 tip
	jobs,
	// loading 表示轮询请求中，用于同步态文案
	loading,
	// error 表示轮询失败人话，用于错误提示
	error,
	// onRetry 表示详情内一键重试回调，用于失败可重试 job
	onRetry,
	// retryingJobId 表示正在重试的 job，用于禁用重试按钮
	retryingJobId,
}) {
	const [selected, setSelected] = useState<DebuggerPostCallJobView | null>(null);
	const active = jobs.filter((job) => !POST_CALL_TERMINAL.has(job.status));
	if (active.length === 0 && !loading && !error) return null;

	const selectedLive =
		selected === null
			? null
			: (jobs.find((job) => job.jobId === selected.jobId) ?? selected);

	return (
		<>
			{/* 引用了Box组件，用于固定右下角 tip 容器 */}
			<Box
				sx={{
					position: "fixed",
					right: 16,
					bottom: 16,
					zIndex: 1400,
					width: 320,
					display: "flex",
					flexDirection: "column",
					gap: 1,
				}}
			>
				{active.map((job) => (
					// 引用了PostCallJobTipCard组件，用于单条副作用 tip
					<PostCallJobTipCard
						key={job.jobId}
						job={job}
						onSelect={setSelected}
					/>
				))}
				{loading ? (
					// 引用了Typography组件，用于轮询中提示
					<Typography variant="caption" sx={{ color: "#dbeafe" }}>
						同步副作用状态…
					</Typography>
				) : null}
				{error ? (
					// 引用了Typography组件，用于轮询失败提示
					<Typography variant="caption" sx={{ color: "#fca5a5" }}>
						{error}
					</Typography>
				) : null}
			</Box>
			{/* 引用了PostCallJobDetailDialog组件，用于副作用详情 */}
			<PostCallJobDetailDialog
				job={selectedLive}
				onClose={() => setSelected(null)}
				onRetry={onRetry}
				retryingJobId={retryingJobId}
			/>
		</>
	);
};
