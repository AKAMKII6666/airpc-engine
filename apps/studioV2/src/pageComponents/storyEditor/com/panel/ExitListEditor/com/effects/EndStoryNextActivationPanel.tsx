/**
	* end_story 下一章「激活方式」子面板：activation + 延迟 + entryMode + hint + 提前加锁。
	* 字段对齐引擎 arrangeChapterNext 读取；delayMinutes 仅 activation=delay 有意义。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, MenuItem, Switch, TextField } from "@mui/material";
import type {
	EndStoryNext,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { EditorEntryMode } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { ENTRY_MODE_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";
import { parseBoundedInt } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import styles from "./effectPanels.module.scss";

export type EndStoryNextActivationPanelProps = {
	/** 当前下一章配置；只读取激活相关字段 */
	value: EndStoryNext;
	/** 激活字段写回；合并进 end_story.next 由上层负责 */
	onPatch: (next: Partial<EndStoryNext>) => void;
};

export const EndStoryNextActivationPanel: FC<EndStoryNextActivationPanelProps> =
	function EndStoryNextActivationPanel({
		// value 是当前下一章配置，用于回显激活字段
		value,
		// onPatch 是激活字段写回，用于同步 next
		onPatch,
	}) {
		return (
			<div className={styles.panel}>
				{/* 引用了TextField组件，用于激活方式下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="激活方式"
					value={value.activation ?? "wait_user_dial"}
					onChange={(e) => {
						onPatch({
							activation: e.target.value as EndStoryNext["activation"],
						});
					}}
				>
					{/* 引用了MenuItem组件，用于立即激活 */}
					<MenuItem value="immediate">立即</MenuItem>
					{/* 引用了MenuItem组件，用于延迟激活 */}
					<MenuItem value="delay">延迟</MenuItem>
					{/* 引用了MenuItem组件，用于等待用户拨打 */}
					<MenuItem value="wait_user_dial">等待用户拨打</MenuItem>
				</TextField>
				{/* 引用了TextField组件，用于延迟分钟（仅 delay 有意义） */}
				<TextField
					size="small"
					fullWidth
					label="延迟（分钟，仅延迟时有意义）"
					value={
						value.delayMinutes === undefined ? "" : String(value.delayMinutes)
					}
					onChange={(e) => {
						onPatch({ delayMinutes: parseBoundedInt(e.target.value, 0, 100000) });
					}}
				/>
				{/* 引用了TextField组件，用于入口 entryMode 覆盖 */}
				<TextField
					size="small"
					fullWidth
					select
					label="入口模式覆盖（可选）"
					value={value.entryMode ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						onPatch({
							entryMode: next === "" ? undefined : (next as EditorEntryMode),
						});
					}}
				>
					{/* 引用了MenuItem组件，用于不覆盖 entryMode */}
					<MenuItem value="">（按激活方式推导）</MenuItem>
					{ENTRY_MODE_OPTIONS.map((opt) => (
						// 引用了MenuItem组件，用于单个 entryMode 选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>
				{/* 引用了TextField组件，用于 activationHint 覆盖 */}
				<TextField
					size="small"
					fullWidth
					label="激活提示 activationHint（可选）"
					value={value.activationHint ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						onPatch({ activationHint: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了FormControlLabel组件，用于提前加锁开关 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于提前加 ActiveStoryLock 开关
						<Switch
							checked={value.acquireLockEarly === true}
							onChange={(e) => {
								onPatch({ acquireLockEarly: e.target.checked });
							}}
						/>
					}
					label="beginCall 前提前加锁（默认否）"
				/>
			</div>
		);
	};
