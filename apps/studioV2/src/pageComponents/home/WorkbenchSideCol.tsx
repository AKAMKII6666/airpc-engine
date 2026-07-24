/**
	* 工作台右侧：快速开始 / 工程状态 / 最近调试。
	* 数据由页经 feature bis 注入；禁止直引 ajaxProxy mock。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, CircularProgress } from "@mui/material";
import type {
	EngineeringStatusItem,
	RecentDebugSummary,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import {
	formatRelativeEdit,
	validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import { workbenchBadgeClass } from "@studio-v2/src/pageComponents/home/helper/workbenchBadgeClass";
import styles from "./WorkbenchShell.module.scss";

export type WorkbenchSideColProps = {
	/** 工程状态条；未灌入可为空 */
	engineeringStatus: readonly EngineeringStatusItem[];
	/** 最近调试摘要；未灌入可为空 */
	recentDebugs: readonly RecentDebugSummary[];
	/** 侧栏灌入中 */
	sideLoading: boolean;
};

export const WorkbenchSideCol: FC<WorkbenchSideColProps> = function ({
	// engineeringStatus 是工程状态条投影
	engineeringStatus,
	// recentDebugs 是最近调试摘要
	recentDebugs,
	// sideLoading 表示侧栏是否仍在灌入
	sideLoading,
}) {
	return (
		<aside className={styles.sideCol}>
			<section className={styles.panel} aria-labelledby="quick-start-title">
				<h3 id="quick-start-title" className={styles.panelTitle}>
					快速开始
				</h3>
				<ul className={styles.quickList}>
					<li>
						{/* 引用了Link组件，用于新建空故事包入口 */}
						<Link href="/packages/create" className={styles.quickLink}>
							新建空故事包
						</Link>
					</li>
					<li>
						{/* 引用了Link组件，用于从模板创建入口 */}
						<Link href="/packages/create" className={styles.quickLink}>
							从模板创建（入口预留）
						</Link>
					</li>
					<li>
						{/* 引用了Link组件，用于导入故事包入口 */}
						<Link href="/packages/import" className={styles.quickLink}>
							导入故事包
						</Link>
					</li>
				</ul>
			</section>

			<section className={styles.panel} aria-labelledby="eng-status-title">
				<h3 id="eng-status-title" className={styles.panelTitle}>
					工程状态
				</h3>
				{sideLoading && engineeringStatus.length === 0 ? (
					// 引用了CircularProgress组件，用于侧栏灌入中
					<CircularProgress size={20} sx={{ my: 1 }} />
				) : (
					<ul className={styles.statusList}>
						{engineeringStatus.map(function (item) {
							return (
								<li key={item.id} className={styles.statusItem}>
									<span className={styles.statusLabel}>
										<span className={workbenchBadgeClass(item.level)}>
											{validationLabel(item.level)}
										</span>{" "}
										{item.label}
									</span>
									<span className={styles.statusDetail}>{item.detail}</span>
								</li>
							);
						})}
					</ul>
				)}
				{/* 引用了Button组件，用于跳转设置页校验报告 */}
				<Button
					component={Link}
					href="/settings"
					size="small"
					sx={{ mt: 1, px: 0 }}
				>
					打开校验报告 / 工程状态
				</Button>
			</section>

			<section className={styles.panel} aria-labelledby="recent-debug-title">
				<h3 id="recent-debug-title" className={styles.panelTitle}>
					最近调试
				</h3>
				{recentDebugs.map(function (d) {
					return (
						<div key={d.sessionId} className={styles.debugItem}>
							<div className={styles.debugTitle}>{d.packageTitle}</div>
							<div className={styles.debugMeta}>
								起始：{d.startCardTitle}
								{d.hitExitTitle ? ` · 出口：${d.hitExitTitle}` : ""}
								<br />
								{d.resultLabel} · {formatRelativeEdit(d.at)}
							</div>
							{/* 引用了Button组件，用于打开调试记录 */}
							<Button
								component={Link}
								href="/debugger"
								size="small"
								sx={{ mt: 0.5, px: 0 }}
							>
								打开调试记录
							</Button>
						</div>
					);
				})}
			</section>
		</aside>
	);
};
