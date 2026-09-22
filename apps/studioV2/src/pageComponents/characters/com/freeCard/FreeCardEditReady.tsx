/**
	* Free 卡已加载态：FormModal + 首通预览；从 FreeCardEditModal 拆出。
	*/
"use client";

import { useCallback, useState, type FC } from "react";
import { Alert, Button, LinearProgress } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
// 引用了FirstConnectPromptPreviewModal组件，用于首通提示词预览
import { FirstConnectPromptPreviewModal } from "@studio-v2/src/commonUiComponents/promptPreview/FirstConnectPromptPreviewModal";
import {
	applyFreeCardForm,
	validateFreeCardForm,
	type FreeCardFormValues,
} from "@studio-v2/src/bis/pageBis/characters/freeCard/form/freeCardForm";
import { commitSaveFreeCard } from "@studio-v2/src/bis/pageBis/characters/freeCard/save/saveFreeCard_bis";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import { renderFreeCardFormBody } from "./FreeCardFormBody";
import { useToolCatalogBis } from "@studio-v2/src/bis/pageBis/tools/toolCatalog.bis";
import { projectToolCatalogChoices } from "@studio-v2/src/bis/pageBis/tools/toolCatalogProjection";

export type FreeCardEditReadyProps = {
	open: boolean;
	freeCardId: string;
	card: CallCardDefinition;
	initial: FreeCardFormValues;
	onClose: () => void;
	onSaved?: () => void;
};

function renderFreeCardEditorFields(input: {
	formik: Parameters<typeof renderFreeCardFormBody>[0];
	catalog: ReturnType<typeof useToolCatalogBis>["catalog"];
	loading: boolean;
	error: string | null | undefined;
	card: CallCardDefinition;
	setPreviewCard: (card: unknown) => void;
	setPreviewOpen: (open: boolean) => void;
}) {
	const choices = projectToolCatalogChoices({
		catalog: input.catalog,
		storedIds: input.formik.values.allowedToolIds,
		mode: input.formik.values.toolPolicyMode,
	});
	return (
		<>
			{/* 引用了LinearProgress组件，用于展示动态工具目录加载态 */}
			{input.loading ? <LinearProgress /> : null}
			{input.error ? (
				// 引用了Alert组件，用于展示工具目录加载失败
				<Alert severity="error">工具目录加载失败：{input.error}</Alert>
			) : null}
			{renderFreeCardFormBody(
				input.formik,
				choices.options,
				choices.effectiveToolIds,
			)}
			{/* 引用了Button组件，用于打开首通提示词预览 */}
			<Button
				sx={{ mt: 2 }}
				variant="outlined"
				size="small"
				onClick={function () {
					input.setPreviewCard(applyFreeCardForm(input.card, input.formik.values));
					input.setPreviewOpen(true);
				}}
			>
				首通提示词预览
			</Button>
		</>
	);
}

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
	const { catalog, loading, error } = useToolCatalogBis({
		agentId: card.ownerAgentId,
		cardKind: "free",
		interactionMode: card.interactionMode ?? "realtime_dialogue",
	});

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
				description={`真源 data/characters/free-cards/${freeCardId}.s-card.json。工具目录来自服务端 Registry，主动挂机与插件 FC 均由 toolPolicy 控制。`}
				onClose={onClose}
				initialValues={initial}
				validate={validateFreeCardForm}
				onSubmit={handleSubmit}
				submitLabel="保存自由通话卡"
				mode="edit"
				maxWidth="md"
			>
				{(formik) =>
					renderFreeCardEditorFields({
						formik,
						catalog,
						loading,
						error,
						card,
						setPreviewCard,
						setPreviewOpen,
					})
				}
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
