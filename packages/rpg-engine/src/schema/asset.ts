/**
 * 模块名称：全局资产库 AssetMeta（需求 14）
 */
import { z } from "zod";

export const AssetKindSchema = z.enum(["wav", "tts", "prompt_clip", "image"]);

export const AssetMetaSchema = z.object({
  assetId: z.string().min(1),
  kind: AssetKindSchema,
  /** 相对 data/assets/ 的路径（如 files/clip_hello.wav） */
  uri: z.string().min(1),
  displayName: z.string().optional(),
  durationMs: z.number().optional(),
  transcript: z.string().optional(),
  locale: z.string().optional(),
  hash: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type AssetKind = z.infer<typeof AssetKindSchema>;
export type AssetMeta = z.infer<typeof AssetMetaSchema>;

/** playback／系统音可引用的 kind */
export const PLAYBACK_ASSET_KINDS = new Set<AssetKind>([
  "wav",
  "tts",
  "prompt_clip",
]);
