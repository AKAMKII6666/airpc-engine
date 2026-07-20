/**
 * 模块名称：SqliteMemoryPort（热投影 + FTS/LIKE 冷召回）
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  MEMORY_PROJECT_DEFAULTS,
  MEMORY_ROLLUP_DEFAULTS,
  MEMORY_SEARCH_DEFAULTS,
} from "../constants.js";
import { engineError, type EngineError } from "../host/errors.js";
import type {
  MemoryCommitInput,
  MemoryCommitResult,
  MemoryPort,
  MemoryProjection,
  MemorySearchHit,
  MemorySearchQuery,
} from "./types.js";

type SqlDb = Database.Database;

interface EntryRow {
  id: string;
  user_id: string;
  agent_id: string;
  layer: string;
  kind: string | null;
  text: string;
  at: string;
  created_at: string;
}

interface RollupPeriod {
  kind: "month" | "quarter";
  key: string;
  rangeFrom: string;
  rangeTo: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function clampMaxResults(n: number): number {
  if (!Number.isFinite(n) || n < 1) {
    return MEMORY_SEARCH_DEFAULTS.defaultMaxResults;
  }
  return Math.min(Math.floor(n), MEMORY_SEARCH_DEFAULTS.hardMaxResults);
}

function escapeFtsQuery(raw: string): string {
  const trimmed = raw.trim();
  // 去掉 FTS 特殊字符，整句作短语
  const safe = trimmed.replace(/["'^:*(){}[\]\\]/g, " ").trim();
  if (!safe) return "";
  // unicode61 将每个 CJK 字视为独立 token；无空格短语 "小蛋糕" 会当作单 token 而零命中
  const spaced = safe
    .replace(/([\u3400-\u9FFF\uF900-\uFAFF])/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return "";
  return `"${spaced}"`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 日历月 period（UTC） */
export function monthPeriodFromIso(iso: string): RollupPeriod {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid endedAt for rollup: ${iso}`);
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based
  const key = `${y}-${pad2(m + 1)}`;
  const rangeFrom = `${key}-01T00:00:00.000Z`;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const rangeTo = `${key}-${pad2(lastDay)}T23:59:59.999Z`;
  return { kind: "month", key, rangeFrom, rangeTo };
}

/** 日历季 period（UTC） */
export function quarterPeriodFromIso(iso: string): RollupPeriod {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid endedAt for rollup: ${iso}`);
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const q = Math.floor(m / 3) + 1;
  const startMonth = (q - 1) * 3;
  const endMonth = startMonth + 2;
  const key = `${y}-Q${q}`;
  const rangeFrom = `${y}-${pad2(startMonth + 1)}-01T00:00:00.000Z`;
  const lastDay = new Date(Date.UTC(y, endMonth + 1, 0)).getUTCDate();
  const rangeTo = `${y}-${pad2(endMonth + 1)}-${pad2(lastDay)}T23:59:59.999Z`;
  return { kind: "quarter", key, rangeFrom, rangeTo };
}

/** 上一自然月（用于跨月补算） */
export function previousMonthPeriod(iso: string): RollupPeriod {
  const d = new Date(iso);
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15));
  return monthPeriodFromIso(prev.toISOString());
}

/** 上一自然季（用于跨季补算；与 previousMonth 对称） */
export function previousQuarterPeriod(iso: string): RollupPeriod {
  const d = new Date(iso);
  // 退到上季中间某月（同季 startMonth 再减 1 个月 → 上季末月）
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3, 15));
  return quarterPeriodFromIso(prev.toISOString());
}

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

export function createSqliteMemoryPort(dbPath: string): MemoryPort {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db: SqlDb = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  let ftsReady = false;

  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      layer TEXT NOT NULL,
      kind TEXT,
      text TEXT NOT NULL,
      at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      call_id TEXT,
      importance REAL,
      fact_id TEXT,
      expires_at TEXT,
      status TEXT,
      payload_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mem_user_agent_at
      ON memory_entries(user_id, agent_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_mem_user_agent_layer_at
      ON memory_entries(user_id, agent_id, layer, at DESC);
    CREATE TABLE IF NOT EXISTS memory_rollups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      period_kind TEXT NOT NULL,
      period_key TEXT NOT NULL,
      range_from TEXT NOT NULL,
      range_to TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, agent_id, period_kind, period_key)
    );
    CREATE INDEX IF NOT EXISTS idx_rollup_user_agent
      ON memory_rollups(user_id, agent_id, range_to DESC);
  `);

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
        entry_id UNINDEXED,
        user_id UNINDEXED,
        agent_id UNINDEXED,
        text,
        kind UNINDEXED,
        at UNINDEXED,
        tokenize = 'unicode61'
      );
    `);
    ftsReady = true;
  } catch {
    ftsReady = false;
  }

  function insertFts(row: {
    id: string;
    userId: string;
    agentId: string;
    text: string;
    kind: string | null;
    at: string;
  }): void {
    if (!ftsReady) return;
    db.prepare(
      `INSERT INTO memory_entries_fts(entry_id, user_id, agent_id, text, kind, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(row.id, row.userId, row.agentId, row.text, row.kind, row.at);
  }

  function insertEntry(input: {
    userId: string;
    agentId: string;
    layer: string;
    kind: string;
    text: string;
    at: string;
    callId?: string;
  }): string {
    const id = randomUUID();
    const now = input.at;
    db.prepare(
      `INSERT INTO memory_entries
        (id, user_id, agent_id, layer, kind, text, at, created_at, updated_at, call_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      input.agentId,
      input.layer,
      input.kind,
      input.text,
      input.at,
      now,
      now,
      input.callId ?? null,
    );
    insertFts({
      id,
      userId: input.userId,
      agentId: input.agentId,
      text: input.text,
      kind: input.kind,
      at: input.at,
    });
    return id;
  }

  const port: MemoryPort = {
    async projectForCall(input): Promise<MemoryProjection> {
      const {
        maxCallSummaries,
        maxVignettes,
        maxRollups,
        maxSoftChars,
      } = MEMORY_PROJECT_DEFAULTS;

      const summaries = db
        .prepare(
          `SELECT id, layer, kind, text, at, created_at FROM memory_entries
           WHERE user_id = ? AND agent_id = ? AND kind = 'call_summary'
           ORDER BY at DESC LIMIT ?`,
        )
        .all(input.userId, input.agentId, maxCallSummaries) as EntryRow[];

      const vignettes = db
        .prepare(
          `SELECT id, layer, kind, text, at, created_at FROM memory_entries
           WHERE user_id = ? AND agent_id = ? AND kind = 'vignette'
           ORDER BY at DESC LIMIT ?`,
        )
        .all(input.userId, input.agentId, maxVignettes) as EntryRow[];

      const rollups = db
        .prepare(
          `SELECT id, summary as text, range_to as at, created_at
           FROM memory_rollups
           WHERE user_id = ? AND agent_id = ?
           ORDER BY range_to DESC LIMIT ?`,
        )
        .all(input.userId, input.agentId, maxRollups) as Array<{
        id: string;
        text: string;
        at: string;
        created_at: string;
      }>;

      const chunks: string[] = [];
      const includedEntryIds: string[] = [];
      const rollupIds: string[] = [];
      let chars = 0;

      function pushChunk(label: string, id: string, text: string, isRollup: boolean): void {
        const line = `[${label}] (${id.slice(0, 8)}) ${text}`;
        if (chars + line.length > maxSoftChars) return;
        chunks.push(line);
        chars += line.length + 1;
        if (isRollup) rollupIds.push(id);
        else includedEntryIds.push(id);
      }

      for (const row of summaries) {
        pushChunk("call_summary", row.id, row.text, false);
      }
      for (const row of vignettes) {
        pushChunk("vignette", row.id, row.text, false);
      }
      for (const row of rollups) {
        pushChunk("rollup", row.id, row.text, true);
      }

      return {
        softText: chunks.join("\n"),
        includedEntryIds,
        rollupIds,
        debug: {
          hotCount: includedEntryIds.length + rollupIds.length,
          chars,
        },
      };
    },

    async search(input: MemorySearchQuery): Promise<MemorySearchHit[]> {
      const textQ = input.textQuery?.trim() ?? "";
      const hasText = textQ.length > 0;
      const hasWindow = Boolean(input.fromIso || input.toIso);
      if (!hasText && !hasWindow) {
        throw engineError(
          "VALIDATION_FAILED",
          "search requires textQuery or time window",
          { rule: "MEMORY_SEARCH_REJECT" },
        );
      }
      const maxResults = clampMaxResults(input.maxResults);
      const kinds = input.kinds;
      const kindsClause =
        kinds && kinds.length > 0
          ? `AND kind IN (${kinds.map(function () {
              return "?";
            }).join(",")})`
          : "";
      // 内部宽限再截断（kinds 已下推 SQL 时与 maxR 对齐即可）
      const internalLimit = Math.min(
        Math.max(maxResults * 5, maxResults),
        50,
      );

      function runLike(): EntryRow[] {
        const sql = `
          SELECT id, user_id, agent_id, layer, kind, text, at, created_at
          FROM memory_entries
          WHERE user_id = ? AND agent_id = ?
            AND text LIKE ?
            ${input.fromIso ? "AND at >= ?" : ""}
            ${input.toIso ? "AND at <= ?" : ""}
            ${kindsClause}
          ORDER BY at DESC
          LIMIT ?`;
        const params: unknown[] = [
          input.userId,
          input.agentId,
          `%${textQ}%`,
        ];
        if (input.fromIso) params.push(input.fromIso);
        if (input.toIso) params.push(input.toIso);
        if (kinds && kinds.length > 0) params.push(...kinds);
        params.push(internalLimit);
        return db.prepare(sql).all(...params) as EntryRow[];
      }

      let rows: EntryRow[] = [];

      if (hasText && ftsReady) {
        const ftsQ = escapeFtsQuery(textQ);
        if (!ftsQ && !hasWindow) {
          throw engineError(
            "VALIDATION_FAILED",
            "textQuery too short/invalid for FTS",
            { rule: "MEMORY_SEARCH_REJECT" },
          );
        }
        if (ftsQ) {
          // 强制 LIMIT；禁止无 LIMIT 全表；kinds 下推避免后过滤丢命中
          const sql = `
            SELECT e.id, e.user_id, e.agent_id, e.layer, e.kind, e.text, e.at, e.created_at
            FROM memory_entries_fts f
            JOIN memory_entries e ON e.id = f.entry_id
            WHERE memory_entries_fts MATCH ?
              AND f.user_id = ? AND f.agent_id = ?
              ${input.fromIso ? "AND e.at >= ?" : ""}
              ${input.toIso ? "AND e.at <= ?" : ""}
              ${
                kinds && kinds.length > 0
                  ? `AND e.kind IN (${kinds.map(function () {
                      return "?";
                    }).join(",")})`
                  : ""
              }
            ORDER BY e.at DESC
            LIMIT ?`;
          const params: unknown[] = [ftsQ, input.userId, input.agentId];
          if (input.fromIso) params.push(input.fromIso);
          if (input.toIso) params.push(input.toIso);
          if (kinds && kinds.length > 0) params.push(...kinds);
          params.push(internalLimit);
          rows = db.prepare(sql).all(...params) as EntryRow[];
          // FTS 零命中时 LIKE 降级（中文分词边界等）
          if (rows.length === 0) {
            rows = runLike();
          }
        }
      } else if (hasText) {
        rows = runLike();
      } else {
        const sql = `
          SELECT id, user_id, agent_id, layer, kind, text, at, created_at
          FROM memory_entries
          WHERE user_id = ? AND agent_id = ?
            ${input.fromIso ? "AND at >= ?" : ""}
            ${input.toIso ? "AND at <= ?" : ""}
            ${kindsClause}
          ORDER BY at DESC
          LIMIT ?`;
        const params: unknown[] = [input.userId, input.agentId];
        if (input.fromIso) params.push(input.fromIso);
        if (input.toIso) params.push(input.toIso);
        if (kinds && kinds.length > 0) params.push(...kinds);
        params.push(internalLimit);
        rows = db.prepare(sql).all(...params) as EntryRow[];
      }

      return rows.slice(0, maxResults).map(function (r) {
        return {
          id: r.id,
          layer: r.layer,
          kind: r.kind ?? undefined,
          text: truncate(r.text, MEMORY_SEARCH_DEFAULTS.searchSnippetChars),
          at: r.at,
          createdAt: r.created_at,
        };
      });
    },

    async getById(input): Promise<MemorySearchHit | null> {
      const row = db
        .prepare(
          `SELECT id, user_id, agent_id, layer, kind, text, at, created_at
           FROM memory_entries
           WHERE id = ? AND user_id = ? AND agent_id = ?`,
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
    },

    async applyPatch(input): Promise<void> {
      const payload = input.payload as { text?: string; kind?: string };
      const text =
        typeof payload?.text === "string" ? payload.text : JSON.stringify(input.payload);
      const kind =
        typeof payload?.kind === "string"
          ? payload.kind
          : input.layer === "semantic"
            ? "semantic"
            : "beat";
      const at = new Date().toISOString();
      insertEntry({
        userId: input.userId,
        agentId: input.agentId,
        layer: input.layer,
        kind,
        text,
        at,
      });
    },

    async commitAfterCall(input: MemoryCommitInput): Promise<MemoryCommitResult> {
      try {
        const summary =
          input.summaryText?.trim() ||
          `call_summary session=${input.sessionId} ended=${input.endedAt}`;
        const ids: string[] = [];
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
        for (const raw of input.vignettes ?? []) {
          const text = typeof raw === "string" ? raw.trim() : "";
          if (!text) continue;
          ids.push(
            insertEntry({
              userId: input.userId,
              agentId: input.agentId,
              layer: "episodic",
              kind: "vignette",
              text,
              at: input.endedAt,
              callId: input.sessionId,
            }),
          );
        }
        return {
          ok: true,
          writtenLayers: ["episodic"],
          writtenEpisodicIds: ids,
        };
      } catch (err) {
        return {
          ok: false,
          writtenLayers: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async rollupIfNeeded(input: {
      userId: string;
      agentId: string;
      endedAt: string;
    }): Promise<void> {
      const periods: RollupPeriod[] = [
        previousMonthPeriod(input.endedAt),
        previousQuarterPeriod(input.endedAt),
        monthPeriodFromIso(input.endedAt),
        quarterPeriodFromIso(input.endedAt),
      ];
      // 去重（同 key 可能重复时跳过）
      const seen = new Set<string>();

      for (const period of periods) {
        const dedupeKey = `${period.kind}:${period.key}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const entries = db
          .prepare(
            `SELECT id, kind, text, at FROM memory_entries
             WHERE user_id = ? AND agent_id = ?
               AND layer = 'episodic'
               AND at >= ? AND at <= ?
             ORDER BY at ASC
             LIMIT ?`,
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
            `SELECT id FROM memory_rollups
             WHERE user_id = ? AND agent_id = ?
               AND period_kind = ? AND period_key = ?`,
          )
          .get(
            input.userId,
            input.agentId,
            period.kind,
            period.key,
          ) as { id: string } | undefined;

        // 触发：该 period 尚无 rollup，或本通落在该 period（刷新当前月/季）
        const isCurrentMonth =
          period.kind === "month" &&
          period.key === monthPeriodFromIso(input.endedAt).key;
        const isCurrentQuarter =
          period.kind === "quarter" &&
          period.key === quarterPeriodFromIso(input.endedAt).key;
        if (existing && !isCurrentMonth && !isCurrentQuarter) {
          // 上月已有 rollup 则跳过（增量补算仅填缺失）
          continue;
        }

        const summary = buildExtractiveRollupSummary(period, entries);
        const now = input.endedAt;
        if (existing) {
          db.prepare(
            `UPDATE memory_rollups
             SET summary = ?, range_from = ?, range_to = ?, updated_at = ?
             WHERE id = ?`,
          ).run(
            summary,
            period.rangeFrom,
            period.rangeTo,
            now,
            existing.id,
          );
        } else {
          db.prepare(
            `INSERT INTO memory_rollups
              (id, user_id, agent_id, period_kind, period_key,
               range_from, range_to, summary, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      }
    },

    close(): void {
      db.close();
    },
  };

  return port;
}

/** 测试用：判定 search 失败是否为拒查 */
export function isMemorySearchReject(err: unknown): err is EngineError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as EngineError).ok === false &&
    (err as EngineError).code === "VALIDATION_FAILED"
  );
}
