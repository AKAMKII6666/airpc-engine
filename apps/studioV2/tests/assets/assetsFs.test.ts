/**
	* assetsFs：对真实 data/assets 做只读 + 临时资产 CRUD（测后清理）。
	*/
import { describe, expect, it } from "vitest";
import {
	assetFileExists,
	assetMetaExists,
	deleteAssetMetaJson,
	listAssetIds,
	readAssetFileBytes,
	readAssetMetaJson,
	writeAssetFileBytes,
	writeAssetMetaJson,
} from "@studio-v2/src/utils/server/assets/assetsFs.server";

describe("assetsFs.server", () => {
	it("lists existing clip_hello and probes its wav", async () => {
		const ids = await listAssetIds();
		expect(ids).toContain("clip_hello");
		const raw = (await readAssetMetaJson("clip_hello")) as {
			uri?: string;
			kind?: string;
		};
		expect(raw.kind).toBe("wav");
		expect(typeof raw.uri).toBe("string");
		expect(await assetFileExists(String(raw.uri))).toBe(true);
	});

	it("writes and deletes a temporary meta without touching clip_hello", async () => {
		const assetId = "asset_s8_12_tmp_probe";
		if (await assetMetaExists(assetId)) {
			await deleteAssetMetaJson(assetId);
		}
		await writeAssetMetaJson(assetId, {
			assetId,
			kind: "wav",
			uri: "files/asset_s8_12_tmp_probe.pending",
			displayName: "S8-12 临时",
			meta: { pendingFile: true },
		});
		expect(await assetMetaExists(assetId)).toBe(true);
		expect(await listAssetIds()).toContain(assetId);
		expect(
			await assetFileExists("files/asset_s8_12_tmp_probe.pending"),
		).toBe(false);

		await deleteAssetMetaJson(assetId);
		expect(await assetMetaExists(assetId)).toBe(false);
		expect(await listAssetIds()).toContain("clip_hello");
	});

	it("writes and reads avatar binary under files/", async () => {
		const assetId = "asset_s8_14_tmp_avatar";
		const uri = `files/${assetId}.png`;
		if (await assetMetaExists(assetId)) {
			await deleteAssetMetaJson(assetId);
		}
		const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
		await writeAssetFileBytes(uri, bytes);
		expect(await assetFileExists(uri)).toBe(true);
		const readBack = await readAssetFileBytes(uri);
		expect(Buffer.from(readBack)).toEqual(Buffer.from(bytes));

		await writeAssetMetaJson(assetId, {
			assetId,
			kind: "image",
			uri,
			displayName: "S8-14 临时头像",
			meta: { pendingFile: false, usage: "avatar" },
		});
		await deleteAssetMetaJson(assetId);
		expect(await assetFileExists(uri)).toBe(false);
		expect(await listAssetIds()).toContain("clip_hello");
	});
});
