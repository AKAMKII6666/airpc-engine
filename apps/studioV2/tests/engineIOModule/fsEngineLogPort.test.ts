/**
 * 模块名称：engineIOModule FsEngineLogPort 验收测（自引擎迁出后）
 */
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// 引用了本机 Fs EngineLog 工厂，用于验收迁出后的 jsonl 行为等价
import { createFsEngineLogPort } from "../../engineIOModule/log/fsEngineLogPort";

describe("FsEngineLogPort", () => {
	let tmp: string | undefined;

	afterEach(async () => {
		if (tmp) {
			await rm(tmp, { recursive: true, force: true });
			tmp = undefined;
		}
	});

	async function setup() {
		tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-enginelog-"));
		return createFsEngineLogPort(tmp);
	}

	it("readSlice 无文件返回空 lines", async () => {
		const port = await setup();
		const slice = await port.readSlice({ day: "20990101" });
		expect(slice.lines).toEqual([]);
		expect(slice.truncated).toBe(false);
		expect(slice.locator).toContain("engine-20990101.jsonl");
	});

	it("append 脱敏后落盘；readSlice 尾部切片", async () => {
		const port = await setup();
		await port.append({
			record: {
				at: "2026-07-01T00:00:00.000Z",
				type: "test.event",
				userId: "u1",
				payload: {
					openingSpeakable: "hi",
					openingPrivate: "secret",
					nested: { privateBrief: "x" },
				},
			},
		});
		const files = await readFile(
			path.join(tmp!, "logs", `engine-${utcDayStamp()}.jsonl`),
			"utf8",
		);
		const row = JSON.parse(files.trim()) as {
			payload: Record<string, unknown>;
		};
		expect(row.payload.openingSpeakable).toBe("hi");
		expect(row.payload.openingPrivate).toBe("[redacted]");
		expect(
			(row.payload.nested as { privateBrief: string }).privateBrief,
		).toBe("[redacted]");

		const slice = await port.readSlice({ limit: 10 });
		expect(slice.lines).toHaveLength(1);
		expect(slice.lines[0]?.type).toBe("test.event");
		expect(slice.truncated).toBe(false);
	});

	it("readSlice truncated 当行数超过 limit", async () => {
		const port = await setup();
		const day = "20260715";
		const dir = path.join(tmp!, "logs");
		await mkdir(dir, { recursive: true });
		const lines = Array.from({ length: 5 }, (_, i) =>
			JSON.stringify({
				at: `2026-07-15T00:00:0${i}.000Z`,
				type: "wet.annotation",
				userId: "u",
			}),
		).join("\n");
		await writeFile(path.join(dir, `engine-${day}.jsonl`), lines + "\n", "utf8");
		const slice = await port.readSlice({ day, limit: 2 });
		expect(slice.lines).toHaveLength(2);
		expect(slice.truncated).toBe(true);
		expect(slice.lines[1]?.at).toBe("2026-07-15T00:00:04.000Z");
	});
});

function utcDayStamp(day = new Date()): string {
	const y = day.getUTCFullYear();
	const m = String(day.getUTCMonth() + 1).padStart(2, "0");
	const d = String(day.getUTCDate()).padStart(2, "0");
	return `${y}${m}${d}`;
}
