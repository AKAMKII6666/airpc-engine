/**
	* 模块名称：MemoryPort.rollupIfNeeded（月/季 extractive）
	*/
import { randomUUID } from "node:crypto";
import { MEMORY_ROLLUP_DEFAULTS } from "@airpc/rpg-engine";
import { truncate } from "../util/helpers";
import {
	monthPeriodFromIso,
	previousMonthPeriod,
	previousQuarterPeriod,
	quarterPeriodFromIso,
} from "../util/period";
import type { RollupPeriod, SqlDb } from "../db/types";

function buildExtractiveRollupSummary(
	period: RollupPeriod,
	entries: Array<{ kind: string | null; text: string; at: string }>,
): string {
	const snippets = entries.map(function (e) {
		const kind = e.kind ?? "episodic";
		return `${kind}@${e.at.slice(0, 10)}: ${truncate(
			e.text,
			MEMORY_ROLLUP_DEFAULTS.entrySnippetChars,
		)}`;
	});
	const header = `[${period.kind} ${period.key}] n=${entries.length}`;
	return truncate(
		[header, ...snippets].join(" | "),
		MEMORY_ROLLUP_DEFAULTS.maxSummaryChars,
	);
}

function upsertRollup(
	db: SqlDb,
	input: { userId: string; agentId: string; endedAt: string },
	period: RollupPeriod,
	summary: string,
	existingId: string | undefined,
): void {
	const now = input.endedAt;
	if (existingId) {
		db.prepare(
			"UPDATE memory_rollups SET summary = ?, range_from = ?, range_to = ?, updated_at = ? WHERE id = ?",
		).run(summary, period.rangeFrom, period.rangeTo, now, existingId);
		return;
	}
	db.prepare(
		"INSERT INTO memory_rollups (id, user_id, agent_id, period_kind, period_key, range_from, range_to, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).run(
		randomUUID(),
		input.userId,
		input.agentId,
		period.kind,
		period.key,
		period.rangeFrom,
		period.rangeTo,
		summary,
		now,
		now,
	);
}

function shouldSkipExisting(
	period: RollupPeriod,
	endedAt: string,
	existing: boolean,
): boolean {
	if (!existing) return false;
	const isCurrentMonth =
		period.kind === "month" &&
		period.key === monthPeriodFromIso(endedAt).key;
	const isCurrentQuarter =
		period.kind === "quarter" &&
		period.key === quarterPeriodFromIso(endedAt).key;
	return !isCurrentMonth && !isCurrentQuarter;
}

/** 有界 extractive rollup；补算上月/上季缺失，刷新当前月/季。 */
export async function rollupIfNeeded(
	db: SqlDb,
	input: { userId: string; agentId: string; endedAt: string },
): Promise<void> {
	const periods: RollupPeriod[] = [
		previousMonthPeriod(input.endedAt),
		previousQuarterPeriod(input.endedAt),
		monthPeriodFromIso(input.endedAt),
		quarterPeriodFromIso(input.endedAt),
	];
	const seen = new Set<string>();

	for (const period of periods) {
		const dedupeKey = `${period.kind}:${period.key}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		const entries = db
			.prepare(
				"SELECT id, kind, text, at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND layer = 'episodic' AND at >= ? AND at <= ? ORDER BY at ASC LIMIT ?",
			)
			.all(
				input.userId,
				input.agentId,
				period.rangeFrom,
				period.rangeTo,
				MEMORY_ROLLUP_DEFAULTS.maxEntriesPerPeriod,
			) as Array<{ id: string; kind: string | null; text: string; at: string }>;

		if (entries.length === 0) continue;

		const existing = db
			.prepare(
				"SELECT id FROM memory_rollups WHERE user_id = ? AND agent_id = ? AND period_kind = ? AND period_key = ?",
			)
			.get(
				input.userId,
				input.agentId,
				period.kind,
				period.key,
			) as { id: string } | undefined;

		if (shouldSkipExisting(period, input.endedAt, Boolean(existing))) {
			continue;
		}

		const summary = buildExtractiveRollupSummary(period, entries);
		upsertRollup(db, input, period, summary, existing?.id);
	}
}
