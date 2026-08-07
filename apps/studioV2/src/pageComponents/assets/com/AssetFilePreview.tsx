/**
	* 资源文件预览：复用 /api/assets/:assetId/file，同步展示只读请求路径。
	*/
"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { Alert, Button, Typography } from "@mui/material";
import { assetFilePreviewUrl } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetFilePreviewProps = {
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

export const AssetFilePreview: FC<AssetFilePreviewProps> =
	function AssetFilePreview({ asset }) {
		const requestPath = assetFilePreviewUrl(asset.assetId);
		const previewKind = inferPreviewKind(asset);
		const [textPreview, setTextPreview] = useState("");
		const [textError, setTextError] = useState("");

		const canPreview = asset.availability === "ready";

		const openLabel = useMemo(() => {
			if (previewKind === "other") return "打开文件";
			return "新窗口打开";
		}, [previewKind]);

		useEffect(() => {
			let cancelled = false;
			setTextPreview("");
			setTextError("");
			if (!canPreview || previewKind !== "text") return;
			fetch(requestPath)
				.then(async (res) => {
					if (!res.ok) {
						throw new Error(`读取失败：${res.status}`);
					}
					const text = await res.text();
					if (!cancelled) setTextPreview(text.slice(0, 12000));
				})
				.catch((err: unknown) => {
					if (!cancelled) {
						setTextError(err instanceof Error ? err.message : String(err));
					}
				});
			return () => {
				cancelled = true;
			};
		}, [canPreview, previewKind, requestPath]);

		return (
			<div className={styles.previewBlock}>
				<div className={styles.requestPathHead}>
					<Typography variant="body2" className={styles.fieldLabel}>
						请求路径
					</Typography>
					<Button
						size="small"
						variant="outlined"
						href={requestPath}
						target="_blank"
						rel="noreferrer"
					>
						{openLabel}
					</Button>
				</div>
				<div className={styles.requestPath} aria-label="资源请求路径">
					{requestPath}
				</div>

				{!canPreview ? (
					<Alert severity="warning" className={styles.previewAlert}>
						文件不可用，无法预览。请重新上传或检查 data/assets/files。
					</Alert>
				) : null}

				{canPreview && previewKind === "image" ? (
					<div className={styles.previewStage}>
						<img
							src={requestPath}
							alt={asset.displayName}
							className={styles.previewImage}
						/>
					</div>
				) : null}

				{canPreview && previewKind === "audio" ? (
					<div className={styles.previewStage}>
						<audio controls className={styles.previewMedia} src={requestPath}>
							浏览器不支持音频预览。
						</audio>
					</div>
				) : null}

				{canPreview && previewKind === "video" ? (
					<div className={styles.previewStage}>
						<video controls className={styles.previewVideo} src={requestPath}>
							浏览器不支持视频预览。
						</video>
					</div>
				) : null}

				{canPreview && previewKind === "text" ? (
					<div className={styles.previewStage}>
						{textError ? (
							<Alert severity="warning">{textError}</Alert>
						) : (
							<pre className={styles.previewText}>
								{textPreview || "正在读取文本..."}
							</pre>
						)}
					</div>
				) : null}

				{canPreview && previewKind === "other" ? (
					<Alert severity="info" className={styles.previewAlert}>
						此格式暂无内嵌预览，可通过请求路径打开或下载。
					</Alert>
				) : null}
			</div>
		);
	};
