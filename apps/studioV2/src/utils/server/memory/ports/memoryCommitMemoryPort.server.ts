/**
	* MemoryCommit Orchestrating Port：在底层 MemoryPort 外包一层抽取编排。
	*/
import type {
	MemoryCommitInput,
	MemoryCommitResult,
	MemoryPort,
} from "@airpc/rpg-engine";
import {
	createMemoryCommitOrchestrator,
	type MemoryCommitOrchestratorOptions,
} from "../commit/memoryCommitOrchestrator.server";

export {
	createMemoryCommitOrchestrator,
	type MemoryCommitOrchestratorOptions,
} from "../commit/memoryCommitOrchestrator.server";

export function createMemoryCommitOrchestratingPort(
	base: MemoryPort,
	options: MemoryCommitOrchestratorOptions = {},
): MemoryPort {
	const orchestrator = createMemoryCommitOrchestrator(base, {
		...options,
		listRecentAttitudes:
			options.listRecentAttitudes ??
			(base.listRecentAttitudes
				? function (input: {
						userId: string;
						agentId: string;
						limit: number;
					}) {
						return base.listRecentAttitudes!(input);
					}
				: undefined),
	});
	return {
		projectForCall(input: Parameters<MemoryPort["projectForCall"]>[0]) {
			return base.projectForCall(input);
		},
		search(input: Parameters<MemoryPort["search"]>[0]) {
			return base.search(input);
		},
		listRecentAttitudes: base.listRecentAttitudes
			? function (input: {
					userId: string;
					agentId: string;
					limit: number;
				}) {
					return base.listRecentAttitudes!(input);
				}
			: undefined,
		getById(input: Parameters<MemoryPort["getById"]>[0]) {
			return base.getById(input);
		},
		applyPatch(input: Parameters<MemoryPort["applyPatch"]>[0]) {
			return base.applyPatch(input);
		},
		commitAfterCall(input: MemoryCommitInput): Promise<MemoryCommitResult> {
			return orchestrator.commitAfterCall(input);
		},
		rollupIfNeeded: base.rollupIfNeeded
			? function (input: {
					userId: string;
					agentId: string;
					endedAt: string;
				}) {
					return base.rollupIfNeeded!(input);
				}
			: undefined,
		close: base.close
			? function () {
					return base.close!();
				}
			: undefined,
	};
}

export const createMemoryCommitExtractingPort =
	createMemoryCommitOrchestratingPort;
