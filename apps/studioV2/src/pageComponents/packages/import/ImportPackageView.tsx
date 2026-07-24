/**
	* 导入故事包薄入口：主流程在列表 ImportPackageModal。
	* 本页仅提示并链回列表。
	*/
"use client";

import type { FC } from "react";
// 引用了Link组件，用于跳转故事包列表
import Link from "next/link";
// 引用了Button、Typography组件，用于返回按钮与标题文案
import { Button, Typography } from "@mui/material";
import styles from "./ImportPackageView.module.scss";

export const ImportPackageView: FC = function () {
	return (
		<main className={styles.root}>
			{/* 引用了Typography组件，用于导入页标题 */}
			<Typography variant="h5" component="h1" className={styles.title}>
				导入故事包
			</Typography>
			{/* 引用了Typography组件，用于导入流程说明 */}
			<Typography variant="body2" className={styles.sub}>
				主流程请从「故事包」列表打开导入弹层（选 .storypack.json → 预检 →
				确认写盘）。本页为薄备选入口。
			</Typography>
			<div className={styles.footer}>
				{/* 引用了Button组件，用于返回故事包列表 */}
				<Button component={Link} href="/packages" variant="contained">
					返回故事包列表
				</Button>
			</div>
		</main>
	);
};
