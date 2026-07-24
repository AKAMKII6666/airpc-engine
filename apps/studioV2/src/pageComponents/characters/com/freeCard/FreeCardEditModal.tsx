/**
	* Free 卡编辑弹层：加载态 + 就绪 FormModal；真源 characters/free-cards。
	*/
"use client";

import { useEffect, useState, type FC } from "react";
import { Alert, CircularProgress, Box } from "@mui/material";
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import type { FreeCardFormValues } from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";
import { loadFreeCardEditor } from "@studio-v2/src/bis/pageBis/characters/freeCard/saveFreeCard_bis";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
// 引用了FreeCardEditReady组件，用于已加载态编辑与预览
import { FreeCardEditReady } from "./FreeCardEditReady";

export type FreeCardEditModalProps = {
	open: boolean;
	freeCardId: string;
	onClose: () => void;
	onSaved?: () => void;
};

type LoadState =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; card: CallCardDefinition; initial: FreeCardFormValues };

export const FreeCardEditModal: FC<FreeCardEditModalProps> =
	function FreeCardEditModal({
		// open 表示弹层是否打开，用于显隐控制
		open,
		// freeCardId 表示磁盘卡键，用于 GET/PUT free-cards
		freeCardId,
		// onClose 用于关闭弹层
		onClose,
		// onSaved 用于保存成功后可选刷新列表
		onSaved,
	}) {
		const [load, setLoad] = useState<LoadState>({ status: "idle" });

		useEffect(
			function () {
				if (!open || !freeCardId) return;
				let cancelled = false;
				setLoad({ status: "loading" });
				void loadFreeCardEditor(freeCardId)
					.then(function (result) {
						if (cancelled) return;
						setLoad({
							status: "ready",
							card: result.card,
							initial: result.formValues,
						});
					})
					.catch(function (err: unknown) {
						if (cancelled) return;
						setLoad({
							status: "error",
							message:
								err instanceof Error
									? err.message
									: String(err),
						});
					});
				return function () {
					cancelled = true;
				};
			},
			[open, freeCardId],
		);

		if (!open) return null;

		if (load.status === "ready") {
			return (
				// 引用了FreeCardEditReady组件，用于已加载态编辑与预览
				<FreeCardEditReady
					open={open}
					freeCardId={freeCardId}
					card={load.card}
					initial={load.initial}
					onClose={onClose}
					onSaved={onSaved}
				/>
			);
		}

		return (
			// 引用了AppModal组件，用于 Free 卡加载/错误态
			<AppModal
				open={open}
				title="编辑自由通话卡"
				description={`真源 data/characters/free-cards/${freeCardId}.s-card.json`}
				onClose={onClose}
				maxWidth="sm"
			>
				{load.status === "loading" || load.status === "idle" ? (
					// 引用了Box组件，用于居中放置加载指示
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						{/* 引用了CircularProgress组件，用于加载 Free 卡 */}
						<CircularProgress size={28} />
					</Box>
				) : (
					// 引用了Alert组件，用于加载失败提示
					<Alert severity="error">{load.message}</Alert>
				)}
			</AppModal>
		);
	};
