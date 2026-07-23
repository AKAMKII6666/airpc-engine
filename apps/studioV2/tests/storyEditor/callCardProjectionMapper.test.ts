/**
	* CallCard 投影 mapper：exitKind / priority / condition / critical roundtrip（V2-S8-6/7/8/9）。
	*/
import { describe, expect, it } from "vitest";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { Effect, ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import {
	callCardDefToProjection,
	callCardProjectionToDef,
	resolveExitCondition,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/callCardProjectionMapper";
import { defaultExitCondition } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";
import { normalizeExitList } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";

function sampleCard(
	effects: Effect[],
	condition: ExitCondition = { op: "always" },
	exitOverrides: {
		exitKind?: CallCardDefinition["exits"][number]["exitKind"];
		priority?: number;
		title?: string;
	} = {},
): CallCardDefinition {
	return {
		cardId: "probe_card",
		cardKind: "story",
		title: "探针卡",
		ownerAgentId: "lanxing",
		entryMode: "inbound_user_dial",
		interactionMode: "realtime_dialogue",
		context: { objective: "test" },
		exits: [
			{
				exitId: "exit_ok",
				exitKind: exitOverrides.exitKind ?? "handoff",
				priority: exitOverrides.priority ?? 0,
				title: exitOverrides.title,
				condition,
				effects,
			},
		],
	};
}

describe("callCardProjectionMapper critical (V2-S8-6)", () => {
	it("keeps critical:true through def → projection → def", () => {
		const def = sampleCard([
			{
				id: "fx_1",
				effect: "keep_card_pending",
				critical: true,
			},
		]);
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.effects[0]?.critical).toBe(true);
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.effects[0]?.critical).toBe(true);
	});

	it("omits critical when absent on write-back", () => {
		const def = sampleCard([
			{
				id: "fx_1",
				effect: "keep_card_pending",
			},
		]);
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.effects[0]?.critical).toBeUndefined();
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.effects[0]?.critical).toBeUndefined();
	});

	it("does not put critical into params bag", () => {
		const def = sampleCard([
			{
				id: "fx_1",
				effect: "set_character_unlocked",
				critical: true,
				agentId: "lanxing",
				unlocked: true,
			},
		]);
		const proj = callCardDefToProjection(def, "澜星");
		const params = proj.exits[0]?.effects[0]?.params as Record<
			string,
			unknown
		>;
		expect(proj.exits[0]?.effects[0]?.critical).toBe(true);
		expect(params.critical).toBeUndefined();
		expect(params.agentId).toBe("lanxing");
	});
});

describe("callCardProjectionMapper ExitCondition (V2-S8-7)", () => {
	it("loads leaf condition into projection and writes edited condition", () => {
		const def = sampleCard([], {
			op: "beat_completed",
			beatId: "beat_intro",
		});
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.condition).toEqual({
			op: "beat_completed",
			beatId: "beat_intro",
		});
		expect(proj.exits[0]?.conditionSummary).toContain("beat_intro");
		proj.exits[0] = {
			...proj.exits[0]!,
			condition: { op: "always" },
			conditionSummary: "始终",
		};
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.condition).toEqual({ op: "always" });
	});

	it("preserves nested and/or condition through roundtrip", () => {
		const nested: ExitCondition = {
			op: "and",
			items: [
				{ op: "always" },
				{ op: "all_required_beats_completed" },
			],
		};
		const def = sampleCard([], nested);
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.condition).toEqual(nested);
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.condition).toEqual(nested);
	});
});

describe("callCardProjectionMapper condition write (V2-S8-8)", () => {
	it("falls back to base nested condition when proj.condition is missing", () => {
		const nested: ExitCondition = {
			op: "or",
			items: [{ op: "always" }, { op: "all_required_beats_completed" }],
		};
		const def = sampleCard([], nested);
		const proj = callCardDefToProjection(def, "澜星");
		const stripped = {
			...proj,
			exits: [
				{
					...proj.exits[0]!,
					condition: undefined,
					conditionSummary: "假摘要",
				},
			],
		};
		const back = callCardProjectionToDef(stripped, def);
		expect(back.exits[0]?.condition).toEqual(nested);
		expect(back.exits[0]?.condition).not.toEqual(defaultExitCondition());
	});

	it("resolveExitCondition prefers proj then base then default", () => {
		const base = {
			exitId: "exit_ok",
			priority: 0,
			condition: {
				op: "and" as const,
				items: [{ op: "always" as const }],
			},
			effects: [],
		};
		expect(
			resolveExitCondition(
				{
					exitId: "exit_ok",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [],
				},
				base,
			),
		).toEqual({ op: "always" });
		expect(
			resolveExitCondition(
				{
					exitId: "exit_ok",
					priority: 0,
					conditionSummary: "",
					effects: [],
				},
				base,
			),
		).toEqual(base.condition);
		expect(
			resolveExitCondition({
				exitId: "exit_new",
				priority: 0,
				conditionSummary: "",
				effects: [],
			}),
		).toEqual(defaultExitCondition());
	});

	it("writes edited leaf condition even when summary text differs", () => {
		const def = sampleCard([], {
			op: "outcome_flag",
			flag: "answered_completed",
			equals: true,
		});
		const proj = callCardDefToProjection(def, "澜星");
		proj.exits[0] = {
			...proj.exits[0]!,
			condition: { op: "beat_completed", beatId: "beat_from_required" },
			conditionSummary: "任意人话，不得替代 condition",
		};
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.condition).toEqual({
			op: "beat_completed",
			beatId: "beat_from_required",
		});
	});
});

describe("callCardProjectionMapper exitKind/priority roundtrip (V2-S8-9)", () => {
	it("keeps exitKind and priority through def → projection → def", () => {
		const def = sampleCard(
			[],
			{ op: "always" },
			{ exitKind: "terminal", priority: 42, title: "终结出口" },
		);
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.exitKind).toBe("terminal");
		expect(proj.exits[0]?.priority).toBe(42);
		expect(proj.exits[0]?.title).toBe("终结出口");
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.exitKind).toBe("terminal");
		expect(back.exits[0]?.priority).toBe(42);
		expect(back.exits[0]?.title).toBe("终结出口");
	});

	it("writes edited exitKind and priority without inventing handoff", () => {
		const def = sampleCard(
			[],
			{ op: "always" },
			{ exitKind: "recovery", priority: 1 },
		);
		const proj = callCardDefToProjection(def, "澜星");
		proj.exits[0] = {
			...proj.exits[0]!,
			exitKind: "callback",
			priority: 99,
		};
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.exitKind).toBe("callback");
		expect(back.exits[0]?.priority).toBe(99);
	});

	it("defaults missing priority to 0 on load and preserves undefined exitKind", () => {
		// 模拟 Zod parse 前磁盘缺 priority；mapper 须 ?? 0 且不发明 exitKind
		const bareExit = {
			exitId: "exit_bare",
			condition: { op: "always" as const },
			effects: [],
		} as unknown as CallCardDefinition["exits"][number];
		const def: CallCardDefinition = {
			cardId: "probe_card",
			cardKind: "story",
			title: "探针卡",
			ownerAgentId: "lanxing",
			entryMode: "inbound_user_dial",
			interactionMode: "realtime_dialogue",
			context: { objective: "test" },
			exits: [bareExit],
		};
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.exitKind).toBeUndefined();
		expect(proj.exits[0]?.priority).toBe(0);
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.exitKind).toBeUndefined();
		expect(back.exits[0]?.priority).toBe(0);
	});

	it("roundtrips exitKind + priority + condition + critical together", () => {
		const condition: ExitCondition = {
			op: "beat_missing",
			beatId: "beat_gate",
		};
		const def = sampleCard(
			[
				{
					id: "fx_crit",
					effect: "keep_card_pending",
					critical: true,
				},
			],
			condition,
			{ exitKind: "failure", priority: 7 },
		);
		const proj = callCardDefToProjection(def, "澜星");
		expect(proj.exits[0]?.exitKind).toBe("failure");
		expect(proj.exits[0]?.priority).toBe(7);
		expect(proj.exits[0]?.condition).toEqual(condition);
		expect(proj.exits[0]?.effects[0]?.critical).toBe(true);

		proj.exits[0] = {
			...proj.exits[0]!,
			exitKind: "handoff",
			priority: 15,
			condition: { op: "all_required_beats_completed" },
			conditionSummary: "全部必做节拍完成",
		};
		const back = callCardProjectionToDef(proj, def);
		expect(back.exits[0]?.exitKind).toBe("handoff");
		expect(back.exits[0]?.priority).toBe(15);
		expect(back.exits[0]?.condition).toEqual({
			op: "all_required_beats_completed",
		});
		expect(back.exits[0]?.effects[0]?.critical).toBe(true);
	});

	it("normalizeExitList keeps exitKind/priority/condition/critical for write-back", () => {
		const rows = normalizeExitList([
			{
				exitId: "exit_form",
				exitKind: "callback",
				priority: 33,
				condition: { op: "outcome_flag", flag: "answered_completed", equals: false },
				conditionSummary: "人话不进盘",
				effects: [
					{
						id: "fx_1",
						effect: "keep_card_pending",
						critical: true,
					},
				],
			},
		]);
		expect(rows[0]?.exitKind).toBe("callback");
		expect(rows[0]?.priority).toBe(33);
		expect(rows[0]?.condition).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: false,
		});
		expect(rows[0]?.effects[0]?.critical).toBe(true);

		const back = callCardProjectionToDef(
			{
				cardId: "probe_card",
				cardKind: "story",
				title: "探针卡",
				ownerAgentId: "lanxing",
				ownerDisplayName: "澜星",
				entryMode: "inbound_user_dial",
				interactionMode: "realtime_dialogue",
				context: { objective: "test" },
				exits: rows,
				validationBadge: "ok",
			},
			undefined,
		);
		expect(back.exits[0]?.exitKind).toBe("callback");
		expect(back.exits[0]?.priority).toBe(33);
		expect(back.exits[0]?.condition).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: false,
		});
		expect(back.exits[0]?.effects[0]?.critical).toBe(true);
	});
});
