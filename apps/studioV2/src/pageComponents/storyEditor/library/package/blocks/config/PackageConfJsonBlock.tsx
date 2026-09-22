/**
	* 包配置浮窗：单个受控 JSON 块（worldFacts / meta）。
	* 草稿本地编辑；失焦或点「应用」才解析写会话；非法 JSON 不写盘。
	*/
"use client";

import { useEffect, useState, type FC } from "react";
import { Button, TextField, Typography } from "@mui/material";
import styles from "../EditorLibraryFloat.module.scss";

export type PackageConfJsonBlockProps = {
	/** 字段标题；如 worldFacts */
	label: string;
	/** 人话说明；解释 schema 约定 */
	hint: string;
	/** 与 bundle 同步的规范草稿（pretty JSON） */
	canonicalText: string;
	/** 解析成功写回；失败时由本组件展示 message */
	onApply: (raw: string) => string | undefined;
};

export const PackageConfJsonBlock: FC<PackageConfJsonBlockProps> =
	function PackageConfJsonBlock({
		// label 是字段名，用于 TextField 标签与 aria
		label,
		// hint 是结构约定说明，用于作者理解可写形状
		hint,
		// canonicalText 是会话真源序列化，用于外部变更后重置草稿
		canonicalText,
		// onApply 解析并写会话；返回错误文案或 undefined 表示成功
		onApply,
	}) {
		const [draft, setDraft] = useState(canonicalText);
		const [error, setError] = useState<string | undefined>();

		useEffect(
			function () {
				setDraft(canonicalText);
				setError(undefined);
			},
			[canonicalText],
		);

		function commit(): void {
			const message = onApply(draft);
			setError(message);
		}

		return (
			<div className={styles.readonlyRow}>
				{/* 引用了Typography组件，用于 JSON 块字段标题 */}
				<Typography variant="caption" className={styles.itemMeta}>
					{label}
				</Typography>
				{/* 引用了Typography组件，用于 JSON 块约定说明 */}
				<Typography variant="caption" className={styles.hint}>
					{hint}
				</Typography>
				{/* 引用了TextField组件，用于受控 JSON 草稿 */}
				<TextField
					size="small"
					fullWidth
					multiline
					minRows={4}
					maxRows={10}
					value={draft}
					error={Boolean(error)}
					helperText={error}
					onChange={(e) => {
						setDraft(e.target.value);
						if (error) setError(undefined);
					}}
					onBlur={function () {
						commit();
					}}
					inputProps={{
						"aria-label": `${label} JSON`,
						spellCheck: false,
					}}
				/>
				<div className={styles.toolbar}>
					{/* 引用了Button组件，用于显式应用 JSON */}
					<Button size="small" onClick={commit} aria-label={`应用 ${label}`}>
						应用
					</Button>
				</div>
			</div>
		);
	};
