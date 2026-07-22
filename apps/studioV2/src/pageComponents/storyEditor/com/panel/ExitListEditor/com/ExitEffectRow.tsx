/**
	* 出口 Effect 单行：effect 枚举下拉（每项挂 Tooltip）+ 专属参数面板 + 摘要 + 删除。
	* 从 ExitEffectsList 拆出以压低父组件行数；不承载列表增删逻辑。
	*/
"use client";

import type { FC } from "react";
import { IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import type { EditorExitEffectProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type {
	EditorEffectParams,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { EFFECT_NAME_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";
import { coerceKnownEffectName } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
// 引用了ExitEffectPanel组件，用于按 effect 分发专属参数面板
import { ExitEffectPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/ExitEffectPanel";
import styles from "../index.module.scss";

export type ExitEffectRowProps = {
	fx: EditorExitEffectProjection;
	sources: EffectPanelSources;
	onEffectChange: (rawEffect: string) => void;
	onParamsChange: (params: EditorEffectParams) => void;
	onSummaryChange: (summary: string) => void;
	onRemove: () => void;
};

export const ExitEffectRow: FC<ExitEffectRowProps> = function ExitEffectRow({
	// fx 是当前 Effect 行数据，用于回显
	fx,
	// sources 是 id 下拉候选源，用于透传给面板
	sources,
	// onEffectChange 是 effect 枚举写回，用于切换效果种类
	onEffectChange,
	// onParamsChange 是参数写回，用于同步该行 params
	onParamsChange,
	// onSummaryChange 是摘要写回，用于同步人话摘要
	onSummaryChange,
	// onRemove 是删除本行，用于从列表移除该 Effect
	onRemove,
}) {
	return (
		<li className={styles.effectRow}>
			<div className={styles.effectRowHead}>
				{/* 引用了TextField组件，用于 effect 枚举下拉 */}
				<TextField
					size="small"
					select
					label="Effect"
					className={styles.effectSelect}
					value={coerceKnownEffectName(fx.effect)}
					onChange={(e) => {
						onEffectChange(e.target.value);
					}}
					helperText="悬停查看每种效果说明；仅可选已知枚举。"
				>
					{EFFECT_NAME_OPTIONS.map((opt) => (
						// 引用了MenuItem组件，用于 Effect 枚举选项
						<MenuItem key={opt.value} value={opt.value}>
							{/* 引用了Tooltip组件，用于该 effect 的说明 */}
							<Tooltip title={opt.description ?? ""} placement="right">
								<span>{opt.label}</span>
							</Tooltip>
						</MenuItem>
					))}
				</TextField>
				{/* 引用了IconButton组件，用于删除 Effect 行 */}
				<IconButton
					size="small"
					aria-label={`删除 Effect ${fx.id}`}
					onClick={() => {
						onRemove();
					}}
				>
					×
				</IconButton>
			</div>
			{/* 引用了ExitEffectPanel组件，用于该 effect 的专属参数面板 */}
			<ExitEffectPanel
				effect={fx.effect}
				params={fx.params}
				sources={sources}
				onParamsChange={onParamsChange}
			/>
			{/* 引用了TextField组件，用于人话摘要 */}
			<TextField
				size="small"
				fullWidth
				label="摘要（可选）"
				value={fx.summary ?? ""}
				onChange={(e) => {
					onSummaryChange(e.target.value);
				}}
			/>
		</li>
	);
};
