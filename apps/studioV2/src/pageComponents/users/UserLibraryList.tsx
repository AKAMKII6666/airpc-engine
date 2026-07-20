/**
	* 玩家配置列表：昵称 + 地理位置摘要；行内可触发删除确认。
	*/
"use client";

import type { FC, MouseEvent } from "react";
import { Button } from "@mui/material";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import { formatRelativeEdit } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function initialOf(name: string): string {
	return name.slice(0, 1);
}

function locationSummary(u: UserProfileSummary): string {
	const { country, province, city, district } = u.location;
	return [country, province, city, district].filter((s) => s.trim() !== "").join(" · ");
}

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

export const UserLibraryList: FC<UserLibraryListProps> = function (props) {
	const {
		// items 是当前会话可见的玩家列表
		items,
		// selectedId 是当前选中的 userId
		selectedId,
		// onSelect 是行选中回调
		onSelect,
		// onRequestDelete 是行内删除请求，打开确认弹层
		onRequestDelete,
	} = props;
	return (
		<section className={styles.listPane} aria-label="玩家配置列表">
			<ul className={styles.list}>
				{items.map((u) => {
					const active = u.userId === selectedId;
					const place = locationSummary(u);
					return (
						<li key={u.userId}>
							<div className={active ? styles.rowActive : styles.row}>
								<button
									type="button"
									className={styles.rowSelect}
									onClick={() => onSelect(u.userId)}
								>
									<span className={styles.avatar} aria-hidden>
										{initialOf(u.nickname)}
									</span>
									<span className={styles.rowMain}>
										<span className={styles.rowTitle}>{u.nickname}</span>
										<span className={styles.rowMeta}>
											{place || "未填地理位置"}
											{u.updatedAt
												? ` · ${formatRelativeEdit(u.updatedAt)}`
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
									aria-label={`删除 ${u.nickname}`}
									onClick={(event: MouseEvent<HTMLButtonElement>) => {
										event.stopPropagation();
										onRequestDelete(u.userId);
									}}
								>
									删除
								</Button>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
};
