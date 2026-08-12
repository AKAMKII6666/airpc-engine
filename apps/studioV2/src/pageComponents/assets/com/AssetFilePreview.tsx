/**
	* 资源文件预览：展示同源请求路径，并按文件类型内嵌预览。
	*/
"use client";

import type { FC, ReactNode } from "react";
import { Alert, Button, Typography } from "@mui/material";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetFilePreviewProps = {
	/** 当前资源投影；用于决定请求路径、预览类型与可用性 */
	asset: AssetSummary;
};

const IMAGE_FORMATS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const AUDIO_FORMATS = new Set(["wav", "mp3", "ogg", "m4a", "aac", "flac"]);
const VIDEO_FORMATS = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const TEXT_FORMATS = new Set([
	"txt",
	"md",
	"json",
	"csv",
	"tsv",
	"log",
	"yaml",
	"yml",
]);

type PreviewKind = "image" | "audio" | "video" | "text" | "other";

function assetFilePreviewPath(assetId: string): string {
	return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

function inferPreviewKind(asset: AssetSummary): PreviewKind {
	const format = asset.format.trim().toLowerCase();
	if (asset.kind === "image" || IMAGE_FORMATS.has(format)) return "image";
	if (asset.kind === "wav" || asset.kind === "bgm" || AUDIO_FORMATS.has(format)) {
		return "audio";
	}
	if (VIDEO_FORMATS.has(format)) return "video";
	if (asset.kind === "text" || TEXT_FORMATS.has(format)) return "text";
	return "other";
}

function previewOpenLabel(previewKind: PreviewKind): string {
	return previewKind === "other" ? "打开文件" : "新窗口打开";
}

type PreviewContentProps = {
	/** 资源投影；图片 alt 等可访问文本使用展示名 */
	asset: AssetSummary;
	/** 同源文件请求路径；不含本地绝对路径 */
	requestPath: string;
	/** 已推断预览类型；控制媒体元素选择 */
	previewKind: PreviewKind;
};

function PreviewContent({
	// asset 是当前资源，用于图片 alt 与文本标题
	asset,
	// requestPath 是同源资源 URL，用于媒体元素 src
	requestPath,
	// previewKind 是推断后的展示类型，用于选择预览控件
	previewKind,
}: PreviewContentProps): ReactNode {
	if (previewKind === "image") {
		return (
			<div className={styles.previewStage}>
				<img
					src={requestPath}
					alt={asset.displayName}
					className={styles.previewImage}
				/>
			</div>
		);
	}
	if (previewKind === "audio") {
		return (
			<div className={styles.previewStage}>
				<audio controls className={styles.previewMedia} src={requestPath}>
					浏览器不支持音频预览。
				</audio>
			</div>
		);
	}
	if (previewKind === "video") {
		return (
			<div className={styles.previewStage}>
				<video controls className={styles.previewVideo} src={requestPath}>
					浏览器不支持视频预览。
				</video>
			</div>
		);
	}
	if (previewKind === "text") {
		return (
			<div className={styles.previewStage}>
				<iframe
					title={`${asset.displayName} 文本预览`}
					src={requestPath}
					className={styles.previewFrame}
				/>
			</div>
		);
	}
	return (
		// 引用了Alert组件，用于提示暂不支持的内嵌预览
		<Alert severity="info" className={styles.previewAlert}>
			此格式暂无内嵌预览，可通过请求路径打开或下载。
		</Alert>
	);
}

export const AssetFilePreview: FC<AssetFilePreviewProps> =
	function AssetFilePreview({
		// asset 是当前资源投影，用于展示路径与预览内容
		asset,
	}) {
		const requestPath = assetFilePreviewPath(asset.assetId);
		const previewKind = inferPreviewKind(asset);
		const canPreview = asset.availability === "ready";

		return (
			<div className={styles.previewBlock}>
				<div className={styles.requestPathHead}>
					{/* 引用了Typography组件，用于请求路径标签 */}
					<Typography variant="body2" className={styles.fieldLabel}>
						请求路径
					</Typography>
					{/* 引用了Button组件，用于新窗口打开资源文件 */}
					<Button
						size="small"
						variant="outlined"
						href={requestPath}
						target="_blank"
						rel="noreferrer"
					>
						{previewOpenLabel(previewKind)}
					</Button>
				</div>
				<div className={styles.requestPath} aria-label="资源请求路径">
					{requestPath}
				</div>

				{canPreview ? (
					// 引用了PreviewContent组件，用于按文件类型渲染预览控件
					<PreviewContent
						asset={asset}
						requestPath={requestPath}
						previewKind={previewKind}
					/>
				) : (
					// 引用了Alert组件，用于提示文件缺失不可预览
					<Alert severity="warning" className={styles.previewAlert}>
						文件不可用，无法预览。请重新上传或检查 data/assets/files。
					</Alert>
				)}
			</div>
		);
	};
