/**
	* 首通提示词预览弹层：接通方式 / 本地小时 → 渲染 Composer+tools+Adapter 载荷。
	* store / ajax 只经 feature bis。
	*/
"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
// 引用了AppModal组件，用于预览弹层壳
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
// 引用了UserGate组件，用于无玩家时硬门禁
import { UserGate } from "@studio-v2/src/commonUiComponents/userGate/UserGate";
// 引用了PromptPreviewControls组件，用于方向/小时控制
import { PromptPreviewControls } from "./com/PromptPreviewControls";
// 引用了PromptPreviewResultPanels组件，用于渲染结果区
import { PromptPreviewResultPanels } from "./com/PromptPreviewResultPanels";
import { useFirstConnectPromptPreviewBis } from "@studio-v2/src/bis/pageBis/storyEditor/promptPreview/firstConnectPromptPreview.bis";

export type FirstConnectPromptPreviewModalProps = {
	open: boolean;
	onClose: () => void;
	card: unknown;
	packageId?: string;
	title?: string;
};

export const FirstConnectPromptPreviewModal: FC<
	FirstConnectPromptPreviewModalProps
> = function (props) {
	// open 表示弹层是否打开，用于显隐
	const { open } = props;
	// onClose 用于关闭预览
	const { onClose } = props;
	// card 表示草稿卡 JSON，用于渲染请求
	const { card } = props;
	// packageId 表示故事包键，用于渲染请求
	const { packageId } = props;
	// title 表示弹层标题，用于展示
	const { title = "首通提示词预览" } = props;

	const preview = useFirstConnectPromptPreviewBis();
	const [gateOpen, setGateOpen] = useState(false);

	useEffect(
		function () {
			if (open) preview.resetResult();
		},
		[open, preview.resetResult],
	);

	return (
		<>
			{/* 引用了AppModal组件，用于预览弹层壳 */}
			<AppModal
				open={open}
				title={title}
				description="编辑期观测：按当前草稿卡 + 当前玩家 Memory/Lore 渲染首通 LLM 载荷（不建通话会话）。"
				onClose={onClose}
				busy={preview.busy}
				maxWidth="lg"
				actions={
					<>
						{/* 引用了Button组件，用于关闭 */}
						<Button onClick={onClose} disabled={preview.busy}>
							关闭
						</Button>
						{/* 引用了Button组件，用于触发渲染 */}
						<Button
							variant="contained"
							disabled={preview.busy}
							onClick={function () {
								void preview
									.renderPreview({ card, packageId })
									.then(function (ok) {
										if (!ok) setGateOpen(true);
									});
							}}
						>
							渲染提示词
						</Button>
					</>
				}
			>
				{/* 引用了PromptPreviewControls组件，用于方向/小时控制 */}
				<PromptPreviewControls
					hasUser={preview.hasUser}
					userLabel={preview.userLabel}
					userId={preview.userId}
					callDirection={preview.callDirection}
					localHour={preview.localHour}
					onSwitchUser={function () {
						setGateOpen(true);
					}}
					onCallDirectionChange={preview.setCallDirection}
					onLocalHourChange={preview.setLocalHour}
				/>

				{preview.error ? (
					// 引用了Alert组件，用于渲染失败
					<Alert severity="error">{preview.error}</Alert>
				) : null}

				{/* 引用了PromptPreviewResultPanels组件，用于渲染结果区 */}
				<PromptPreviewResultPanels result={preview.result} />
			</AppModal>

			{/* 引用了UserGate组件，用于无玩家时硬门禁 */}
			<UserGate
				open={gateOpen}
				currentUserId={preview.userId}
				allowDismissWhenSelected
				onClose={function () {
					setGateOpen(false);
				}}
				onSelected={function () {
					setGateOpen(false);
				}}
				title="选择玩家（提示词预览需要 Memory 上下文）"
			/>
		</>
	);
};
