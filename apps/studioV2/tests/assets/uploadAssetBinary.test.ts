/**
	* 头像/图片直传元数据组装单测。
	*/
import { describe, expect, it } from "vitest";
import {
	buildUploadedAssetMeta,
	buildUploadedImageAssetMeta,
	extFromMimeOrName,
	imageExtFromMime,
} from "@studio-v2/src/bis/pageBis/assets/uploadAssetBinary";

describe("uploadAssetBinary", () => {
	it("maps allowed avatar MIME to extension", () => {
		expect(imageExtFromMime("image/png")).toBe("png");
		expect(imageExtFromMime("image/jpeg")).toBe("jpg");
		expect(imageExtFromMime("image/webp")).toBe("webp");
		expect(imageExtFromMime("image/gif")).toBeNull();
	});

	it("builds image AssetMeta with pendingFile cleared and avatar usage", () => {
		const meta = buildUploadedImageAssetMeta({
			assetId: "asset_avatar_probe_1",
			displayName: "试传",
			ext: "png",
			mimeType: "image/png",
			byteLength: 12,
			usage: "avatar",
		});
		expect(meta.kind).toBe("image");
		expect(meta.uri).toBe("files/asset_avatar_probe_1.png");
		expect(meta.displayName).toBe("试传");
		expect(meta.meta?.pendingFile).toBe(false);
		expect(meta.meta?.usage).toBe("avatar");
		expect(meta.meta?.measureValue).toBe(12);
	});

	it("infers non-image resource metadata from uploaded file", () => {
		const meta = buildUploadedAssetMeta({
			assetId: "asset_opening_bgm",
			displayName: "",
			ext: extFromMimeOrName("audio/mpeg", "opening.mp3"),
			mimeType: "audio/mpeg",
			fileName: "opening.mp3",
			byteLength: 4096,
		});
		expect(meta.kind).toBe("wav");
		expect(meta.uri).toBe("files/asset_opening_bgm.mp3");
		expect(meta.displayName).toBe("opening");
		expect(meta.meta?.studioKind).toBe("bgm");
		expect(meta.meta?.format).toBe("mp3");
		expect(meta.meta?.measureUnit).toBe("duration_ms");
		expect(meta.meta?.measureValue).toBeNull();
	});

	it("falls back to file extension when MIME is unknown", () => {
		const meta = buildUploadedAssetMeta({
			assetId: "asset_notes",
			displayName: "设定稿",
			ext: extFromMimeOrName("", "notes.md"),
			mimeType: "",
			fileName: "notes.md",
			byteLength: 128,
		});
		expect(meta.kind).toBe("prompt_clip");
		expect(meta.uri).toBe("files/asset_notes.md");
		expect(meta.displayName).toBe("设定稿");
		expect(meta.meta?.studioKind).toBe("text");
		expect(meta.meta?.measureValue).toBe(128);
	});

	it("keeps uploaded video as file-managed resource", () => {
		const meta = buildUploadedAssetMeta({
			assetId: "asset_cutscene",
			displayName: "过场视频",
			ext: extFromMimeOrName("video/mp4", "cutscene"),
			mimeType: "video/mp4",
			fileName: "cutscene",
			byteLength: 8192,
		});
		expect(meta.kind).toBe("prompt_clip");
		expect(meta.uri).toBe("files/asset_cutscene.mp4");
		expect(meta.meta?.studioKind).toBe("other");
		expect(meta.meta?.format).toBe("mp4");
		expect(meta.meta?.measureUnit).toBe("size_bytes");
	});
});
