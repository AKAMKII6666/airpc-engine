/**
 * softExtraEnrichers / tasks.register / commit packExtras 运行时接线。
 */
import { describe, expect, it, vi } from "vitest";
import {
	applySoftExtraEnrichers,
	bootstrapTaskRegistrars,
	buildBeginCallSoftExtras,
	mergeCapabilityPacks,
	mergePackCommitExtras,
	type FirstPartyPack,
} from "../../src/index.js";

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
		const pack: FirstPartyPack = {
			manifest: {
				packId: "wire_demo",
				packVersion: "0.0.1",
				apiVersion: 1,
				domains: ["realtime", "background"],
			},
			contribute: {
				realtime: {
					"begin.softExtras": [
						{
							enricherId: "soft_1",
							apply() {
								return "[x]";
							},
						},
					],
					"commit.context": [
						{
							enricherId: "ctx_1",
							enrich() {
								return { fromContext: true };
							},
						},
					],
					"commit.extract": [
						{
							contributorId: "ext_1",
							contribute() {
								return { fromExtract: 1 };
							},
						},
					],
				},
				background: {
					"tasks.register": [
						{
							taskId: "task_1",
							register() {},
						},
					],
				},
			},
		};
		const merged = mergeCapabilityPacks({ packs: [pack], baseProviders: [] });
		expect(merged.softExtraEnrichers).toHaveLength(1);
		expect(merged.taskRegistrars).toHaveLength(1);
		expect(merged.packIdByTaskId.get("task_1")).toBe("wire_demo");
		expect(merged.commitContextEnrichers).toHaveLength(1);
		expect(merged.commitExtractContributors).toHaveLength(1);
		expect(
			mergePackCommitExtras({
				userId: "u",
				agentId: "a",
				sessionId: "s",
				contextEnrichers: merged.commitContextEnrichers,
				extractContributors: merged.commitExtractContributors,
			}),
		).toEqual({ fromContext: true, fromExtract: 1 });
	});
});
