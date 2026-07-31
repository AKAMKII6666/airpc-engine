/**
 * 测试用：复制 data/ 到临时目录并加载 Host（避免直写只读 data/）。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestHost } from "./inMemoryMemoryPort.js";
import type { CreateEngineHostOptions } from "../../src/ports/engineHostApi.js";

const dataSrc = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../../data",
);

export async function withCopiedDataHost(
	opts: Omit<CreateEngineHostOptions, "dataRoot"> = {},
): Promise<{
	host: ReturnType<typeof createTestHost>;
	dataRoot: string;
	cleanup: () => Promise<void>;
}> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-data-copy-"));
	const dataRoot = path.join(tmpRoot, "data");
	await cp(dataSrc, dataRoot, { recursive: true });
	const host = createTestHost({ ...opts, persist: false, dataRoot });
	await host.loadWorkspace(dataRoot, { resetRuntime: true });
	return {
		host,
		dataRoot,
		cleanup: async function () {
			await rm(tmpRoot, { recursive: true, force: true });
		},
	};
}
