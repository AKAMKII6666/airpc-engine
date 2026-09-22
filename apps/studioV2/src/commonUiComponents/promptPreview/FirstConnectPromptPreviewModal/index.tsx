/**
	* 首通提示词预览弹层：接通方式 / 本地小时 → 渲染 Composer+tools+Adapter 载荷。
	* store / ajax 只经 feature bis。
	*/
"use client";

import type { FC } from "react";
// 引用了AppModal组件，用于预览弹层壳
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
// 引用了FirstConnectPromptPreviewActions组件，用于关闭/渲染按钮
import { FirstConnectPromptPreviewActions } from "./com/FirstConnectPromptPreviewActions";
// 引用了FirstConnectPromptPreviewBody组件，用于控制区与结果
import { FirstConnectPromptPreviewBody } from "./com/FirstConnectPromptPreviewBody";
// 引用了FirstConnectPromptPreviewGate组件，用于无玩家硬门禁
import { FirstConnectPromptPreviewGate } from "./com/FirstConnectPromptPreviewGate";
import { useFirstConnectPromptPreviewBis } from "@studio-v2/src/bis/pageBis/storyEditor/promptPreview/firstConnectPromptPreview.bis";
import { useFirstConnectPromptPreviewModalState } from "./hooks/useFirstConnectPromptPreviewModalState";

export type FirstConnectPromptPreviewModalProps = {
	open: boolean;
	onClose: () => void;
	card: unknown;
	packageId?: string;
	title?: string;
};

export const FirstConnectPromptPreviewModal: FC<
	FirstConnectPromptPreviewModalProps
> = function FirstConnectPromptPreviewModal({
	// open 表示弹层是否打开，用于显隐
	open,
	// onClose 用于关闭预览
	onClose,
	// card 表示草稿卡 JSON，用于渲染请求
	card,
	// packageId 表示故事章 chapterId（Free 可省略），用于渲染请求
	packageId,
	// title 表示弹层标题，用于展示
	title = "首通提示词预览",
}) {
	const preview = useFirstConnectPromptPreviewBis();
	const gate = useFirstConnectPromptPreviewModalState({
		open,
		resetResult: preview.resetResult,
	});

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
					// 引用了FirstConnectPromptPreviewActions组件，用于关闭/渲染按钮
					<FirstConnectPromptPreviewActions
						busy={preview.busy}
						onClose={onClose}
						onRender={function () {
							void preview
								.renderPreview({ card, packageId })
								.then(function (ok) {
									if (!ok) gate.openGate();
								});
						}}
					/>
				}
			>
				{/* 引用了FirstConnectPromptPreviewBody组件，用于控制区与结果 */}
				<FirstConnectPromptPreviewBody
					hasUser={preview.hasUser}
					userLabel={preview.userLabel}
					userId={preview.userId}
					callDirection={preview.callDirection}
					localHour={preview.localHour}
					error={preview.error}
					result={preview.result}
					onSwitchUser={gate.openGate}
					onCallDirectionChange={preview.setCallDirection}
					onLocalHourChange={preview.setLocalHour}
				/>
			</AppModal>
			{/* 引用了FirstConnectPromptPreviewGate组件，用于无玩家硬门禁 */}
			<FirstConnectPromptPreviewGate
				open={preview.sessionReady && gate.gateOpen}
				userId={preview.userId}
				onClose={gate.closeGate}
			/>
		</>
	);
};
