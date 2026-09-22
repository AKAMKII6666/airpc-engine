/**
	* 首通预览弹层内容：控制区 + 错误 + 结果面板。
	*/
"use client";

import type { FC } from "react";
import { Alert } from "@mui/material";
import type {
	PromptPreviewCallDirection,
	PromptPreviewResult,
} from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";
// 引用了PromptPreviewControls组件，用于方向/小时控制
import { PromptPreviewControls } from "../PromptPreviewControls";
// 引用了PromptPreviewResultPanels组件，用于渲染结果区
import { PromptPreviewResultPanels } from "../PromptPreviewResultPanels";

export type FirstConnectPromptPreviewBodyProps = {
	hasUser: boolean;
	userLabel: string;
	userId: string;
	callDirection: PromptPreviewCallDirection;
	localHour: number;
	error: string | undefined;
	result: PromptPreviewResult | null;
	onSwitchUser: () => void;
	onCallDirectionChange: (d: PromptPreviewCallDirection) => void;
	onLocalHourChange: (h: number) => void;
};

export const FirstConnectPromptPreviewBody: FC<
	FirstConnectPromptPreviewBodyProps
> = function FirstConnectPromptPreviewBody({
	// hasUser 表示是否已选玩家
	hasUser,
	// userLabel 表示玩家展示名
	userLabel,
	// userId 表示玩家 id
	userId,
	// callDirection 表示接通方式
	callDirection,
	// localHour 表示本地小时
	localHour,
	// error 表示渲染失败人话
	error,
	// result 表示渲染结果投影
	result,
	// onSwitchUser 打开 UserGate
	// onSwitchUser 是组件入参，用于渲染与交互
	onSwitchUser,
	// onCallDirectionChange 改接通方式
	// onCallDirectionChange 是组件入参，用于渲染与交互
	onCallDirectionChange,
	// onLocalHourChange 改本地小时
	// onLocalHourChange 是组件入参，用于渲染与交互
	onLocalHourChange,
}) {
	return (
		<>
			{/* 引用了PromptPreviewControls组件，用于方向/小时控制 */}
			<PromptPreviewControls
				hasUser={hasUser}
				userLabel={userLabel}
				userId={userId}
				callDirection={callDirection}
				localHour={localHour}
				onSwitchUser={onSwitchUser}
				onCallDirectionChange={onCallDirectionChange}
				onLocalHourChange={onLocalHourChange}
			/>
			{error ? (
				// 引用了Alert组件，用于渲染失败
				<Alert severity="error">{error}</Alert>
			) : null}
			{/* 引用了PromptPreviewResultPanels组件，用于渲染结果区 */}
			<PromptPreviewResultPanels result={result} />
		</>
	);
};
