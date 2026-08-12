/**
	* 资源库页头：标题说明 + 上传入口。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetLibraryHeaderProps = {
	onUpload: () => void;
};

export const AssetLibraryHeader: FC<AssetLibraryHeaderProps> =
	function AssetLibraryHeader({
		// onUpload 打开上传弹层，用于选择文件写入资源库
		onUpload,
	}) {
		return (
			<header className={styles.header}>
				<div>
					{/* 引用了Typography组件，用于资源库标题 */}
					<Typography variant="h5" component="h1" className={styles.title}>
						资源库
					</Typography>
					{/* 引用了Typography组件，用于资源库说明 */}
					<Typography variant="body2" className={styles.sub}>
						管理项目内可引用的外部文件；上传后由系统自动生成资源记录。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于打开资源上传弹层 */}
					<Button variant="contained" size="small" onClick={onUpload}>
						上传资源
					</Button>
				</div>
			</header>
		);
	};
