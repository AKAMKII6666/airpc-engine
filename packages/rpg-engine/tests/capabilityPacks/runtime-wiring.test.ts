/**
 * softExtraEnrichers / tasks.register / commit packExtras 运行时接线。
 */
import { describe, expect, it, vi } from "vitest";
import {
	applySoftExtraEnrichers,
	bootstrapTaskRegistrars,
	buildBeginCallSoftExtras,
} from "../../src/index.js";
import { assertSoftTasksCommitWiring } from "./runtime-wiring.helpers.js";

describe("applySoftExtraEnrichers", () => {
	it("appends non-empty blocks", () => {
		const out = applySoftExtraEnrichers({
			softExtras: ["[base]"],
			enrichers: [
				{
					enricherId: "a",
					apply() {
						return "  [pack-a]\nok  ";
					},
				},
				{
					enricherId: "b",
					apply() {
						return null;
					},
				},
				{
					enricherId: "c",
					apply() {
						return "   ";
					},
				},
			],
			profile: undefined,
			userId: "u1",
			agentId: "npc_a",
		});
		expect(out).toEqual(["[base]", "[pack-a]\nok"]);
	});
});

describe("buildBeginCallSoftExtras enrichers", () => {
	it("runs softExtraEnrichers", async () => {
		const soft = await buildBeginCallSoftExtras({
			userId: "u1",
			agentId: "npc_a",
			card: {
				schemaVersion: 1,
				cardId: "card_x",
				cardKind: "free",
				title: "t",
				agentId: "npc_a",
			} as never,
			nowIso: "2026-01-01T00:00:00.000Z",
			memory: null,
			profile: undefined,
			softExtraEnrichers: [
				{
					enricherId: "demo",
					apply() {
						return "[soft-pack]\nhello";
					},
				},
			],
		});
		expect(soft.some((s) => s.includes("[soft-pack]"))).toBe(true);
	});
});

describe("bootstrapTaskRegistrars", () => {
	it("calls register with packId", () => {
		const register = vi.fn();
		const result = bootstrapTaskRegistrars({
			registrars: [{ taskId: "t1", register }],
			packIdByTaskId: new Map([["t1", "pack_demo"]]),
		});
		expect(register).toHaveBeenCalledWith({ packId: "pack_demo" });
		expect(result.events).toEqual([]);
	});

	it("skips throwing registrar without aborting others", () => {
		const ok = vi.fn();
		const result = bootstrapTaskRegistrars({
			registrars: [
				{
					taskId: "bad",
					register() {
						throw new Error("boom");
					},
				},
				{ taskId: "ok", register: ok },
			],
			packIdByTaskId: new Map([
				["bad", "pack_bad"],
				["ok", "pack_ok"],
			]),
		});
		expect(ok).toHaveBeenCalledOnce();
		expect(result.events).toHaveLength(1);
		expect(result.events[0]).toMatchObject({
			type: "capabilityPack.merge_rejected",
			packId: "pack_bad",
		});
	});
});

describe("merge soft/tasks/commit wiring", () => {
	it("collects slots and mergePackCommitExtras merges bag", () => {
		assertSoftTasksCommitWiring();
	});
});
