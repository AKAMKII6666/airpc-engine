/**
 * 挂机后副作用 tip：右下角非阻塞提示，点击打开详情；失败可一键重试。
 */
"use client";

import { useState, type FC } from "react";
import {
	Box,
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";

const TERMINAL = new Set([
	"completed",
	"completed_with_errors",
	"aborted_non_retryable",
]);

const STATUS_LABEL: Record<string, string> = {
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
	// jobs 当前用户挂机副作用列表
	jobs,
	// loading 轮询请求中
	loading,
	// error 轮询失败人话
	error,
	// onRetry 详情内一键重试
	onRetry,
	// retryingJobId 正在重试的 job
	retryingJobId,
}) {
	const [selected, setSelected] = useState<DebuggerPostCallJobView | null>(null);
	const active = jobs.filter(function (job) {
		return !TERMINAL.has(job.status);
	});
	if (active.length === 0 && !loading && !error) return null;

	const selectedLive =
		selected === null
			? null
			: (jobs.find(function (job) {
					return job.jobId === selected.jobId;
				}) ?? selected);

	return (
		<>
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
				{active.map(function (job) {
					const runningSteps = job.steps
						.filter((step) => step.status === "running")
						.map((step) => step.id);
					const label = STATUS_LABEL[job.status] ?? job.status;
					const isFailed = job.status === "failed_retryable";
					return (
						<Paper
							key={job.jobId}
							variant="outlined"
							sx={{
								p: 1.5,
								cursor: "pointer",
								bgcolor: isFailed
									? "rgba(127,29,29,0.95)"
									: "rgba(17,24,39,0.96)",
								color: "#f8fafc",
							}}
							onClick={() => setSelected(job)}
						>
							<Stack spacing={0.5}>
								<Typography variant="caption">
									{job.primaryAgentId} · {label}
								</Typography>
								{!isFailed ? <LinearProgress color="inherit" /> : null}
								<Typography variant="caption" sx={{ opacity: 0.7 }}>
									{isFailed
										? "点击查看并重试"
										: runningSteps.join(", ") || label}
								</Typography>
							</Stack>
						</Paper>
					);
				})}
				{loading ? (
					<Typography variant="caption" sx={{ color: "#dbeafe" }}>
						同步副作用状态…
					</Typography>
				) : null}
				{error ? (
					<Typography variant="caption" sx={{ color: "#fca5a5" }}>
						{error}
					</Typography>
				) : null}
			</Box>

			<Dialog
				open={selectedLive !== null}
				onClose={() => setSelected(null)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>
					副作用执行详情 · {selectedLive?.primaryAgentId}
				</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={1}>
						<Typography variant="body2">jobId: {selectedLive?.jobId}</Typography>
						<Typography variant="body2">
							status: {selectedLive?.status}
							{selectedLive
								? `（${STATUS_LABEL[selectedLive.status] ?? selectedLive.status}）`
								: ""}
						</Typography>
						<Typography variant="body2">
							session: {selectedLive?.sessionId}
						</Typography>
						{selectedLive?.steps.map(function (step) {
							return (
								<Typography key={step.id} variant="body2">
									{step.id}: {step.status}
									{step.detail ? ` · ${step.detail}` : ""}
								</Typography>
							);
						})}
						{selectedLive?.failedSteps.map(function (failed) {
							return (
								<Typography
									key={failed.stepId}
									variant="body2"
									sx={{ color: "#b91c1c" }}
								>
									{failed.stepId}: {failed.error}
								</Typography>
							);
						})}
						<Stack direction="row" spacing={1}>
							{selectedLive?.status === "failed_retryable" && onRetry ? (
								<Button
									variant="contained"
									disabled={retryingJobId === selectedLive.jobId}
									onClick={function () {
										onRetry(selectedLive.jobId);
									}}
								>
									{retryingJobId === selectedLive.jobId ? "重试中…" : "重试"}
								</Button>
							) : null}
							<Button onClick={() => setSelected(null)}>关闭</Button>
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		</>
	);
};
