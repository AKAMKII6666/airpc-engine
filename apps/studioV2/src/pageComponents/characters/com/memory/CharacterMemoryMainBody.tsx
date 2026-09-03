/**
	* 记忆只读区主内容：调试用户选择、列表与分页。
	*/
"use client";

import { useState, type FC } from "react";
import { Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { FrontendPagination } from "@studio-v2/src/commonUiComponents/pagination/FrontendPagination";
import type {
	MemoryAttitudeListItemDto,
	MemoryListItemDto,
} from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";
import { CHARACTER_MEMORY_PAGE_SIZE } from "@studio-v2/src/bis/pageBis/characters/memory/loadCharacterMemoryPage.bis";
import { CharacterMemoryAttitudeSection } from "./CharacterMemoryAttitudeSection";
import { CharacterMemoryClearDialog } from "./CharacterMemoryClearDialog";
import { CharacterMemorySectionFrame } from "./CharacterMemorySectionFrame";
import { CharacterMemoryToolbar } from "./CharacterMemoryToolbar";

export type CharacterMemoryMainBodyProps = {
	/** 可选调试用户列表 */
	users: DiskUserSummaryDto[];
	/** 当前记忆查询 userId */
	userId: string;
	/** 切换调试 userId */
	onUserChange: (event: SelectChangeEvent<string>) => void;
	/** 记忆加载错误文案；可空 */
	error: string | undefined;
	/** 记忆列表加载中 */
	loading: boolean;
	/** 本页记忆条目 */
	items: MemoryListItemDto[];
	/** 最近态度记忆条目 */
	attitudes: MemoryAttitudeListItemDto[];
	/** 当前页码（1-based） */
	page: number;
	/** 满足条件的总条数 */
	total: number;
	/** 分页切换回调 */
	onPageChange: (nextPage: number) => void;
	/** 清空中 */
	clearing: boolean;
	/** 清空失败人话；成功时 undefined */
	clearError: string | undefined;
	/** 触发清空当前角色对当前玩家的记忆与惯性 */
	onClearMemory: () => Promise<void>;
};

export const CharacterMemoryMainBody: FC<
	CharacterMemoryMainBodyProps
> = function CharacterMemoryMainBody({
	// users 是可选调试用户列表，用于下拉选择
	users,
	// userId 是当前记忆查询键，用于请求 Memory
	userId,
	// onUserChange 是切换调试 userId 的回调，用于刷新列表
	onUserChange,
	// error 是记忆加载错误文案，用于错误态展示
	error,
	// loading 表示记忆列表加载中，用于加载态
	loading,
	// items 是本页记忆条目，用于列表渲染
	items,
	// attitudes 是最近态度记忆，用于态度记忆区展示
	attitudes,
	// page 是当前页码（1-based），用于分页控件
	page,
	// total 是满足条件的总条数，用于分页计算
	total,
	// onPageChange 是分页切换回调，用于翻页
	onPageChange,
	// clearing 表示清空进行中，用于禁用按钮
	clearing,
	// clearError 是清空失败人话，用于错误提示
	clearError,
	// onClearMemory 是清空动作回调，用于确认后执行
	onClearMemory,
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const nickname = users.find((u) => u.userId === userId)?.nickname ?? userId;

	return (
		// 引用了CharacterMemorySectionFrame组件，用于记忆区统一标题外壳
		<CharacterMemorySectionFrame>
			{/* 引用了CharacterMemoryToolbar组件，用于用户选择与错误提示 */}
			<CharacterMemoryToolbar
				users={users}
				userId={userId}
				onUserChange={onUserChange}
				clearing={clearing}
				clearError={clearError}
				error={error}
				onOpenClear={() => setConfirmOpen(true)}
			/>
			{/* 引用了CharacterMemoryAttitudeSection组件，用于态度记忆区 */}
			<CharacterMemoryAttitudeSection attitudes={attitudes} />
			{loading ? (
				// 引用了Typography组件，用于加载态
				<Typography variant="body2" color="text.secondary">
					加载中…
				</Typography>
			) : items.length === 0 ? (
				// 引用了Typography组件，用于无记忆空态
				<Typography variant="body2" color="text.secondary">
					该用户与角色暂无记忆条目。
				</Typography>
			) : (
				<ul className={styles.refList}>
					{items.map((item) => (
						<li key={item.id}>
							<strong>
								{item.kind ?? item.layer} · {item.at}
							</strong>
							<br />
							{item.text}
						</li>
					))}
				</ul>
			)}
			{/* 引用了FrontendPagination组件，用于记忆列表分页 */}
			<FrontendPagination
				page={page}
				pageSize={CHARACTER_MEMORY_PAGE_SIZE}
				total={total}
				onChange={onPageChange}
			/>
			{/* 引用了CharacterMemoryClearDialog组件，用于清空记忆确认 */}
			<CharacterMemoryClearDialog
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				nickname={nickname}
				clearing={clearing}
				onConfirm={onClearMemory}
			/>
		</CharacterMemorySectionFrame>
	);
};
