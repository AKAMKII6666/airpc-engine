/**
 * 模块名称：工具与 RuntimeExitCandidate 类型
 */
import type { Effect } from "../schema/outcome.js";

export type ToolBehavior = "register_exit" | "session_local";

export interface ToolDefinition {
  toolId: string;
  displayName: string;
  allowedCardKinds: Array<"free" | "story" | "system">;
  allowedInPlayback: boolean;
  behavior: ToolBehavior;
}

export interface RuntimeExitCandidate {
  candidateId: string;
  toolId: string;
  /** 若指向静态出口，挂机用该出口 condition/effects */
  exitId?: string;
  effects: Effect[];
  priority: number;
  registeredAt: string;
  args?: Record<string, unknown>;
}

export interface ToolInvokeResult {
  ok: true;
  behavior: ToolBehavior;
  candidate?: RuntimeExitCandidate;
  /** session_local 回给模型的数据 */
  localResult?: unknown;
}

export interface ToolPolicyResolved {
  mode: "allowlist" | "denylist" | "inherit_free" | "deny_all" | "unknown";
  allowedToolIds: string[] | null;
}
