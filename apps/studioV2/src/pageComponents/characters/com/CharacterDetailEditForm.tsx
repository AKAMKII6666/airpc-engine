/**
	* 角色详情 Formik 表单体：按需求 §4 用 AutoForm items[] 编排。
	* 编辑态展示字段全必填；去掉与引擎脱节的扁平 mock 字段。
	*/
"use client";

import { useState, type FC } from "react";
import { Alert, Typography } from "@mui/material";
import type { FormikProps } from "formik";
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import {
	CHARACTER_BASIC_ITEMS,
	CHARACTER_PROMPT_ITEMS,
	type CharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { withAvatarUploadItems } from "@studio-v2/src/bis/pageBis/assets/withAvatarUploadItems";
// 引用了CharacterSchedulePanel组件，用于场景提示词下方的定时外呼
import { CharacterSchedulePanel } from "@studio-v2/src/pageComponents/characters/com/schedule/CharacterSchedulePanel";
// 引用了CharacterDetailSaveActions组件，用于保存角色与编辑 Free 卡
import { CharacterDetailSaveActions } from "@studio-v2/src/pageComponents/characters/com/CharacterDetailSaveActions";
// 引用了FreeCardEditModal组件，用于编辑角色绑定的自由通话卡
import { FreeCardEditModal } from "@studio-v2/src/pageComponents/characters/com/freeCard/FreeCardEditModal";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

const BASIC_ITEMS_WITH_AVATAR_UPLOAD = withAvatarUploadItems(CHARACTER_BASIC_ITEMS);
export type CharacterDetailEditFormProps = {
	character: CharacterSummary;
	formik: FormikProps<CharacterDetailFormValues>;
};

function readFormError(
	status: FormikProps<CharacterDetailFormValues>["status"],
): string | undefined {
	if (
		typeof status === "object" &&
		status !== null &&
		"formError" in status &&
		typeof (status as { formError?: unknown }).formError === "string"
	) {
		return (status as { formError: string }).formError;
	}
	return undefined;
}

export const CharacterDetailEditForm: FC<CharacterDetailEditFormProps> =
	function CharacterDetailEditForm({
		// character 是当前角色摘要，用于只读引用区与 agentId 展示
		character,
		// formik 是详情页持有的 Formik 实例，用于 AutoForm 字段自动绑
		formik,
	}) {
		const formError = readFormError(formik.status);
		const [freeCardOpen, setFreeCardOpen] = useState(false);

		return (
			<form onSubmit={formik.handleSubmit} noValidate>
				{formError ? (
					// 引用了Alert组件，用于展示提交级错误
					<Alert severity="error" role="alert">
						{formError}
					</Alert>
				) : null}

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>基本信息</h3>
					{/* 引用了AutoForm组件，用于编排头像与基本信息字段 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={BASIC_ITEMS_WITH_AVATAR_UPLOAD}
					/>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>提示词</h3>
					{/* 引用了AutoForm组件，用于编排人设与场景提示词字段 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={CHARACTER_PROMPT_ITEMS}
					/>
				</div>

				{/* 引用了CharacterSchedulePanel组件，用于场景提示词下方定时外呼 */}
				<CharacterSchedulePanel agentId={character.agentId} />

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>引用情况</h3>
					{character.referenceLines.length === 0 ? (
						// 引用了Typography组件，用于无引用空态
						<Typography variant="body2" color="text.secondary">
							尚未被故事包引用
						</Typography>
					) : (
						<ul className={styles.refList}>
							{character.referenceLines.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					)}
				</div>

				<div className={styles.advanced}>
					<h3 className={styles.sectionTitle}>高级信息</h3>
					<div className={styles.advancedId}>agentId · {character.agentId}</div>
					{/* 引用了Typography组件，用于只读展示头像资源 id */}
					<Typography variant="caption" className={styles.detailMeta}>
						头像资源：
						{character.avatarAssetId ?? "默认头像（无破图）"}
					</Typography>
				</div>

				{/* 引用了CharacterDetailSaveActions组件，用于保存与 Free 卡入口 */}
				<CharacterDetailSaveActions
					character={character}
					submitting={formik.isSubmitting}
					onOpenFreeCard={function () {
						setFreeCardOpen(true);
					}}
				/>

				{character.freeCardId ? (
					// 引用了FreeCardEditModal组件，用于编辑自由通话卡内容与能力开关
					<FreeCardEditModal
						open={freeCardOpen}
						freeCardId={character.freeCardId}
						onClose={function () {
							setFreeCardOpen(false);
						}}
					/>
				) : null}
			</form>
		);
	};
