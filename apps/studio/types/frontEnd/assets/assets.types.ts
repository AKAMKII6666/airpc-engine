/**
 * 模块名称：资源台前端 DTO
 */

export type AssetKindDto = "wav" | "tts" | "prompt_clip" | "image";

export interface IAssetMetaDto {
  assetId: string;
  kind: AssetKindDto;
  uri: string;
  displayName?: string;
  durationMs?: number;
  transcript?: string;
  locale?: string;
  hash?: string;
  meta?: Record<string, unknown>;
  /** 服务端附加：uri 文件是否存在 */
  fileExists?: boolean;
}
