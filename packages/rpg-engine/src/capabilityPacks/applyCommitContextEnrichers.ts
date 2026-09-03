/**
 * commit.context / commit.extract：合并 Pack 贡献到 MemoryCommitInput.commitContext.packExtras。
 * 引擎组装基础字段；Studio Orchestrator 可再跑 extract 贡献。
 */
import type {
	CommitContextEnricher,
	CommitExtractContributor,
} from "./contributeTypes.js";

export function mergePackCommitExtras(input: {
	userId: string;
	agentId: string;
	sessionId: string;
	contextEnrichers?: readonly CommitContextEnricher[];
	extractContributors?: readonly CommitExtractContributor[];
}): Record<string, unknown> | undefined {
	const bag: Record<string, unknown> = {};
	for (const enricher of input.contextEnrichers ?? []) {
		const patch = enricher.enrich({
			userId: input.userId,
			agentId: input.agentId,
			sessionId: input.sessionId,
		});
		if (patch && typeof patch === "object") {
			Object.assign(bag, patch);
		}
	}
	for (const contributor of input.extractContributors ?? []) {
		const patch = contributor.contribute({
			userId: input.userId,
			agentId: input.agentId,
			sessionId: input.sessionId,
		});
		if (patch && typeof patch === "object") {
			Object.assign(bag, patch);
		}
	}
	return Object.keys(bag).length > 0 ? bag : undefined;
}
