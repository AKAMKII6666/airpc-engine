/**
	* ExitCondition v1：摘要派生、op 工厂、requiredBeats 联动（V2-S8-7/8）。
	*/
import { describe, expect, it } from "vitest";
import {
	buildExitConditionForOp,
	defaultExitCondition,
	isExitConditionV1Leaf,
	listBeatIdOptions,
	summarizeExitCondition,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";
import {
	emptyExitRow,
	normalizeExitList,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";

describe("exitConditionForm (V2-S8-7)", () => {
	it("summarizes leaf ops", () => {
		expect(summarizeExitCondition({ op: "always" })).toBe("始终");
		expect(
			summarizeExitCondition({ op: "all_required_beats_completed" }),
		).toBe("全部必做节拍完成");
		expect(
			summarizeExitCondition({
				op: "outcome_flag",
				flag: "answered_completed",
				equals: true,
			}),
		).toContain("已接通并完成");
		expect(
			summarizeExitCondition({
				op: "beat_completed",
				beatId: "b1",
			}),
		).toBe("节拍已完成 · b1");
	});

	it("marks nested as non-leaf and summarizes as read-only", () => {
		const nested = {
			op: "and" as const,
			items: [{ op: "always" as const }],
		};
		expect(isExitConditionV1Leaf(nested)).toBe(false);
		expect(summarizeExitCondition(nested)).toContain("只读");
	});

	it("buildExitConditionForOp switches leaf shapes", () => {
		expect(buildExitConditionForOp("always")).toEqual({ op: "always" });
		expect(buildExitConditionForOp("outcome_flag")).toEqual({
			op: "outcome_flag",
			flag: "answered_completed",
			equals: true,
		});
		expect(
			buildExitConditionForOp("beat_missing", {
				op: "beat_completed",
				beatId: "x",
			}),
		).toEqual({ op: "beat_missing", beatId: "x" });
		expect(defaultExitCondition().op).toBe("outcome_flag");
	});
});

describe("exitCondition write-path helpers (V2-S8-8)", () => {
	it("listBeatIdOptions unions requiredBeats with current beatId", () => {
		expect(listBeatIdOptions(["beat_a", "beat_b"], "beat_legacy")).toEqual([
			"beat_a",
			"beat_b",
			"beat_legacy",
		]);
		expect(listBeatIdOptions(["beat_a", "", "  "], "")).toEqual(["beat_a"]);
		expect(listBeatIdOptions(["beat_a"], "beat_a")).toEqual(["beat_a"]);
	});

	it("emptyExitRow seeds condition and derived summary", () => {
		const row = emptyExitRow([]);
		expect(row.condition).toEqual(defaultExitCondition());
		expect(row.conditionSummary).toBe(
			summarizeExitCondition(defaultExitCondition()),
		);
	});

	it("normalizeExitList keeps condition and does not invent DEFAULT when missing", () => {
		const withCondition = normalizeExitList([
			{
				exitId: "exit_1",
				priority: 1,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [],
			},
		]);
		expect(withCondition[0]?.condition).toEqual({ op: "always" });
		expect(withCondition[0]?.conditionSummary).toBe("始终");

		const withoutCondition = normalizeExitList([
			{
				exitId: "exit_2",
				priority: 0,
				conditionSummary: "旧摘要",
				effects: [],
			},
		]);
		expect(withoutCondition[0]?.condition).toBeUndefined();
		expect(withoutCondition[0]?.conditionSummary).toBe("旧摘要");
	});

	it("normalizeExitList does not let summary replace condition", () => {
		const rows = normalizeExitList([
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "beat_completed", beatId: "beat_a" },
				conditionSummary: "人话覆盖，不写盘",
				effects: [],
			},
		]);
		expect(rows[0]?.condition).toEqual({
			op: "beat_completed",
			beatId: "beat_a",
		});
		expect(rows[0]?.conditionSummary).toBe("人话覆盖，不写盘");
	});
});
