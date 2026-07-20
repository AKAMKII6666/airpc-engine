/**
 * 模块名称：WET（逻辑事件）查询／受控追加／重放摘要
 * 存储：ring + data/logs/engine-*.jsonl 旁路；不进 SaveGame／Profile。
 */
import type { CallSession, EffectPlanResult, LogRecord } from "./types.js";
import { engineError, type EngineError } from "./errors.js";

/** 允许 Studio／调试受控追加的类型（补偿／标注；禁止伪造成 effect 历史） */
export const WET_APPENDABLE_TYPES = [
  "wet.annotation",
  "wet.compensation",
] as const;

export type WetAppendableType = (typeof WET_APPENDABLE_TYPES)[number];

export const WET_STORAGE_NOTE =
  "WET 真源 = Host 内存 ring + data/logs/engine-YYYYMMDD.jsonl（旁路）。" +
  "不整份写入 Profile／SaveGame；幂等权威在 CallSession.effectLedger（通话内）。" +
  "受控追加仅 wet.annotation／wet.compensation，禁止改写既有行。";

export interface WetQueryOpts {
  userId?: string;
  /** 精确匹配 type，或以 * 后缀做前缀匹配（如 story.*） */
  type?: string;
  sessionId?: string;
  /** ISO 下界（含） */
  since?: string;
  /** ISO 上界（含） */
  until?: string;
  limit?: number;
}

export interface WetAppendInput {
  type: string;
  userId: string;
  sessionId?: string;
  /** 必填：补偿／标注说明 */
  note: string;
  /** 可选结构化补充；不得冒充 effect 执行结果篡改账本 */
  payload?: Record<string, unknown>;
}

export interface WetReplayView {
  sessionId: string;
  storageNote: string;
  /** 该 session 相关事件（时间升序） */
  events: LogRecord[];
  session: {
    status: CallSession["status"];
    userId: string;
    packageId: string;
    cardId: string;
    agentId: string;
    startedAt: string;
    endedAt?: string;
    selectedExit?: CallSession["selectedExit"];
    effectPlanResult?: EffectPlanResult;
    effectLedgerKeys: string[];
  } | null;
  /** 从事件／session 抽出的观测摘要 */
  summary: {
    exitId?: string;
    planStatus?: string;
    effectCount: number;
    annotationCount: number;
    compensationCount: number;
  };
}

export function isWetAppendableType(type: string): type is WetAppendableType {
  return (WET_APPENDABLE_TYPES as readonly string[]).includes(type);
}

export function matchWetType(recordType: string, filter?: string): boolean {
  if (!filter) return true;
  if (filter.endsWith(".*")) {
    const prefix = filter.slice(0, -1);
    return recordType.startsWith(prefix);
  }
  return recordType === filter;
}

export function filterWetRecords(
  records: LogRecord[],
  opts: WetQueryOpts = {},
): LogRecord[] {
  const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500);
  let items = records;
  if (opts.userId) {
    items = items.filter(function (r) {
      return r.userId === opts.userId;
    });
  }
  if (opts.sessionId) {
    items = items.filter(function (r) {
      return r.sessionId === opts.sessionId;
    });
  }
  if (opts.type) {
    const typeFilter = opts.type;
    items = items.filter(function (r) {
      return matchWetType(r.type, typeFilter);
    });
  }
  if (opts.since) {
    const since = opts.since;
    items = items.filter(function (r) {
      return r.at >= since;
    });
  }
  if (opts.until) {
    const until = opts.until;
    items = items.filter(function (r) {
      return r.at <= until;
    });
  }
  return items.slice(-limit);
}

/** 合并 ring 与文件切片；同 at+type+sessionId 去重，按 at 升序 */
export function mergeWetSources(
  ring: LogRecord[],
  fileLines: LogRecord[],
): LogRecord[] {
  const map = new Map<string, LogRecord>();
  function keyOf(r: LogRecord): string {
    return `${r.at}|${r.type}|${r.sessionId ?? ""}|${JSON.stringify(r.payload ?? null)}`;
  }
  for (const r of fileLines) {
    map.set(keyOf(r), r);
  }
  for (const r of ring) {
    map.set(keyOf(r), r);
  }
  return Array.from(map.values()).sort(function (a, b) {
    return a.at.localeCompare(b.at);
  });
}

export function validateWetAppend(
  input: WetAppendInput,
): EngineError | null {
  if (!isWetAppendableType(input.type)) {
    return engineError(
      "VALIDATION_FAILED",
      `wet append type not allowed: ${input.type}; only ${WET_APPENDABLE_TYPES.join(", ")}`,
    );
  }
  if (!input.userId || typeof input.userId !== "string") {
    return engineError("USER_REQUIRED", "wet append requires userId");
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (!note) {
    return engineError("VALIDATION_FAILED", "wet append requires non-empty note");
  }
  if (note.length > 2000) {
    return engineError("VALIDATION_FAILED", "wet note too long (max 2000)");
  }
  if (
    input.payload != null &&
    (typeof input.payload !== "object" || Array.isArray(input.payload))
  ) {
    return engineError("VALIDATION_FAILED", "wet payload must be object");
  }
  if (input.payload) {
    const forbidden = ["effectLedger", "rewrite", "mutateHistory", "deleteAt"];
    for (const k of forbidden) {
      if (k in input.payload) {
        return engineError(
          "VALIDATION_FAILED",
          `wet payload forbids key: ${k} (append-only; no history rewrite)`,
        );
      }
    }
  }
  return null;
}

export function buildWetAppendRecord(input: WetAppendInput): LogRecord {
  if (!isWetAppendableType(input.type)) {
    throw new Error(`invalid wet append type: ${input.type}`);
  }
  return {
    at: new Date().toISOString(),
    type: input.type,
    userId: input.userId,
    sessionId: input.sessionId,
    payload: {
      note: input.note.trim(),
      controlled: true,
      ...(input.payload ?? {}),
    },
  };
}

export function buildWetReplayView(opts: {
  sessionId: string;
  events: LogRecord[];
  session: CallSession | null;
}): WetReplayView {
  const events = opts.events
    .filter(function (r) {
      return r.sessionId === opts.sessionId;
    })
    .sort(function (a, b) {
      return a.at.localeCompare(b.at);
    });

  let exitId: string | undefined;
  let planStatus: string | undefined;
  let effectCount = 0;
  let annotationCount = 0;
  let compensationCount = 0;

  for (const ev of events) {
    if (ev.type === "wet.annotation") annotationCount += 1;
    if (ev.type === "wet.compensation") compensationCount += 1;
    const payload = ev.payload as Record<string, unknown> | undefined;
    if (payload && typeof payload.exitId === "string") {
      exitId = payload.exitId;
    }
    if (payload && typeof payload.planStatus === "string") {
      planStatus = payload.planStatus;
    }
    if (Array.isArray(payload?.effectResults)) {
      effectCount = payload.effectResults.length;
    }
  }

  const session = opts.session;
  if (session?.selectedExit?.exitId) {
    exitId = session.selectedExit.exitId;
  }
  if (session?.effectPlanResult) {
    planStatus = session.effectPlanResult.status;
    effectCount = session.effectPlanResult.results.length;
  }

  return {
    sessionId: opts.sessionId,
    storageNote: WET_STORAGE_NOTE,
    events,
    session: session
      ? {
          status: session.status,
          userId: session.userId,
          packageId: session.packageId,
          cardId: session.resolve.cardId,
          agentId: session.resolve.agentId,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          selectedExit: session.selectedExit,
          effectPlanResult: session.effectPlanResult,
          effectLedgerKeys: Object.keys(session.effectLedger),
        }
      : null,
    summary: {
      exitId,
      planStatus,
      effectCount,
      annotationCount,
      compensationCount,
    },
  };
}
