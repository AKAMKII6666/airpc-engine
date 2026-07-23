/**
 * 模块名称：engineIOModule FsContentPort 验收测（自引擎迁出后）
 */
import { cp, mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "@airpc/rpg-engine";
// 引用了本机 Fs Content 工厂，用于验收迁出后的 Workspace/读卡行为等价
import { createFsContentPort } from "../../engineIOModule/content/fsContentPort";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("FsContentPort", () => {
	let tmp: string | undefined;

	afterEach(async () => {
		if (tmp) {
			await rm(tmp, { recursive: true, force: true });
			tmp = undefined;
		}
	});

	/**
	 * 只拷稳定夹具，禁止整树 cp(data/)：
	 * storiesFs 等用例会在共享 data/storis-packages 下建删探针包，
	 * 整树递归拷贝会与其竞态（ENOENT opendir studio_v2_*）。
	 */
	async function setupDataRoot() {
		tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-content-"));
		const dataRoot = path.join(tmp, "data");
		await mkdir(dataRoot, { recursive: true });
		await mkdir(path.join(dataRoot, "storis-packages"), { recursive: true });
		await cp(
			path.join(dataSrc, "workspace.json"),
			path.join(dataRoot, "workspace.json"),
		);
		await cp(
			path.join(dataSrc, "characters"),
			path.join(dataRoot, "characters"),
			{ recursive: true },
		);
		await cp(
			path.join(dataSrc, "storis-packages", "golden_handoff"),
			path.join(dataRoot, "storis-packages", "golden_handoff"),
			{ recursive: true },
		);
		return { port: createFsContentPort(), dataRoot };
	}

	it("loadWorkspaceSnapshot 加载 packages / characters / freeCards", async () => {
		const { port, dataRoot } = await setupDataRoot();
		const snap = await port.loadWorkspaceSnapshot({
			workspaceKey: dataRoot,
		});
		expect(snap.workspaceKey).toBe(dataRoot);
		expect(snap.packages.some((p) => p.packageId === "golden_handoff")).toBe(
			true,
		);
		expect(snap.characters.length).toBeGreaterThan(0);
		expect(snap.freeCards.length).toBeGreaterThan(0);
		// 不预读故事卡正文：packages 无 cards 字段
		expect(
			snap.packages.every((p) => p.conf.packageId === p.packageId),
		).toBe(true);
	});

	it("readCard 按需读故事卡；缺失返回 null", async () => {
		const { port, dataRoot } = await setupDataRoot();
		const card = await port.readCard({
			workspaceKey: dataRoot,
			packageId: "golden_handoff",
			cardId: "demo_playback_hello",
		});
		expect(card?.cardId).toBe("demo_playback_hello");
		const missing = await port.readCard({
			workspaceKey: dataRoot,
			packageId: "golden_handoff",
			cardId: "no_such_card",
		});
		expect(missing).toBeNull();
	});

	it("schemaVersion 不支持 throw SCHEMA_UNSUPPORTED", async () => {
		const { port, dataRoot } = await setupDataRoot();
		await writeFile(
			path.join(dataRoot, "workspace.json"),
			JSON.stringify({ schemaVersion: 99 }),
			"utf8",
		);
		await expect(
			port.loadWorkspaceSnapshot({ workspaceKey: dataRoot }),
		).rejects.toSatisfy(function (err: unknown) {
			return isEngineError(err) && err.code === "SCHEMA_UNSUPPORTED";
		});
	});

	it("loadPackageForValidate 返回 conf + cards", async () => {
		const { port, dataRoot } = await setupDataRoot();
		const bundle = await port.loadPackageForValidate({
			workspaceKey: dataRoot,
			packageId: "golden_handoff",
		});
		expect(bundle.conf?.packageId).toBe("golden_handoff");
		expect(bundle.cards.length).toBeGreaterThan(0);
		expect(bundle.characters.length).toBeGreaterThan(0);
	});

	it("assetMetaExists / readAssetMeta", async () => {
		tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-content-asset-"));
		const dataRoot = path.join(tmp, "data");
		await mkdir(path.join(dataRoot, "assets", "meta"), { recursive: true });
		await writeFile(
			path.join(dataRoot, "workspace.json"),
			JSON.stringify({ schemaVersion: 1 }),
			"utf8",
		);
		await writeFile(
			path.join(dataRoot, "assets", "meta", "clip_a.json"),
			JSON.stringify({
				assetId: "clip_a",
				kind: "wav",
				uri: "files/clip_a.wav",
			}),
			"utf8",
		);
		const port = createFsContentPort();
		expect(
			await port.assetMetaExists({
				workspaceKey: dataRoot,
				assetId: "clip_a",
			}),
		).toBe(true);
		const meta = await port.readAssetMeta({
			workspaceKey: dataRoot,
			assetId: "clip_a",
		});
		expect(meta?.uri).toBe("files/clip_a.wav");
		expect(
			await port.assetMetaExists({
				workspaceKey: dataRoot,
				assetId: "missing",
			}),
		).toBe(false);
	});
});
