/**
 * 模块名称：MemoryPort 类型（需求 12 / 技术设计 20）
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { Outcome } from "../schema/outcome.js";

export interface MemorySearchQuery {
  userId: string;
  agentId: string;
  textQuery?: string;
  fromIso?: string;
  toIso?: string;
  kinds?: Array<
    "call_summary" | "vignette" | "beat" | "semantic" | "rollup"
  >;
  maxResults: number;
}

export interface MemorySearchHit {
  id: string;
  layer: string;
  kind?: string;
  text: string;
  at: string;
  createdAt: string;
}

export interface MemoryProjection {
  softText: string;
  includedEntryIds: string[];
  rollupIds?: string[];
  debug?: { hotCount: number; chars: number };
}

export interface MemoryCommitInput {
  userId: string;
  agentId: string;
  sessionId: string;
  transcript: unknown;
  outcome?: Outcome;
  endedAt: string;
  /** Manual / 无 LLM 时的摘要文本 */
  summaryText?: string;
}

export interface MemoryCommitResult {
  ok: boolean;
  writtenLayers: Array<
    | "episodic"
    | "semantic"
    | "affect"
    | "commitments"
    | "relational"
    | "profileNotes"
  >;
  writtenEpisodicIds?: string[];
  error?: string;
}

export interface MemoryPort {
  projectForCall(input: {
    userId: string;
    agentId: string;
    card: CallCardDefinition;
    nowIso?: string;
  }): Promise<MemoryProjection>;

  search(input: MemorySearchQuery): Promise<MemorySearchHit[]>;

  getById(input: {
    userId: string;
    agentId: string;
    entryId: string;
  }): Promise<MemorySearchHit | null>;

  applyPatch(input: {
    userId: string;
    agentId: string;
    layer: string;
    op: string;
    payload: unknown;
  }): Promise<void>;

  commitAfterCall(input: MemoryCommitInput): Promise<MemoryCommitResult>;

  rollupIfNeeded?(input: {
    userId: string;
    agentId: string;
    endedAt: string;
  }): Promise<void>;

  close?(): void;
}
