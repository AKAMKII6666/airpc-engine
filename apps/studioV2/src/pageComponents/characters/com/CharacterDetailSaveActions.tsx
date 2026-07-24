/**
	* 详情页底部：保存角色 JSON + 编辑自由通话卡入口。
	*/
"use client";

import type { FC } from "react";
import { Button, Stack, Typography } from "@mui/material";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type CharacterDetailSaveActionsProps = {
	character: CharacterSummary;
	/** 角色 JSON 提交中 */
	submitting: boolean;
	/** 打开 Free 卡弹窗 */
	onOpenFreeCard: () => void;
};

export const CharacterDetailSaveActions: FC<CharacterDetailSaveActionsProps> =
	function CharacterDetailSaveActions({
		// character 是当前角色摘要，用于判断是否可编辑 Free 卡
		character,
		// submitting 表示角色表单提交中，用于禁用保存按钮
		submitting,
		// onOpenFreeCard 是打开 Free 卡弹窗的回调，用于点击「编辑自由通话卡」
		onOpenFreeCard,
	}) {
		const canEditFreeCard =
			character.kind !== "support" &&
			typeof character.freeCardId === "string" &&
			character.freeCardId.length > 0;

		return (
			<div className={styles.section}>
				{/* 引用了Stack组件，用于保存角色与编辑 Free 卡并排 */}
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					{/* 引用了Button组件，用于提交并落盘角色 JSON */}
					<Button type="submit" variant="contained" disabled={submitting}>
						保存到角色 JSON
					</Button>
					{canEditFreeCard ? (
						// 引用了Button组件，用于打开自由通话卡编辑弹窗
						<Button type="button" variant="outlined" onClick={onOpenFreeCard}>
							编辑自由通话卡
						</Button>
					) : null}
				</Stack>
				{character.kind === "support" ? (
					// 引用了Typography组件，用于说明 narrative-only 无 Free 卡
					<Typography
						variant="caption"
						color="text.secondary"
						display="block"
						sx={{ mt: 1 }}
					>
						叙事支援角色不挂自由通话卡
					</Typography>
				) : null}
				{character.kind !== "support" && !canEditFreeCard ? (
					// 引用了Typography组件，用于历史缺卡提示
					<Typography
						variant="caption"
						color="warning.main"
						display="block"
						sx={{ mt: 1 }}
					>
						尚未绑定 freeCardId；请重新保存创建或补绑后刷新
					</Typography>
				) : null}
			</div>
		);
	};
