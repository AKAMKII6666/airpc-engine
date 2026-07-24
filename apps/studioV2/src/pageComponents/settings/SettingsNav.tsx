/**
	* 设置左侧分类导航。
	* 导航项由页经 feature bis 注入；禁止直引 ajaxProxy。
	*/
"use client";

import type { FC } from "react";
import type {
	SettingsCategoryId,
	SettingsNavItem,
} from "@studio-v2/typeFiles/settings/studioSettings";
import styles from "./SettingsShell.module.scss";

export type SettingsNavProps = {
	/** 当前选中分类 */
	active: SettingsCategoryId;
	/** 分类导航项（来自 settings store 投影） */
	nav: readonly SettingsNavItem[];
	/** 切换分类 */
	onSelect: (id: SettingsCategoryId) => void;
};

export const SettingsNav: FC<SettingsNavProps> = function ({
	// active 是当前选中分类键
	active,
	// nav 是左侧分类列表投影
	nav,
	// onSelect 是切换分类回调
	onSelect,
}) {
	return (
		<nav className={styles.nav} aria-label="设置分类">
			<h1 className={styles.navTitle}>设置</h1>
			<ul className={styles.navList}>
				{nav.map(function (item) {
					return (
						<li key={item.id}>
							<button
								type="button"
								className={
									item.id === active ? styles.navBtnActive : styles.navBtn
								}
								onClick={function () {
									onSelect(item.id);
								}}
							>
								{item.label}
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};
