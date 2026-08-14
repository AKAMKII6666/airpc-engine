/**
 * 模块名称：工具与 RuntimeExitCandidate 类型
 */
import type { CardKind } from "../schema/callCard.js";
import type { Effect } from "../schema/outcome.js";

export type ToolBehavior = "register_exit" | "session_local";
export type ToolAvailability = "global" | "character_capability";

export interface ToolDefinition {
  toolId: string;
  displayName: string;
  /**
   * 面向模型的短触发说明：何时调用、与兄弟工具分流一句、通话中只登记等。
   * Adapter / 预览挂到 session.tools；细则剧本块见 buildToolInstructionBlocks → softContext。
   */
  description: string;
  /**
   * 中性 JSON Schema（由 Zod 导出）；供 Adapter 投影为厂商 tools。
   * 引擎不写 OpenAI/DashScope 嵌套格式。
   */
  inputSchema: unknown;
  /** voicemail 强制 deny_all，一般不列入；类型与 CardKind 对齐避免漏枚举 */
  allowedCardKinds: CardKind[];
  allowedInPlayback: boolean;
  /**
   * global：所有角色可按卡 toolPolicy 开放。
   * character_capability：必须由 CharacterDef.capabilities 显式声明后才可开放。
   */
  availability?: ToolAvailability;
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

export interface ToolResolutionTraceItem {
  toolId: string;
  displayName: string;
  availability: ToolAvailability;
  declaredByCharacter: boolean;
  allowedByCharacter: boolean;
  allowedByCardKind: boolean;
  includedByCardPolicy: boolean;
  exposedToLlm: boolean;
  reason: string;
}

export interface ToolResolutionTrace {
  registryToolIds: string[];
  characterCapabilityToolIds: string[];
  cardPolicyMode: ToolPolicyResolved["mode"];
  cardPolicyToolIds: string[] | null;
  finalToolIds: string[];
  items: ToolResolutionTraceItem[];
}
