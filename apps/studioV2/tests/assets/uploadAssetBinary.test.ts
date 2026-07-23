/**
	* 头像/图片直传元数据组装单测。
	*/
import { describe, expect, it } from "vitest";
import {
	buildUploadedImageAssetMeta,
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
});
