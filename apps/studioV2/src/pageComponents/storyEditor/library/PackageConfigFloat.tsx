/**
	* 故事包配置浮窗：StoryPackageConf 字段只读 Label。
	* 数据来自已加载磁盘 bundle；整包保存见顶栏。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import { projectEditorPackageConfFromBundle } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import styles from "./EditorLibraryFloat.module.scss";

export type PackageConfigFloatProps = {
	/** 当前打开的磁盘整包 */
	bundle: DiskStoryPackageBundle;
	open: boolean;
	onClose: () => void;
};

function labelOrDash(value: string): string {
	return value.trim().length > 0 ? value : "—";
}

export const PackageConfigFloat: FC<PackageConfigFloatProps> =
	function PackageConfigFloat({
		// bundle 是当前磁盘整包，用于只读投影
		bundle,
		// open 表示浮窗是否可见，用于条件渲染
		open,
		// onClose 是关闭回调，用于收起浮窗
		onClose,
	}) {
		if (!open) return null;

		const conf = projectEditorPackageConfFromBundle(bundle);

		return (
			<aside className={styles.floatRight} aria-label="包配置浮窗">
				<div className={styles.head}>
					{/* 引用了Typography组件，用于浮窗标题 */}
					<Typography variant="subtitle2" className={styles.title}>
						包配置
					</Typography>
					{/* 引用了Button组件，用于关闭包配置浮窗 */}
					<Button size="small" onClick={onClose} aria-label="关闭包配置浮窗">
						关闭
					</Button>
				</div>
				{/* 引用了Typography组件，用于只读说明 */}
				<Typography variant="caption" className={styles.hint}>
					包级元数据只读。编辑单卡请点画布 CallCard；保存请用顶栏「保存」写回
					data/storis-packages。
				</Typography>

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
						<dt>entryCardId</dt>
						<dd>{labelOrDash(conf.entryCardId)}</dd>
					</div>
					<div className={styles.readonlyRow}>
						<dt>participants</dt>
						<dd>
							{conf.participants.length === 0
								? "—"
								: conf.participants.join("、")}
						</dd>
					</div>
					<div className={styles.readonlyRow}>
						<dt>assetRefs</dt>
						<dd>
							{conf.assetRefs.length === 0
								? "—"
								: conf.assetRefs.join("、")}
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
			</aside>
		);
	};
