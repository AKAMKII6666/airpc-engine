/**
	* 玩家配置列表：昵称 + 地理位置摘要；行内可触发删除确认。
	*/
"use client";

import type { FC } from "react";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";
// 引用了UserLibraryListRow组件，用于单行展示
import { UserLibraryListRow } from "./com/library/UserLibraryListRow";

export type UserLibraryListProps = {
	items: readonly UserProfileSummary[];
	selectedId: string | undefined;
	onSelect: (userId: string) => void;
	/**
		* 请求删除指定玩家档案；由父级打开确认弹层。
		* 不在列表内直接 mutate mock。
		*/
	onRequestDelete: (userId: string) => void;
};

export const UserLibraryList: FC<UserLibraryListProps> = function ({
	// items 是当前会话可见的玩家列表
	items,
	// selectedId 是当前选中的 userId
	selectedId,
	// onSelect 是行选中回调
	onSelect,
	// onRequestDelete 是行内删除请求，打开确认弹层
	onRequestDelete,
}) {
	return (
		<section className={styles.listPane} aria-label="玩家配置列表">
			<ul className={styles.list}>
				{items.map((u) => (
					// 引用了UserLibraryListRow组件，用于单行玩家
					<UserLibraryListRow
						key={u.userId}
						user={u}
						active={u.userId === selectedId}
						onSelect={onSelect}
						onRequestDelete={onRequestDelete}
					/>
				))}
			</ul>
		</section>
	);
};
