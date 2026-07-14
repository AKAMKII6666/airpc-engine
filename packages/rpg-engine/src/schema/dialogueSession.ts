/**
 * 模块名称：DialogueSessionSpec（给 Adapter 的会话规格；需求 50）
 * 模块说明：beginCall → Composer 后交给对话适配器；本仓不实现 Realtime Adapter。
 */
import type { CallCardDefinition } from "./callCard.js";
import type { ToolDefinition } from "../tools/types.js";
import type {
  ComposeScene,
  RenderedPrompt,
} from "../host/types.js";

export type DialogueChannel = "realtime_audio" | "text_turn" | "manual";

export type InteractionMode =
  | "realtime_dialogue"
  | "playback_only"
  | "hybrid";

export interface DialogueSessionSpec {
  sessionId: string;
  channel: DialogueChannel;
  card: CallCardDefinition;
  instanceId: string;
  prompt: RenderedPrompt;
  composeScene: ComposeScene;
  /** 已按 toolPolicy ∩ Registry 过滤；壳挂机 FC 不在此列 */
  tools: ToolDefinition[];
  interactionMode: InteractionMode;
  playback?: { assetId: string; transcript?: string };
}

export interface DialogueSessionPatch {
  appendSpeakable?: string;
  appendPrivate?: string;
  tools?: ToolDefinition[];
}
