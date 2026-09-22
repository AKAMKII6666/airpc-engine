/**
	* 调试器 L2 插件状态面板：已加载包 / 失败原因。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import { usePluginStatusBis } from "@studio-v2/src/bis/pageBis/plugins/pluginStatus.bis";

/**
	* 展示已加载插件与失败原因（数据经 bis）。
	*/
export const DebuggerPluginsPanel: FC = function DebuggerPluginsPanel() {
	const { status, loading, error } = usePluginStatusBis();

	if (error) {
		return (
			// 引用了Typography组件，用于错误提示
			<Typography variant="body2" color="error">
				{error}
			</Typography>
		);
	}
	if (loading || !status) {
		return (
			// 引用了Typography组件，用于加载中提示
			<Typography variant="body2" color="text.secondary">
				加载插件状态…
			</Typography>
		);
	}

	return (
		<div>
			{/* 引用了Typography组件，用于已加载标题 */}
			<Typography variant="subtitle2" gutterBottom>
				已加载（{status.loaded.length}）
			</Typography>
			{status.loaded.map(function (p) {
				return (
					// 引用了Typography组件，用于单个已加载包行
					<Typography key={p.pluginId} variant="body2">
						{p.pluginId}@{p.version} · {p.slots.join(", ") || "(no slots)"}
					</Typography>
				);
			})}
			{/* 引用了Typography组件，用于失败标题 */}
			<Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
				失败（{status.failures.length}）
			</Typography>
			{status.failures.length === 0 ? (
				// 引用了Typography组件，用于无失败空态
				<Typography variant="body2" color="text.secondary">
					无
				</Typography>
			) : (
				status.failures.map(function (f, i) {
					return (
						// 引用了Typography组件，用于单条失败原因
						<Typography
							key={`${f.pluginId ?? "x"}-${i}`}
							variant="body2"
							color="error"
						>
							{f.pluginId ?? f.dirName ?? "?"}：{f.reason}
						</Typography>
					);
				})
			)}
		</div>
	);
};
