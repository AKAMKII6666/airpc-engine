/**
 * soft/tasks/commit 接线测：收集槽位并合并 commit extras。
 */
import { expect } from "vitest";
import {
	mergeCapabilityPacks,
	mergePackCommitExtras,
	type FirstPartyPack,
} from "../../src/index.js";

function buildWireDemoPack(): FirstPartyPack {
	return {
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
}

export function assertSoftTasksCommitWiring(): void {
	const merged = mergeCapabilityPacks({
		packs: [buildWireDemoPack()],
		baseProviders: [],
	});
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
}
