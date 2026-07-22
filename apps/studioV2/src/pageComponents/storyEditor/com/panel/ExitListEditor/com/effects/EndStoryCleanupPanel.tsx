/**
	* end_story 清场子面板：清哪些 story 卡 + 是否保留 Free 卡。
	* 缺省语义等同引擎默认（clearStoryCards=all、preserveFreeCards=true），此处仅显式可调。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, MenuItem, Switch, TextField } from "@mui/material";
import type { EndStoryCleanup } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import styles from "./effectPanels.module.scss";

export type EndStoryCleanupPanelProps = {
	/** 当前清场配置；缺省时按引擎默认回显 */
	cleanup: EndStoryCleanup | undefined;
	/** 清场配置写回；合并进 end_story.cleanup 由上层负责 */
	onChange: (next: EndStoryCleanup) => void;
};

export const EndStoryCleanupPanel: FC<EndStoryCleanupPanelProps> =
	function EndStoryCleanupPanel({
		// cleanup 是当前清场配置，用于回显
		cleanup,
		// onChange 是清场配置写回，用于同步 end_story.cleanup
		onChange,
	}) {
		const value = cleanup ?? {};
		return (
			<div className={styles.panel}>
				{/* 引用了TextField组件，用于清哪些 story 卡下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="清哪些剧情卡"
					value={value.clearStoryCards ?? "all"}
					onChange={(e) => {
						onChange({
							...value,
							clearStoryCards: e.target.value === "none" ? "none" : "all",
						});
					}}
				>
					{/* 引用了MenuItem组件，用于清全部剧情卡 */}
					<MenuItem value="all">全部剧情卡</MenuItem>
					{/* 引用了MenuItem组件，用于不清剧情卡 */}
					<MenuItem value="none">不清（保留）</MenuItem>
				</TextField>
				{/* 引用了FormControlLabel组件，用于保留 Free 卡开关 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于保留 Free 卡开关
						<Switch
							checked={value.preserveFreeCards !== false}
							onChange={(e) => {
								onChange({ ...value, preserveFreeCards: e.target.checked });
							}}
						/>
					}
					label="保留自由通话卡（关=一并清除）"
				/>
			</div>
		);
	};
