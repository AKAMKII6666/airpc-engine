/**
	* L2 插件面板宿主：iframe 托管 settings/character/user.plugin。
	* 面板数据由 feature bis 注入；本组件不发网络请求。
	*/
"use client";

import { Box, Typography } from "@mui/material";
import type { PluginPanelView } from "@studio-v2/typeFiles/plugins/pluginPanels";

export type PluginPanelHostProps = {
	/** 目标 UI 槽 */
	slot: PluginPanelView["slot"];
	/** 已由 bis 拉取的面板列表 */
	panels: readonly PluginPanelView[];
	/** 加载中 */
	loading?: boolean;
	/** 错误人话 */
	error?: string;
};

/**
	* 展示某槽下全部插件 iframe；无面板时给空态。
	*/
export function PluginPanelHost({
	// slot 表示目标 UI 槽名，用于空态文案
	slot,
	// panels 表示 bis 已拉取的面板列表，用于渲染 iframe
	panels,
	// loading 表示列表加载中，用于显示加载提示
	loading,
	// error 表示拉取失败人话，用于错误提示
	error,
}: PluginPanelHostProps) {
	if (loading) {
		return (
			// 引用了Typography组件，用于加载中提示
			<Typography variant="body2" color="text.secondary">
				加载插件面板…
			</Typography>
		);
	}
	if (error) {
		return (
			// 引用了Typography组件，用于错误提示
			<Typography variant="body2" color="error">
				{error}
			</Typography>
		);
	}
	if (panels.length === 0) {
		return (
			// 引用了Typography组件，用于空态提示
			<Typography variant="body2" color="text.secondary">
				暂无 {slot} 插件面板
			</Typography>
		);
	}
	return (
		// 引用了Box组件，用于面板纵向列表容器
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{panels.map(function (panel) {
				return (
					// 引用了Box组件，用于单个插件面板块
					<Box key={`${panel.pluginId}:${panel.entry}`}>
						{/* 引用了Typography组件，用于面板标题 */}
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							{panel.title}
						</Typography>
						{/* 引用了Box组件，用于插件 UI iframe（sandbox 限制同源能力） */}
						<Box
							component="iframe"
							title={panel.title}
							src={panel.src}
							sandbox="allow-scripts"
							sx={{
								width: "100%",
								minHeight: 180,
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
							}}
						/>
					</Box>
				);
			})}
		</Box>
	);
}
