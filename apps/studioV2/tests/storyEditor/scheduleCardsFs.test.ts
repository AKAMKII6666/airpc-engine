/**
	* schedule-cards 落盘：list / 校验 id；与故事包 cards 分工。
	*/
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("scheduleCardsFs", () => {
	let tmpRoot: string | undefined;
	let prevCwd: string | undefined;

	beforeEach(async () => {
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-fs-"));
		const dataRoot = path.join(tmpRoot, "data");
		await mkdir(path.join(dataRoot, "characters", "schedule-cards"), {
			recursive: true,
		});
		await writeFile(
			path.join(dataRoot, "workspace.json"),
			JSON.stringify({ schemaVersion: 1, title: "tmp" }) + "\n",
			"utf8",
		);
		await writeFile(
			path.join(
				dataRoot,
				"characters/schedule-cards/demo_morning.s-card.json",
			),
			JSON.stringify({
				cardId: "demo_morning",
				cardKind: "schedule",
				title: "晨间",
				ownerAgentId: "lanxing",
				exits: [],
			}) + "\n",
			"utf8",
		);
		prevCwd = process.cwd();
		process.chdir(tmpRoot);
		vi.resetModules();
	});

	afterEach(async () => {
		if (prevCwd) process.chdir(prevCwd);
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
		}
		vi.resetModules();
	});

	it("lists cardIds under characters/schedule-cards", async () => {
		const {
			listScheduleCardIds,
			isValidScheduleCardId,
			readScheduleCardJson,
		} = await import(
			"@studio-v2/src/utils/server/characters/scheduleCardsFs.server"
		);
		expect(isValidScheduleCardId("demo_morning")).toBe(true);
		expect(await listScheduleCardIds()).toEqual(["demo_morning"]);
		const raw = (await readScheduleCardJson("demo_morning")) as {
			cardKind: string;
		};
		expect(raw.cardKind).toBe("schedule");
	});
});
