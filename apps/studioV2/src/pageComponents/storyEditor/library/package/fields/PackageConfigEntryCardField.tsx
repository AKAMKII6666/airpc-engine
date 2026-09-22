/**
	* 包配置浮窗：入口卡 Select。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

export type PackageConfigEntryCardFieldProps = {
	entryValue: string;
	entryCardOptions: readonly CallCardLabelOption[];
	onEntryCardIdChange: (cardId: string) => void;
};

export const PackageConfigEntryCardField: FC<PackageConfigEntryCardFieldProps> =
	function PackageConfigEntryCardField({
		// entryValue 是当前入口卡（不在候选时为空）
		// entryValue 是组件入参，用于渲染与交互
		entryValue,
		// entryCardOptions 是入口卡候选
		// entryCardOptions 是组件入参，用于渲染与交互
		entryCardOptions,
		// onEntryCardIdChange 是入口卡写回
		// onEntryCardIdChange 是组件入参，用于渲染与交互
		onEntryCardIdChange,
	}) {
		const empty = entryCardOptions.length === 0;
		return (
			// 引用了TextField组件，用于入口卡 Select
			<TextField
				size="small"
				select
				fullWidth
				label="入口卡 entryCardId"
				value={entryValue}
				disabled={empty}
				helperText={
					empty
						? "本包暂无 CallCard，请先放置卡片"
						: "真源为章节开始节点连出的唯一通话卡；保存时会按画布连线覆盖"
				}
				onChange={(e) => {
					onEntryCardIdChange(e.target.value);
				}}
			>
				{entryCardOptions.map(function (opt) {
					return (
						// 引用了MenuItem组件，用于入口卡选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					);
				})}
			</TextField>
		);
	};
