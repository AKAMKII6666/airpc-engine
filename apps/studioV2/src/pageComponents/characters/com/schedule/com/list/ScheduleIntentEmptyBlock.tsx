/**
	* 定时外呼列表无数据占位块：避免空区「什么都没有」。
	*/
"use client";

import type { FC } from "react";
import styles from "../../index.module.scss";

export const ScheduleIntentEmptyBlock: FC = function ScheduleIntentEmptyBlock() {
	return (
		<div className={styles.emptyBlock} role="status">
			<div className={styles.emptyTitle}>暂无定时外呼</div>
			<p className={styles.emptyHint}>
				点击「添加定时外呼」为当前玩家与本角色创建一次或每日意图。
			</p>
		</div>
	);
};
