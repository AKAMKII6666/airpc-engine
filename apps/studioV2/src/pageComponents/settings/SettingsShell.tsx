/**
	* 设置页壳：左分类 + 右内容；含 Schema 兼容与校验报告入口。
	* 偏好真源在 settings store（经 shell + feature bis）；禁止直引 mock。
	*/
"use client";

import type { FC } from "react";
import { useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import type { SettingsCategoryId } from "@studio-v2/typeFiles/settings/studioSettings";
import { useSettingsShellBis } from "@studio-v2/src/bis/shellBis/settings/settings.shell.bis";
import { useSettingsSessionBis } from "@studio-v2/src/bis/pageBis/settings/settingsSession.bis";
// 引用了SettingsNav组件，用于左侧分类导航
import { SettingsNav } from "@studio-v2/src/pageComponents/settings/SettingsNav";
// 引用了SettingsContent组件，用于右侧分类内容
import { SettingsContent } from "@studio-v2/src/pageComponents/settings/SettingsContent";
import styles from "./SettingsShell.module.scss";

export const SettingsShell: FC = function () {
	useSettingsShellBis();
	const { snapshot, loading, loadError } = useSettingsSessionBis();
	const [category, setCategory] = useState<SettingsCategoryId>("schema");
	const [showReport, setShowReport] = useState(true);

	return (
		<main className={styles.root}>
			{loadError ? (
				// 引用了Alert组件，用于设置灌入失败提示
				<Alert severity="error" sx={{ m: 2 }}>
					{loadError}
				</Alert>
			) : null}
			{loading && !snapshot ? (
				// 引用了CircularProgress组件，用于设置灌入中
				<CircularProgress size={28} sx={{ m: 2 }} />
			) : null}
			{snapshot ? (
				<>
					{/* 引用了SettingsNav组件，用于左侧分类导航 */}
					<SettingsNav
						active={category}
						nav={snapshot.nav}
						onSelect={setCategory}
					/>
					<div className={styles.content}>
						{/* 引用了SettingsContent组件，用于右侧分类内容 */}
						<SettingsContent
							category={category}
							snapshot={snapshot}
							showReport={showReport}
							onToggleReport={function () {
								setShowReport(function (v) {
									return !v;
								});
							}}
						/>
					</div>
				</>
			) : null}
		</main>
	);
};
