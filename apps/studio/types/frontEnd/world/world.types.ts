/**
 * 模块名称：世界台前端 DTO
 */

export interface IWorldLoreDto {
  version: 1;
  source: "llm" | "fallback" | "manual";
  generatedAt: string;
  location?: {
    country: string;
    province: string;
    city: string;
    district?: string;
  };
  sharedPremise: string;
  perspectives: Record<string, string[]>;
  characters?: Record<string, { displayName: string; blurb: string }>;
}

export interface IWorldFactDto {
  factId: string;
  type: string;
  value: boolean | string | number | Record<string, unknown> | unknown[];
  visibility: "global" | "story" | "agent" | "temporary";
  scope?: { storyInstanceId?: string; agentId?: string };
  sourceEventId?: string;
  confidence?: number;
  expiresAt?: string | null;
  updatedAt: string;
  tags?: string[];
}

export interface IWorldScheduleDto {
  clockMs: number;
  intents: unknown[];
}

export interface IWorldSnapshotDto {
  userId: string;
  location: IWorldLoreDto["location"] | null;
  world: {
    lore: IWorldLoreDto | null;
    facts: IWorldFactDto[];
    knowledge: Record<string, string[]>;
  };
  schedule: IWorldScheduleDto;
}

/** WET 事件（与引擎 LogRecord 对齐） */
export interface IWetEventDto {
  at: string;
  type: string;
  userId?: string;
  sessionId?: string;
  payload?: unknown;
}

export interface IWetQueryResultDto {
  events: IWetEventDto[];
  storageNote: string;
  file?: string;
  truncated?: boolean;
}

export interface IWetReplayDto {
  sessionId: string;
  storageNote: string;
  events: IWetEventDto[];
  session: {
    status: string;
    userId: string;
    packageId: string;
    cardId: string;
    agentId: string;
    startedAt: string;
    endedAt?: string;
    selectedExit?: {
      exitId?: string;
      source: string;
      priority: number;
      reason?: string;
    };
    effectPlanResult?: {
      status: string;
      aborted: boolean;
      results: Array<{ effectId: string; status: string; error?: string }>;
    };
    effectLedgerKeys: string[];
  } | null;
  summary: {
    exitId?: string;
    planStatus?: string;
    effectCount: number;
    annotationCount: number;
    compensationCount: number;
  };
}
