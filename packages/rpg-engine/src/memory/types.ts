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
    | "call_summary"
    | "vignette"
    | "beat"
    | "semantic"
    | "rollup"
    | "shared_event"
    | "emotion"
    | "identity_note"
    | "promise"
    | "social_share"
    | "attitude"
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

export type MemoryCommitItemKind =
  | "vignette"
  | "user_fact"
  | "shared_event"
  | "emotion"
  | "social_share"
  | "promise"
  | "attitude";

/** 态度记忆结构化 payload；text 负责人话展示，payload 负责程序溯源。 */
export interface MemoryAttitudePayload {
  stance: string;
  summary: string;
  evidence: string;
  /** 抽象感觉标签；LLM 归纳，用于展示 NPC 当前感觉。 */
  feel: string[];
  /** 从原文抽出的可溯源关键词；用于 search_memory。 */
  keywords: string[];
}

/** 最近态度条目；供抽取器做历史参考，也供调试/投影使用。 */
export interface MemoryAttitudeEntry {
  id: string;
  text: string;
  at: string;
  payload?: MemoryAttitudePayload;
}

/** Host 从 frozenCharacter 传给 Studio 抽取器的角色视角上下文。 */
export interface MemoryCharacterAttitudeContext {
  displayName?: string;
  persona?: {
    systemPrompt?: string;
    personalityCode?: string;
    speakingStyle?: string;
    attitudeHistoryLimit?: number;
  };
}

/** 一条已经过抽取与证据校验、只待落库的记忆条目。 */
export interface MemoryCommitItem {
  kind: MemoryCommitItemKind;
  text: string;
  payload?: MemoryAttitudePayload;
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
    promptTraceRefs?: {
      providerIds?: string[];
      matchedLayerIds?: string[];
    };
    toolTraceRefs?: {
      traceCount?: number;
      toolIds?: string[];
      resultEntryIds?: string[];
      candidateIds?: string[];
      resultSeeds?: string[];
    };
    exclusionSeeds?: string[];
    /** 态度抽取专用角色视角；人设只用于判断视角，禁止当事实写进记忆。 */
    character?: MemoryCharacterAttitudeContext;
  };
  /** Manual / 无 LLM 时的摘要文本 */
  summaryText?: string;
  /** Studio MemoryCommit Orchestrator 产出的结构化条目；Port 只负责按 kind 落库。 */
  items?: MemoryCommitItem[];
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
  /** 所有本次提交落库 entry id；新代码优先使用此字段。 */
  writtenEntryIds?: string[];
  /** @deprecated 旧字段名只代表早期 episodic 写入；为兼容保留。 */
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

  /** 读取该用户×角色最近的 attitude 条目；用于抽取时积累参考。 */
  listRecentAttitudes?(input: {
    userId: string;
    agentId: string;
    limit: number;
  }): Promise<MemoryAttitudeEntry[]>;

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
