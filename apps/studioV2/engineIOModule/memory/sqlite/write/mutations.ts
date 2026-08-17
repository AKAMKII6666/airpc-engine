/**
	* 模块名称：MemoryPort getById / applyPatch / commitAfterCall
	*/
import {
	MEMORY_SEARCH_DEFAULTS,
	summarizeUserFactTranscript,
	validateMemoryPatchInput,
	type MemoryCommitInput,
	type MemoryCommitResult,
	type MemorySearchHit,
} from "@airpc/rpg-engine";
import { truncate } from "../util/helpers";
import type { createInsertEntry } from "./insertEntry";
import type { EntryRow, SqlDb } from "../db/types";

type InsertFn = ReturnType<typeof createInsertEntry>;

function summaryFromTranscript(value: unknown): string | null {
	return summarizeUserFactTranscript(value);
}

function commitItemLayerKind(
	kind: string,
): { layer: string; kind: string } | null {
	switch (kind) {
		case "vignette":
			return { layer: "episodic", kind: "vignette" };
		case "user_fact":
			return { layer: "semantic", kind: "semantic" };
		case "shared_event":
			return { layer: "relational", kind: "shared_event" };
		case "social_share":
			return { layer: "relational", kind: "social_share" };
		case "emotion":
			return { layer: "affect", kind: "emotion" };
		case "attitude":
			return { layer: "relational", kind: "attitude" };
		case "promise":
			return { layer: "commitments", kind: "promise" };
		default:
			return null;
	}
}

export async function getMemoryById(
	db: SqlDb,
	input: { userId: string; agentId: string; entryId: string },
): Promise<MemorySearchHit | null> {
	const row = db
		.prepare(
			"SELECT id, user_id, agent_id, layer, kind, text, at, created_at FROM memory_entries WHERE id = ? AND user_id = ? AND agent_id = ?",
		)
		.get(input.entryId, input.userId, input.agentId) as EntryRow | undefined;
	if (!row) return null;
	return {
		id: row.id,
		layer: row.layer,
		kind: row.kind ?? undefined,
		text: truncate(row.text, MEMORY_SEARCH_DEFAULTS.getByIdChars),
		at: row.at,
		createdAt: row.created_at,
	};
}

export async function applyMemoryPatch(
	insertEntry: InsertFn,
	input: {
		userId: string;
		agentId: string;
		layer: string;
		op?: string;
		payload: unknown;
	},
): Promise<void> {
	const patch = validateMemoryPatchInput({
		agentId: input.agentId,
		layer: input.layer,
		op: input.op ?? "insert",
		payload: input.payload,
	});
	insertEntry({
		userId: input.userId,
		agentId: patch.agentId,
		layer: patch.layer,
		kind: patch.payload.kind,
		text: patch.payload.text,
		at: new Date().toISOString(),
	});
}

export async function commitMemoryAfterCall(
	db: SqlDb,
	insertEntry: InsertFn,
	input: MemoryCommitInput,
): Promise<MemoryCommitResult> {
	try {
		return db.transaction(function (): MemoryCommitResult {
			const summary =
				input.summaryText?.trim() ||
				summaryFromTranscript(input.transcript) ||
				`call_summary session=${input.sessionId} ended=${input.endedAt}`;
			const ids: string[] = [];
			const writtenEpisodicIds: string[] = [];
			const writtenLayers = new Set<MemoryCommitResult["writtenLayers"][number]>([
				"episodic",
			]);

			ids.push(
				insertEntry({
					userId: input.userId,
					agentId: input.agentId,
					layer: "episodic",
					kind: "call_summary",
					text: summary,
					at: input.endedAt,
					callId: input.sessionId,
				}),
			);
			writtenEpisodicIds.push(ids[ids.length - 1]!);

			for (const item of input.items ?? []) {
				const text = item.text.trim();
				if (!text) continue;
				const mapping = commitItemLayerKind(item.kind);
				if (!mapping) continue;
				ids.push(
					insertEntry({
						userId: input.userId,
						agentId: input.agentId,
						layer: mapping.layer,
						kind: mapping.kind,
						text,
						at: input.endedAt,
						callId: input.sessionId,
						payload: item.payload,
					}),
				);
				writtenLayers.add(mapping.layer as MemoryCommitResult["writtenLayers"][number]);
				if (mapping.layer === "episodic") {
					writtenEpisodicIds.push(ids[ids.length - 1]!);
				}
			}

			return {
				ok: true,
				writtenLayers: Array.from(writtenLayers),
				writtenEntryIds: ids,
				writtenEpisodicIds,
			};
		})();
	} catch (err) {
		return {
			ok: false,
			writtenLayers: [],
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
