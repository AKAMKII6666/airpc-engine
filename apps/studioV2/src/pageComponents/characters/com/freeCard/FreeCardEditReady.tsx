/**
	* Free 卡已加载态：FormModal + 首通预览；从 FreeCardEditModal 拆出。
	*/
"use client";

import { useCallback, useState, type FC } from "react";
import { Button } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
// 引用了FirstConnectPromptPreviewModal组件，用于首通提示词预览
import { FirstConnectPromptPreviewModal } from "@studio-v2/src/commonUiComponents/promptPreview/FirstConnectPromptPreviewModal";
import {
	applyFreeCardForm,
	validateFreeCardForm,
	type FreeCardFormValues,
} from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";
import { commitSaveFreeCard } from "@studio-v2/src/bis/pageBis/characters/freeCard/saveFreeCard_bis";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import { renderFreeCardFormBody } from "./FreeCardFormBody";

export type FreeCardEditReadyProps = {
	open: boolean;
	freeCardId: string;
	card: CallCardDefinition;
	initial: FreeCardFormValues;
	onClose: () => void;
	onSaved?: () => void;
};

export const FreeCardEditReady: FC<FreeCardEditReadyProps> = function ({
	// open 表示弹层是否打开，用于显隐
	open,
	// freeCardId 表示磁盘卡键，用于说明文案
	freeCardId,
	// card 表示已加载卡定义，用于合并与保存
	card,
	// initial 表示表单初值，用于 Formik
	initial,
	// onClose 用于关闭弹层
	onClose,
	// onSaved 用于保存成功后可选刷新
	onSaved,
}) {
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewCard, setPreviewCard] = useState<unknown>(null);

	const handleSubmit = useCallback(
		async function (values: FreeCardFormValues): Promise<void> {
			await commitSaveFreeCard(card, values);
			onSaved?.();
			onClose();
		},
		[card, onClose, onSaved],
	);

	return (
		<>
			{/* 引用了FormModal组件，用于编辑并保存 Free 卡 */}
			<FormModal
				open={open}
				title="编辑自由通话卡"
				description={`真源 data/characters/free-cards/${freeCardId}.s-card.json。能力开关对应 toolPolicy；主动挂机为壳钩子预留。`}
				onClose={onClose}
				initialValues={initial}
				validate={validateFreeCardForm}
				onSubmit={handleSubmit}
				submitLabel="保存自由通话卡"
				mode="edit"
				maxWidth="md"
			>
				{(formik) => (
					<>
						{renderFreeCardFormBody(formik)}
						{/* 引用了Button组件，用于打开首通提示词预览 */}
						<Button
							sx={{ mt: 2 }}
							variant="outlined"
							size="small"
							onClick={function () {
								setPreviewCard(
									applyFreeCardForm(card, formik.values),
								);
								setPreviewOpen(true);
							}}
						>
							首通提示词预览
						</Button>
					</>
				)}
			</FormModal>

			{/* 引用了FirstConnectPromptPreviewModal组件，用于 Free 卡首通预览 */}
			<FirstConnectPromptPreviewModal
				open={previewOpen}
				onClose={function () {
					setPreviewOpen(false);
				}}
				card={previewCard}
				packageId="__free__"
				title="首通提示词预览（Free 卡）"
			/>
		</>
	);
};
