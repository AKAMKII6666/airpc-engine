/**
	* 应用壳：左侧主导航 + 主区装配。
	* 章编辑器路由进入全屏：隐藏主导航与主区 padding，避免挤占画布。
	*/
"use client";

import type { FC, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Typography } from "@mui/material";
import {
	STUDIO_NAV_ITEMS,
	isNavItemActive,
} from "@studio-v2/src/pageComponents/shell/studioNavItems";
import { StudioLogoMark } from "@studio-v2/src/pageComponents/shell/StudioLogoMark";
import styles from "./StudioAppChrome.module.scss";

export type StudioAppChromeProps = {
	children: ReactNode;
};

/** 章编辑器路由：全屏画布，不套工作台侧栏。 */
function isStoryEditorPath(pathname: string): boolean {
	if (pathname === "/stories" || pathname.startsWith("/stories/")) {
		return true;
	}
	return /^\/packages\/[^/]+\/chapters\/[^/]+/.test(pathname);
}

export const StudioAppChrome: FC<StudioAppChromeProps> = function (props) {
	const { children } = props;
	const pathname = usePathname() ?? "/";
	const fullscreen = isStoryEditorPath(pathname);

	if (fullscreen) {
		return <div className={styles.fullscreen}>{children}</div>;
	}

	return (
		<div className={styles.root}>
			<aside className={styles.nav} aria-label="主导航">
				<div className={styles.brand}>
					{/* 引用了StudioLogoMark组件，用于侧栏品牌标识 */}
					<StudioLogoMark size={28} className={styles.logoMark} />
					<div className={styles.brandTextBlock}>
						{/* 引用了Typography组件，用于侧栏品牌标题 */}
						<Typography variant="subtitle2" className={styles.brandText}>
							AirPC Studio
						</Typography>
						<span className={styles.brandBadge}>V2</span>
					</div>
				</div>
				<nav className={styles.navList}>
					{STUDIO_NAV_ITEMS.map(function (item) {
						return (
							// 引用了Link组件，用于主导航链接
							<Link
								key={item.href}
								href={item.href}
								className={
									isNavItemActive(pathname, item)
										? styles.navLinkActive
										: styles.navLink
								}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</aside>
			<div className={styles.main}>{children}</div>
		</div>
	);
};
