/**
 * FC 剧本块：按 allowlist 裁剪 + 交叉互斥句
 */
import { describe, expect, it } from "vitest";
import {
	buildAcquaintanceSoftExtra,
	buildToolInstructionBlocks,
} from "../../src/index.js";

describe("buildToolInstructionBlocks", () => {
	it("returns empty for empty allowlist", () => {
		expect(buildToolInstructionBlocks([])).toEqual([]);
	});

	it("wraps blocks under [tools] for a single business tool", () => {
		const blocks = buildToolInstructionBlocks(["schedule_reminder_call"]);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatch(/^\[tools\]/);
		expect(blocks[0]).toMatch(/口头预约回电/);
		expect(blocks[0]).toMatch(/schedule_reminder_call/);
		expect(blocks[0]).not.toMatch(/专家介绍优先/);
	});

	it("adds expert-priority line when research and expert tools both open", () => {
		const both = buildToolInstructionBlocks([
			"refer_to_expert",
			"create_research_commitment",
		]).join("\n");
		expect(both).toMatch(/专家介绍优先|必须先走/);
		expect(both).toMatch(/create_research_commitment/);
		expect(both).toMatch(/refer_to_expert/);
	});

	it("omits expert-priority when only research is open", () => {
		const only = buildToolInstructionBlocks([
			"create_research_commitment",
		]).join("\n");
		expect(only).toMatch(/研究回拨/);
		expect(only).not.toMatch(/专家介绍优先/);
	});

	it("cross-links reminder and recurring when both open", () => {
		const text = buildToolInstructionBlocks([
			"schedule_reminder_call",
			"schedule_recurring_call",
		]).join("\n");
		expect(text).toMatch(/schedule_recurring_call/);
		expect(text).toMatch(/schedule_reminder_call/);
		expect(text).toMatch(/固定每天|过 X 分钟/);
	});

	it("includes path A/B mutex when both expert tools open", () => {
		const text = buildToolInstructionBlocks([
			"share_expert_number",
			"refer_to_expert",
		]).join("\n");
		expect(text).toMatch(/路径 A/);
		expect(text).toMatch(/路径 B/);
		expect(text).toMatch(/不可再走/);
	});

	it("includes memory guidance when memory tools open", () => {
		const text = buildToolInstructionBlocks([
			"search_memory",
			"get_memory_by_id",
		]).join("\n");
		expect(text).toMatch(/记忆召回/);
		expect(text).toMatch(/search_memory/);
		expect(text).toMatch(/get_memory_by_id/);
	});

	it("unknown name: keeps first-learn script for record_user_name", () => {
		const text = buildToolInstructionBlocks(["record_user_name"]).join("\n");
		expect(text).toMatch(/好，我记住啦/);
		expect(text).toMatch(/record_user_name/);
		expect(text).not.toMatch(/你已认识用户日常称呼/);
	});

	it("knownNickname: forbids first-learn script and repeat FC", () => {
		const text = buildToolInstructionBlocks(["record_user_name"], {
			knownNickname: "廖力",
		}).join("\n");
		expect(text).toMatch(/你已认识用户日常称呼「廖力」/);
		expect(text).toMatch(/禁止/);
		expect(text).toMatch(/好，我记住啦/);
		expect(text).toMatch(/再调用/);
		expect(text).not.toMatch(/1\. 先用口语认真回应（如「好，我记住啦」）/);
	});
});

describe("buildToolInstructionBlocks for bazi", () => {
	it("includes guidance only when compute_bazi_chart is open", () => {
		const text = buildToolInstructionBlocks(["compute_bazi_chart"]).join("\n");
		expect(text).toMatch(/八字排盘/);
		expect(text).toMatch(/compute_bazi_chart/);
		expect(text).toMatch(/禁止自行编造/);
		expect(text).toMatch(/重大决定/);
	});
});

describe("buildAcquaintanceSoftExtra", () => {
	it("returns null when nickname missing or blank", () => {
		expect(buildAcquaintanceSoftExtra(undefined)).toBeNull();
		expect(buildAcquaintanceSoftExtra(null)).toBeNull();
		expect(buildAcquaintanceSoftExtra("")).toBeNull();
		expect(buildAcquaintanceSoftExtra("   ")).toBeNull();
	});

	it("injects recognition block with known nickname", () => {
		const block = buildAcquaintanceSoftExtra("廖力");
		expect(block).toMatch(/^\[acquaintance\]/);
		expect(block).toMatch(/已认识「廖力」/);
		expect(block).toMatch(/哦是你啊/);
		expect(block).toMatch(/禁止再演初次记名/);
		expect(block).toMatch(/接听瞬间仍可当陌生来电/);
	});
});
