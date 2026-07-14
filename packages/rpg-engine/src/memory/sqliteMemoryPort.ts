/**
 * 模块名称：SqliteMemoryPort（热投影 + FTS/LIKE 冷召回）
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  MEMORY_PROJECT_DEFAULTS,
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
  return `"${safe.replace(/\s+/g, " ")}"`;
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
          // 强制 LIMIT；禁止无 LIMIT 全表
          const sql = `
            SELECT e.id, e.user_id, e.agent_id, e.layer, e.kind, e.text, e.at, e.created_at
            FROM memory_entries_fts f
            JOIN memory_entries e ON e.id = f.entry_id
            WHERE memory_entries_fts MATCH ?
              AND f.user_id = ? AND f.agent_id = ?
              ${input.fromIso ? "AND e.at >= ?" : ""}
              ${input.toIso ? "AND e.at <= ?" : ""}
            ORDER BY e.at DESC
            LIMIT ?`;
          const params: unknown[] = [ftsQ, input.userId, input.agentId];
          if (input.fromIso) params.push(input.fromIso);
          if (input.toIso) params.push(input.toIso);
          params.push(maxResults);
          rows = db.prepare(sql).all(...params) as EntryRow[];
        }
      } else if (hasText) {
        // LIKE 降级（文档化）
        const sql = `
          SELECT id, user_id, agent_id, layer, kind, text, at, created_at
          FROM memory_entries
          WHERE user_id = ? AND agent_id = ?
            AND text LIKE ?
            ${input.fromIso ? "AND at >= ?" : ""}
            ${input.toIso ? "AND at <= ?" : ""}
          ORDER BY at DESC
          LIMIT ?`;
        const params: unknown[] = [
          input.userId,
          input.agentId,
          `%${textQ}%`,
        ];
        if (input.fromIso) params.push(input.fromIso);
        if (input.toIso) params.push(input.toIso);
        params.push(maxResults);
        rows = db.prepare(sql).all(...params) as EntryRow[];
      } else {
        const sql = `
          SELECT id, user_id, agent_id, layer, kind, text, at, created_at
          FROM memory_entries
          WHERE user_id = ? AND agent_id = ?
            ${input.fromIso ? "AND at >= ?" : ""}
            ${input.toIso ? "AND at <= ?" : ""}
          ORDER BY at DESC
          LIMIT ?`;
        const params: unknown[] = [input.userId, input.agentId];
        if (input.fromIso) params.push(input.fromIso);
        if (input.toIso) params.push(input.toIso);
        params.push(maxResults);
        rows = db.prepare(sql).all(...params) as EntryRow[];
      }

      if (kinds && kinds.length > 0) {
        const set = new Set(kinds);
        rows = rows.filter(function (r) {
          return r.kind !== null && set.has(r.kind as (typeof kinds)[number]);
        });
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
        const id = insertEntry({
          userId: input.userId,
          agentId: input.agentId,
          layer: "episodic",
          kind: "call_summary",
          text: summary,
          at: input.endedAt,
          callId: input.sessionId,
        });
        return {
          ok: true,
          writtenLayers: ["episodic"],
          writtenEpisodicIds: [id],
        };
      } catch (err) {
        return {
          ok: false,
          writtenLayers: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async rollupIfNeeded(): Promise<void> {
      // v1：增量 rollup 后置；占位不写
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
