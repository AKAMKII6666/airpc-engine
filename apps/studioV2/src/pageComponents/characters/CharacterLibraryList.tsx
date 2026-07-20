/**
	* 角色库列表：显示名 + 自由通话就绪态；行内可触发删除确认。
	*/
"use client";

import type { FC, MouseEvent } from "react";
import { Button } from "@mui/material";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import {
	characterKindLabel,
	freeCallLabel,
} from "@studio-v2/typeFiles/library/labels/libraryLabels";
import { formatRelativeEdit } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function initialOf(name: string): string {
	return name.slice(0, 1);
}

function freeBadgeClass(ready: string): string {
	if (ready === "ready") return styles.badgeOk;
	if (ready === "draft") return styles.badgeWarn;
	return styles.badgeDanger;
}

export type CharacterLibraryListProps = {
	items: readonly CharacterSummary[];
	selectedId: string | undefined;
	onSelect: (agentId: string) => void;
	/**
		* 请求删除指定角色；由父级打开确认弹层。
		* 不在列表内直接 mutate mock。
		*/
	onRequestDelete: (agentId: string) => void;
};

export const CharacterLibraryList: FC<CharacterLibraryListProps> =
	function CharacterLibraryList({
		// items 是角色列表投影，用于渲染行
		items,
		// selectedId 是当前选中角色键，用于高亮行
		selectedId,
		// onSelect 是选中回调，用于切换详情
		onSelect,
		// onRequestDelete 是删除请求回调，用于打开确认弹层
		onRequestDelete,
	}) {
		return (
			<section className={styles.listPane} aria-label="角色列表">
				<ul className={styles.list}>
					{items.map((c) => {
						const active = c.agentId === selectedId;
						return (
							<li key={c.agentId}>
								<div className={active ? styles.rowActive : styles.row}>
									<button
										type="button"
										className={styles.rowSelect}
										onClick={() => onSelect(c.agentId)}
									>
										<span className={styles.avatar} aria-hidden>
											{initialOf(c.displayName)}
										</span>
										<span className={styles.rowMain}>
											<span className={styles.rowTitle}>{c.displayName}</span>
											<span className={styles.rowMeta}>
												{characterKindLabel(c.kind)} ·{" "}
												<span className={freeBadgeClass(c.freeCall)}>
													{freeCallLabel(c.freeCall)}
												</span>
												{" · "}引用 {c.packageRefCount} 包 ·{" "}
												{formatRelativeEdit(c.lastEditedAt)}
											</span>
										</span>
									</button>
									{/* 引用了Button组件，用于行内删除确认入口 */}
									<Button
										type="button"
										size="small"
										color="error"
										variant="text"
										className={styles.rowDelete}
										aria-label={`删除 ${c.displayName}`}
										onClick={(event: MouseEvent<HTMLButtonElement>) => {
											event.stopPropagation();
											onRequestDelete(c.agentId);
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
