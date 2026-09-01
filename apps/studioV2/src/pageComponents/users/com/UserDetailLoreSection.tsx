/**
	* 玩家详情世界背景区：来源 + 只读正文预览 + 强制重生成。
	*/
"use client";

import type { FC } from "react";
import { Button, Chip, Stack } from "@mui/material";
import type { LorePreviewDto } from "@studio-v2/typeFiles/library/users/loreBootstrap";
import {
	formatLoreGeneratedAt,
	formatLoreLocationLine,
} from "@studio-v2/src/bis/pageBis/users/detail/lore/formatLorePreviewDisplay";
import styles from "./UserDetailLoreSection.module.scss";

export type UserDetailLoreSectionProps = {
	/** Profile.world.lore 只读预览；无 lore 为 null */
	lorePreview: LorePreviewDto | null;
	loreBusy: boolean;
	disabled: boolean;
	onBootstrapLore: () => void | Promise<void>;
};

function sourceLabel(source: LorePreviewDto["source"] | null): string {
	if (source === "llm") return "LLM 生成";
	if (source === "fallback") return "降级模板";
	if (source === "manual") return "手动编辑";
	return "尚未生成";
}

function sourceChipClass(source: LorePreviewDto["source"] | null): string {
	if (source === "llm") return styles.sourceChipLlm;
	if (source === "fallback") return styles.sourceChipFallback;
	if (source === "manual") return styles.sourceChipManual;
	return styles.sourceChipEmpty;
}

export const UserDetailLoreSection: FC<UserDetailLoreSectionProps> =
	function UserDetailLoreSection({
		// lorePreview 表示 Profile.world.lore 只读投影，用于展示正文
		lorePreview,
		// loreBusy 表示重生成请求进行中，用于禁用按钮
		loreBusy,
		// disabled 表示表单提交中等，用于一并禁用重生成
		disabled,
		// onBootstrapLore 用于强制重生成，经 bis → API
		onBootstrapLore,
	}) {
		const source = lorePreview?.source ?? null;
		const locationLine = formatLoreLocationLine(lorePreview?.location);

		return (
			<div className={styles.section}>
				<div className={styles.sectionHead}>
					<h3 className={styles.sectionTitle}>世界背景</h3>
					{/* 引用了Chip组件，用于展示 lore 来源标签 */}
					<Chip
						size="small"
						variant="outlined"
						label={sourceLabel(source)}
						className={sourceChipClass(source)}
					/>
				</div>

				{lorePreview ? (
					<div className={styles.previewCard}>
						<p className={styles.premise}>{lorePreview.sharedPremise}</p>
						<div className={styles.metaRow}>
							{locationLine ? (
								<span className={styles.metaItem}>
									<span className={styles.metaLabel}>锚定地点</span>
									<span className={styles.metaValue}>{locationLine}</span>
								</span>
							) : null}
							<span className={styles.metaItem}>
								<span className={styles.metaLabel}>生成于</span>
								<span className={styles.metaValue}>
									{formatLoreGeneratedAt(lorePreview.generatedAt)}
								</span>
							</span>
						</div>
					</div>
				) : (
					<div className={styles.emptyCard}>
						<p className={styles.emptyText}>
							尚未生成世界背景。请填写玩家地理位置后，点击下方按钮生成；生成结果将注入通话
							soft context，此处仅只读预览。
						</p>
					</div>
				)}

				{/* 引用了Stack组件，用于排列重生成按钮 */}
				<Stack direction="row" spacing={1} className={styles.actions}>
					{/* 引用了Button组件，用于强制重生成 Profile.world.lore */}
					<Button
						type="button"
						variant="outlined"
						disabled={loreBusy || disabled}
						onClick={function () {
							void onBootstrapLore();
						}}
					>
						{loreBusy ? "生成中…" : "重新生成世界背景"}
					</Button>
				</Stack>
			</div>
		);
	};
