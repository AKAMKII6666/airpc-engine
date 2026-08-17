/**
	* 调试器右侧待机上下文：展示角色与 free card 入口。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { RoleRow } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";

function chipClass(index: number): string {
	const classes = [
		styles.cardChipBlue,
		styles.cardChipViolet,
		styles.cardChipCyan,
		styles.cardChipAmber,
		styles.cardChipRed,
	];
	return classes[index % classes.length];
}

type RoleRowViewProps = {
	/** 待机态角色行；由 server 角色投影提供 */
	row: RoleRow;
};

const RoleRowView: FC<RoleRowViewProps> = function RoleRowView({
	// row 是角色行投影，用于展示号码与 free card
	row,
}) {
	return (
		<div className={styles.roleRow}>
			<div className={styles.roleCell}>
				<span
					className={`${styles.roleAvatar} ${
						styles[`roleAvatar_${row.accent}`]
					}`}
				>
					{row.name.slice(0, 1)}
				</span>
				<span>
					<span className={styles.roleName}>{row.name}</span>
					<span className={styles.roleMeta}>{row.role}</span>
				</span>
			</div>
			<div className={styles.numberCell}>{row.number}</div>
			<div className={styles.cardCell}>
				{row.cards.map((card, index) => (
					<button
						key={card}
						type="button"
						className={row.canFreeCall ? chipClass(index) : styles.cardChipMuted}
					>
						{card}
					</button>
				))}
				{row.more > 0 ? (
					<span className={styles.moreChip}>+{row.more}</span>
				) : null}
			</div>
		</div>
	);
};

type IdleContextPanelProps = {
	/** 待机角色投影；包含不可拨状态 */
	roles: readonly RoleRow[];
	/** 角色列表加载中 */
	loading: boolean;
	/** 角色列表加载失败人话；无则 undefined */
	error: string | undefined;
	/** 手动刷新角色列表 */
	onRefresh: () => Promise<void>;
};

export const IdleContextPanel: FC<IdleContextPanelProps> =
	function IdleContextPanel({
		// roles 是右侧待机列表真源投影，用于展示可拨状态
		roles,
		// loading 表示角色列表正在加载，用于禁用刷新按钮
		loading,
		// error 是角色列表加载错误，用于显示列表错误提示
		error,
		// onRefresh 是刷新命令，用于重新读取角色列表
		onRefresh,
	}) {
		return (
			<>
				<div className={styles.panelHead}>
					<h2 className={styles.panelTitle}>运行时上下文</h2>
					{/* 引用了Button组件，用于刷新待机上下文 */}
					<Button
						size="small"
						variant="outlined"
						className={styles.ghostButton}
						disabled={loading}
						onClick={() => void onRefresh()}
					>
						{loading ? "刷新中" : "刷新"}
					</Button>
				</div>

				<div className={styles.contextCardIdle}>
					<div className={styles.cardHeader}>
						<h3 className={styles.contextTitle}>角色与可用通话卡</h3>
						<span className={styles.contextHint}>待机视图 · free card 入口</span>
					</div>
					<div className={styles.roleTable}>
						<div className={styles.roleHead}>
							<span>角色</span>
							<span>电话号码</span>
							<span>可用通话卡</span>
						</div>
						{error ? (
							<div className={styles.roleNotice}>{error}</div>
						) : null}
						{!error && roles.length === 0 ? (
							<div className={styles.roleNotice}>
								{loading ? "正在读取角色列表..." : "暂无角色"}
							</div>
						) : null}
						{roles.map((row) => (
							// 引用了RoleRowView组件，用于展示单个角色的可拨入口
							<RoleRowView key={row.number} row={row} />
						))}
					</div>
				</div>
			</>
		);
	};
