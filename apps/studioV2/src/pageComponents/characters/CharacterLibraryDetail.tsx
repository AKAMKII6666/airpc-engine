/**
	* 角色库详情：按需求 §4 用 AutoForm 编排；保存经 API 写盘。
	* 记忆区只读，见 CharacterMemoryPanel。
	*/
"use client";

import type { FC } from "react";
import { Formik, type FormikHelpers } from "formik";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import {
	toCharacterDetailFormValues,
	validateCharacterDetailForm,
	type CharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { commitSaveCharacterDetail } from "@studio-v2/src/bis/pageBis/characters/detail/save/saveCharacter_bis";
import { CharacterDetailEditForm } from "@studio-v2/src/pageComponents/characters/com/CharacterDetailEditForm";
import { CharacterMemoryPanel } from "@studio-v2/src/pageComponents/characters/com/CharacterMemoryPanel";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function initialOf(name: string): string {
	return name.slice(0, 1);
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "保存失败，请稍后重试";
}

export type CharacterLibraryDetailProps = {
	character: CharacterSummary;
	/**
		* 落盘成功后回调，供列表与选中态同步。
		*/
	onSaved: (next: CharacterSummary) => void;
};

export const CharacterLibraryDetail: FC<CharacterLibraryDetailProps> =
	function CharacterLibraryDetail({
		// character 是当前选中角色投影，用于初值与只读区
		character,
		// onSaved 在落盘成功后回调，用于同步列表
		onSaved,
	}) {
		async function handleSubmit(
			values: CharacterDetailFormValues,
			helpers: FormikHelpers<CharacterDetailFormValues>,
		): Promise<void> {
			helpers.setStatus({ formError: undefined });
			try {
				const next = await commitSaveCharacterDetail(character, values);
				onSaved(next);
			} catch (error) {
				helpers.setStatus({ formError: toErrorMessage(error) });
			} finally {
				helpers.setSubmitting(false);
			}
		}

		return (
			<section className={styles.detailPane} aria-label="角色详情">
				<div className={styles.detailHead}>
					<span className={styles.avatarLg} aria-hidden>
						{initialOf(character.displayName)}
					</span>
					<div>
						<h2 className={styles.detailTitle}>{character.displayName}</h2>
						<p className={styles.detailMeta}>
							编辑后保存到 data/characters；全名 / 昵称 / 话术 / 场景卡可回读。
						</p>
					</div>
				</div>

				{/* 引用了Formik组件，用于详情编辑态表单状态 */}
				<Formik
					initialValues={toCharacterDetailFormValues(character)}
					enableReinitialize
					validate={validateCharacterDetailForm}
					onSubmit={handleSubmit}
				>
					{(formik) => (
						// 引用了CharacterDetailEditForm组件，用于 AutoForm 编排详情字段
						<CharacterDetailEditForm character={character} formik={formik} />
					)}
				</Formik>

				{/* 引用了CharacterMemoryPanel组件，用于记忆只读列表与分页 */}
				<CharacterMemoryPanel agentId={character.agentId} />
			</section>
		);
	};
