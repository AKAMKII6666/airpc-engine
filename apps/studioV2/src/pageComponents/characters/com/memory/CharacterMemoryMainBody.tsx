/**
	* 记忆只读区主内容：调试用户选择、列表与分页。
	*/
"use client";

import { useState, type FC } from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { FrontendPagination } from "@studio-v2/src/commonUiComponents/pagination/FrontendPagination";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";
import { CHARACTER_MEMORY_PAGE_SIZE } from "@studio-v2/src/bis/pageBis/characters/memory/loadCharacterMemoryPage.bis";
import { CharacterMemorySectionFrame } from "./CharacterMemorySectionFrame";

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
	const currentUser = users.find((u) => u.userId === userId);
	const nickname = currentUser?.nickname ?? userId;

	return (
		// 引用了CharacterMemorySectionFrame组件，用于记忆区统一标题外壳
		<CharacterMemorySectionFrame>
			<Box
				sx={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 1.5,
					mb: 1.5,
				}}
			>
				{/* 引用了FormControl组件，用于选择当前调试 userId */}
				<FormControl size="small" sx={{ minWidth: 220 }}>
					{/* 引用了InputLabel组件，用于 userId 下拉标签 */}
					<InputLabel id="memory-user-label">调试用户</InputLabel>
					{/* 引用了Select组件，用于切换记忆查询的 userId */}
					<Select
						labelId="memory-user-label"
						label="调试用户"
						value={userId}
						onChange={onUserChange}
					>
						{users.map((u) => (
							// 引用了MenuItem组件，用于单个调试用户选项
							<MenuItem key={u.userId} value={u.userId}>
								{u.nickname}（{u.userId}）
							</MenuItem>
						))}
					</Select>
				</FormControl>

				{/* 引用了Button组件，用于打开清空记忆确认框 */}
				<Button
					variant="outlined"
					color="error"
					size="small"
					disabled={clearing}
					onClick={() => setConfirmOpen(true)}
				>
					{clearing ? "清空中…" : "清空记忆"}
				</Button>
			</Box>

			{clearError ? (
				// 引用了Alert组件，用于清空失败提示
				<Alert severity="error" role="alert" sx={{ mb: 1.5 }}>
					{clearError}
				</Alert>
			) : null}

			{error ? (
				// 引用了Alert组件，用于记忆加载错误
				<Alert severity="error" role="alert">
					{error}
				</Alert>
			) : null}

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

			{/* 引用了Dialog组件，用于清空记忆二次确认 */}
			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>清空记忆</DialogTitle>
				<DialogContent>
					<DialogContentText>
						将清空玩家「{nickname}」在当前角色下的全部对话惯性与记忆，确定继续？
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>取消</Button>
					<Button
						color="error"
						disabled={clearing}
						onClick={async () => {
							setConfirmOpen(false);
							await onClearMemory();
						}}
					>
						确定清空
					</Button>
				</DialogActions>
			</Dialog>
		</CharacterMemorySectionFrame>
	);
};
