/**
 * capability-packs.json 清单类型与 Zod 校验（技术设计 25 §4）。
 * apiVersion 对外冻结为 1；校验失败应跳过该包并记 plugin.load_failed。
 */
import { z } from "zod";
import { BACKGROUND_SLOTS, REALTIME_SLOTS, UI_SLOTS } from "./slots.js";

/** 对外契约大版本；与 L1 CapabilityPackApiVersion 对齐 */
export type PluginApiVersion = 1;

const RealtimeSlotSchema = z.enum(REALTIME_SLOTS);
const BackgroundSlotSchema = z.enum(BACKGROUND_SLOTS);
const UiSlotSchema = z.enum(UI_SLOTS);

/** 实时 / 后台管道项：slot + entry；after/before 相对已有提供者 id */
export const PluginPipelineItemSchema = z.object({
	slot: z.string().min(1),
	entry: z.string().min(1),
	after: z.string().min(1).optional(),
	before: z.string().min(1).optional(),
});

export const RealtimePipelineItemSchema = PluginPipelineItemSchema.extend({
	slot: RealtimeSlotSchema,
});

export const BackgroundPipelineItemSchema = PluginPipelineItemSchema.extend({
	slot: BackgroundSlotSchema,
});

export const PluginUiPanelItemSchema = z.object({
	slot: UiSlotSchema,
	entry: z.string().min(1),
});

export const PluginRealtimeBlockSchema = z.object({
	enabled: z.boolean(),
	pipelines: z.array(RealtimePipelineItemSchema),
});

export const PluginBackgroundBlockSchema = z.object({
	enabled: z.boolean(),
	pipelines: z.array(BackgroundPipelineItemSchema),
});

export const PluginUiBlockSchema = z.object({
	enabled: z.boolean(),
	panels: z.array(PluginUiPanelItemSchema),
});

/**
 * 插件根清单 schema。
 * 某一大类不需要时可省略该块，或写 enabled:false。
 */
export const CapabilityPacksManifestSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).optional(),
	version: z.string().min(1),
	apiVersion: z.literal(1),
	enabled: z.boolean(),
	main: z.string().min(1).optional(),
	realtime: PluginRealtimeBlockSchema.optional(),
	background: PluginBackgroundBlockSchema.optional(),
	ui: PluginUiBlockSchema.optional(),
});

export type PluginPipelineItem = z.infer<typeof PluginPipelineItemSchema>;
export type RealtimePipelineItem = z.infer<typeof RealtimePipelineItemSchema>;
export type BackgroundPipelineItem = z.infer<typeof BackgroundPipelineItemSchema>;
export type PluginUiPanelItem = z.infer<typeof PluginUiPanelItemSchema>;
export type PluginRealtimeBlock = z.infer<typeof PluginRealtimeBlockSchema>;
export type PluginBackgroundBlock = z.infer<typeof PluginBackgroundBlockSchema>;
export type PluginUiBlock = z.infer<typeof PluginUiBlockSchema>;
export type CapabilityPacksManifest = z.infer<typeof CapabilityPacksManifestSchema>;

/** 严格解析；失败抛 ZodError */
export function parseCapabilityPacksManifest(
	input: unknown,
): CapabilityPacksManifest {
	return CapabilityPacksManifestSchema.parse(input);
}

/** 安全解析，供加载器跳过坏包 */
export function safeParseCapabilityPacksManifest(input: unknown) {
	return CapabilityPacksManifestSchema.safeParse(input);
}
