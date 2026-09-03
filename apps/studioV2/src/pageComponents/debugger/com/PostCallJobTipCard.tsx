/**
	* PostCallJob tip 卡片与状态文案。
	*/
"use client";

import type { FC } from "react";
import { LinearProgress, Paper, Stack, Typography } from "@mui/material";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";

export const POST_CALL_TERMINAL = new Set([
	"completed",
	"completed_with_errors",
	"aborted_non_retryable",
]);

export const POST_CALL_STATUS_LABEL: Record<string, string> = {
	closing: "同步收尾",
	committed: "已提交",
	background_pending: "排队中",
	memory_committing: "记忆抽取",
	rollup_running: "记忆汇总",
	media_running: "媒介播放",
	voicemail_running: "留言生成",
	failed_retryable: "失败可重试",
	completed: "已完成",
	completed_with_errors: "完成(有错)",
};

export type PostCallJobTipCardProps = {
	job: DebuggerPostCallJobView;
	onSelect: (job: DebuggerPostCallJobView) => void;
};

export const PostCallJobTipCard: FC<PostCallJobTipCardProps> =
	function PostCallJobTipCard({
		// job 表示单条副作用 job，用于 tip 卡片展示
		job,
		// onSelect 表示选中回调，用于打开详情弹层
		onSelect,
	}) {
		const runningSteps = job.steps
			.filter((step) => step.status === "running")
			.map((step) => step.id);
		const label = POST_CALL_STATUS_LABEL[job.status] ?? job.status;
		const isFailed = job.status === "failed_retryable";
		return (
			// 引用了Paper组件，用于单条副作用 tip 卡片
			<Paper
				variant="outlined"
				sx={{
					p: 1.5,
					cursor: "pointer",
					bgcolor: isFailed
						? "rgba(127,29,29,0.95)"
						: "rgba(17,24,39,0.96)",
					color: "#f8fafc",
				}}
				onClick={() => onSelect(job)}
			>
				{/* 引用了Stack组件，用于 tip 卡片内纵向排版 */}
				<Stack spacing={0.5}>
					{/* 引用了Typography组件，用于展示角色与状态摘要 */}
					<Typography variant="caption">
						{job.primaryAgentId} · {label}
					</Typography>
					{!isFailed ? (
						// 引用了LinearProgress组件，用于展示任务进行中
						<LinearProgress color="inherit" />
					) : null}
					{/* 引用了Typography组件，用于展示运行步骤或失败引导 */}
					<Typography variant="caption" sx={{ opacity: 0.7 }}>
						{isFailed ? "点击查看并重试" : runningSteps.join(", ") || label}
					</Typography>
				</Stack>
			</Paper>
		);
	};
