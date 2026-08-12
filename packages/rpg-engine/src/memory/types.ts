/**
 * 模块名称：MemoryPort 类型（需求 12 / 技术设计 20）
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { Outcome } from "../schema/outcome.js";
import type { ChatTurn } from "../schema/dialogueSession.js";

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

export interface MemoryProjectionItem {
  id: string;
  layer: string;
  kind: "call_summary" | "vignette" | "semantic" | "rollup" | string;
  text: string;
  at: string;
  createdAt: string;
  source: "entry" | "rollup";
}

export interface MemoryProjection {
  softText: string;
  /** 结构化投影；Composer 仍用 softText，调试/后续 prompt provider 可按 kind 分层使用。 */
  items?: MemoryProjectionItem[];
  includedEntryIds: string[];
  rollupIds?: string[];
  debug?: { hotCount: number; chars: number; counts?: Record<string, number> };
}

/** Host 挂机时交给 MemoryPort 的稳定 transcript DTO。 */
export interface MemoryCallTranscript {
  schemaVersion: 1;
  source: "host.chat_turns";
  turns: ChatTurn[];
}

export interface MemoryCommitInput {
  userId: string;
  agentId: string;
  sessionId: string;
  transcript: unknown;
  outcome?: Outcome;
  endedAt: string;
  /** Host 对本次挂机提交的领域语义；Memory/LLM 只据此收紧抽取，不推进剧情状态。 */
  commitContext?: {
    callKind: "free" | "story";
    policy: "free_post_pipeline" | "story_call";
    source: string;
    chapterId: string;
    cardId: string;
    selectedExitId?: string;
    planStatus?: string;
  };
  /** Manual / 无 LLM 时的摘要文本 */
  summaryText?: string;
  /** 生活边角碎片；写入 kind=vignette（可选） */
  vignettes?: string[];
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

export type MemoryPatchLayer = "semantic";
export type MemoryPatchKind = "semantic";

export interface MemoryPatchPayload {
  text: string;
  kind: MemoryPatchKind;
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
    layer: MemoryPatchLayer;
    op: "insert";
    payload: MemoryPatchPayload;
  }): Promise<void>;

  commitAfterCall(input: MemoryCommitInput): Promise<MemoryCommitResult>;

  rollupIfNeeded?(input: {
    userId: string;
    agentId: string;
    endedAt: string;
  }): Promise<void>;

  close?(): void;
}
