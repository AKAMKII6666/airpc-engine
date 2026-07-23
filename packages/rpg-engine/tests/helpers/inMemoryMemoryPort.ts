/**
 * 模块名称：测试用内存 MemoryPort
 * 模块说明：引擎测注入假 Port，不依赖 sqlite / engineIOModule。
 */
import { randomUUID } from "node:crypto";
import { engineError } from "../../src/host/errors.js";
import { createEngineHost } from "../../src/host/createEngineHost.js";
import type { CreateEngineHostOptions } from "../../src/ports/engineHostApi.js";
import type {
  MemoryCommitInput,
  MemoryCommitResult,
  MemoryPort,
  MemoryProjection,
  MemorySearchHit,
  MemorySearchQuery,
} from "../../src/memory/types.js";
import { MEMORY_SEARCH_DEFAULTS } from "../../src/constants.js";
import type { EffectSink } from "../../src/runtime/effectSink.js";
import type { LoreBootstrapPort } from "../../src/lore/types.js";
import { createFsProfilePort } from "./fsProfilePort.js";
import { createFsContentPort } from "./fsContentPort.js";
import { createFsEngineLogPort } from "./fsEngineLogPort.js";

export { createFsProfilePort } from "./fsProfilePort.js";
export { createFsContentPort } from "./fsContentPort.js";
export { createFsEngineLogPort } from "./fsEngineLogPort.js";

interface MemEntry {
  id: string;
  userId: string;
  agentId: string;
  layer: string;
  kind: string;
  text: string;
  at: string;
  createdAt: string;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

function toHit(row: MemEntry, max: number): MemorySearchHit {
  return {
    id: row.id,
    layer: row.layer,
    kind: row.kind,
    text: truncate(row.text, max),
    at: row.at,
    createdAt: row.createdAt,
  };
}

function insertEntry(
  entries: MemEntry[],
  userId: string,
  agentId: string,
  layer: string,
  kind: string,
  text: string,
  at: string,
): string {
  const id = randomUUID();
  entries.push({ id, userId, agentId, layer, kind, text, at, createdAt: at });
  return id;
}

function entryMatchesQuery(
  e: MemEntry,
  input: MemorySearchQuery,
  textQ: string,
  kinds: Set<string>,
): boolean {
  if (kinds.size > 0 && !kinds.has(e.kind)) return false;
  if (textQ && !e.text.includes(textQ)) return false;
  if (input.fromIso && e.at < input.fromIso) return false;
  if (input.toIso && e.at > input.toIso) return false;
  return true;
}

function searchEntries(
  entries: MemEntry[],
  input: MemorySearchQuery,
): MemorySearchHit[] {
  const textQ = input.textQuery?.trim() ?? "";
  if (!textQ && !input.fromIso && !input.toIso) {
    throw engineError(
      "VALIDATION_FAILED",
      "search requires textQuery or time window",
      { rule: "MEMORY_SEARCH_REJECT" },
    );
  }
  const maxResults = Math.min(
    Math.max(1, Math.floor(input.maxResults) || MEMORY_SEARCH_DEFAULTS.defaultMaxResults),
    MEMORY_SEARCH_DEFAULTS.hardMaxResults,
  );
  const kinds = new Set<string>(input.kinds ?? []);
  return entries
    .filter(function (e) {
      return e.userId === input.userId && e.agentId === input.agentId;
    })
    .filter(function (e) {
      return entryMatchesQuery(e, input, textQ, kinds);
    })
    .sort(function (a, b) {
      return b.at.localeCompare(a.at);
    })
    .slice(0, maxResults)
    .map(function (r) {
      return toHit(r, MEMORY_SEARCH_DEFAULTS.searchSnippetChars);
    });
}

function commitCall(
  entries: MemEntry[],
  input: MemoryCommitInput,
): MemoryCommitResult {
  const summary =
    input.summaryText?.trim() ||
    `call_summary session=${input.sessionId} ended=${input.endedAt}`;
  const ids = [
    insertEntry(
      entries,
      input.userId,
      input.agentId,
      "episodic",
      "call_summary",
      summary,
      input.endedAt,
    ),
  ];
  for (const raw of input.vignettes ?? []) {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) continue;
    ids.push(
      insertEntry(
        entries,
        input.userId,
        input.agentId,
        "episodic",
        "vignette",
        text,
        input.endedAt,
      ),
    );
  }
  return { ok: true, writtenLayers: ["episodic"], writtenEpisodicIds: ids };
}

function patchEntry(
  entries: MemEntry[],
  input: {
    userId: string;
    agentId: string;
    layer: string;
    payload: unknown;
  },
): void {
  const payload = input.payload as { text?: string; kind?: string };
  const text =
    typeof payload?.text === "string"
      ? payload.text
      : JSON.stringify(input.payload);
  const kind =
    typeof payload?.kind === "string"
      ? payload.kind
      : input.layer === "semantic"
        ? "semantic"
        : "beat";
  insertEntry(
    entries,
    input.userId,
    input.agentId,
    input.layer,
    kind,
    text,
    new Date().toISOString(),
  );
}

/** 进程内 MemoryPort：供 host / pipeline 测注入。 */
export function createInMemoryMemoryPort(): MemoryPort {
  const entries: MemEntry[] = [];
  return {
    async projectForCall(input): Promise<MemoryProjection> {
      const mine = entries.filter(function (e) {
        return e.userId === input.userId && e.agentId === input.agentId;
      });
      const softText = mine
        .map(function (e) {
          return `[${e.kind}] ${e.text}`;
        })
        .join("\n");
      return {
        softText,
        includedEntryIds: mine.map(function (e) {
          return e.id;
        }),
        rollupIds: [],
        debug: { hotCount: mine.length, chars: softText.length },
      };
    },
    async search(input) {
      return searchEntries(entries, input);
    },
    async getById(input) {
      const row = entries.find(function (e) {
        return (
          e.id === input.entryId &&
          e.userId === input.userId &&
          e.agentId === input.agentId
        );
      });
      return row ? toHit(row, MEMORY_SEARCH_DEFAULTS.getByIdChars) : null;
    },
    async applyPatch(input) {
      patchEntry(entries, input);
    },
    async commitAfterCall(input) {
      return commitCall(entries, input);
    },
    async rollupIfNeeded() {},
  };
}

/** 注入内存 MemoryPort + Fs Profile/Content/EngineLog Port 的 Host，供需要 commit/search 的集成测。 */
export function createTestHostWithMemory(opts: {
  persist?: boolean;
  /** 与 loadWorkspace 相同的 data 根；Profile / Log 读写经此 Port */
  dataRoot: string;
}): ReturnType<typeof createEngineHost> {
  return createEngineHost({
    persist: opts.persist,
    memory: createInMemoryMemoryPort(),
    profile: createFsProfilePort(opts.dataRoot),
    content: createFsContentPort(),
    engineLog: createFsEngineLogPort(opts.dataRoot),
  });
}

/** 注入 Fs Profile + Content + EngineLog Port（无 Memory）；多数 host 剧情测用。 */
export function createTestHost(opts: {
  persist?: boolean;
  dataRoot: string;
  effectSink?: EffectSink | null;
  loreBootstrap?: LoreBootstrapPort | null;
  generateVoicemail?: CreateEngineHostOptions["generateVoicemail"];
  onVoicemailUnreadChanged?: CreateEngineHostOptions["onVoicemailUnreadChanged"];
}): ReturnType<typeof createEngineHost> {
  return createEngineHost({
    persist: opts.persist,
    profile: createFsProfilePort(opts.dataRoot),
    content: createFsContentPort(),
    engineLog: createFsEngineLogPort(opts.dataRoot),
    effectSink: opts.effectSink,
    loreBootstrap: opts.loreBootstrap,
    generateVoicemail: opts.generateVoicemail,
    onVoicemailUnreadChanged: opts.onVoicemailUnreadChanged,
  });
}
