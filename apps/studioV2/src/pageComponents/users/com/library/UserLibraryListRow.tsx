/**
	* 玩家配置列表单行。
	*/
"use client";

import type { FC, MouseEvent } from "react";
import { Button } from "@mui/material";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";
import { formatRelativeEdit } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function initialOf(name: string): string {
	return name.slice(0, 1);
}

function locationSummary(u: UserProfileSummary): string {
	const { country, province, city, district } = u.location;
	return [country, province, city, district]
		.filter((s) => s.trim() !== "")
		.join(" · ");
}

export type UserLibraryListRowProps = {
	user: UserProfileSummary;
	active: boolean;
	onSelect: (userId: string) => void;
	onRequestDelete: (userId: string) => void;
};

export const UserLibraryListRow: FC<UserLibraryListRowProps> =
	function UserLibraryListRow({
		// user 是当前行玩家摘要
		// user 是组件入参，用于渲染与交互
		user,
		// active 表示是否选中行
		active,
		// onSelect 是行选中回调
		// onSelect 是组件入参，用于渲染与交互
		onSelect,
		// onRequestDelete 是行内删除请求
		// onRequestDelete 是组件入参，用于渲染与交互
		onRequestDelete,
	}) {
		const place = locationSummary(user);
		return (
			<li>
				<div className={active ? styles.rowActive : styles.row}>
					<button
						type="button"
						className={styles.rowSelect}
						onClick={() => onSelect(user.userId)}
					>
						<span className={styles.avatar} aria-hidden>
							{initialOf(user.nickname)}
						</span>
						<span className={styles.rowMain}>
							<span className={styles.rowTitle}>{user.nickname}</span>
							<span className={styles.rowMeta}>
								{place || "未填地理位置"}
								{user.updatedAt
									? ` · ${formatRelativeEdit(user.updatedAt)}`
									: ""}
							</span>
						</span>
					</button>
					{/* 引用了Button组件，用于请求删除玩家 */}
					<Button
						type="button"
						size="small"
						color="error"
						variant="text"
						className={styles.rowDelete}
						aria-label={`删除 ${user.nickname}`}
						onClick={(event: MouseEvent<HTMLButtonElement>) => {
							event.stopPropagation();
							onRequestDelete(user.userId);
						}}
					>
						删除
					</Button>
				</div>
			</li>
		);
	};
