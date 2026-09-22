/**
	* 包配置浮窗：只读摘要（schema/packageId/title/派生角色/cards）。
	*/
"use client";

import type { FC } from "react";
import type { EditorStoryPackageConfProjection } from "@studio-v2/typeFiles/story/editor/package/editorStoryPackageConf";
import styles from "../EditorLibraryFloat.module.scss";

export type PackageConfigReadonlySummaryProps = {
	/** 包配置投影；只读展示 */
	conf: EditorStoryPackageConfProjection;
};

function labelOrDash(value: string): string {
	return value.trim().length > 0 ? value : "—";
}

export const PackageConfigReadonlySummary: FC<
	PackageConfigReadonlySummaryProps
> = function PackageConfigReadonlySummary({
	// conf 是包配置投影，用于只读摘要行
	conf,
}) {
	return (
		<dl className={styles.readonlyList}>
			<div className={styles.readonlyRow}>
				<dt>schemaVersion</dt>
				<dd>{conf.schemaVersion}</dd>
			</div>
			<div className={styles.readonlyRow}>
				<dt>packageId</dt>
				<dd>{conf.packageId}</dd>
			</div>
			<div className={styles.readonlyRow}>
				<dt>title</dt>
				<dd>{labelOrDash(conf.title)}</dd>
			</div>
			<div className={styles.readonlyRow}>
				<dt>本包引用角色（派生）</dt>
				<dd>
					{conf.participants.length === 0
						? "—"
						: conf.participants.join("、")}
				</dd>
			</div>
			<div className={styles.readonlyRow}>
				<dt>cards</dt>
				<dd>
					{conf.cards.length} 张 ·{" "}
					{conf.cards.map((c) => c.cardId).join("、") || "—"}
				</dd>
			</div>
		</dl>
	);
};
