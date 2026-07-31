/**
 * 模块名称：Zod → 中性 JSON Schema（供 Adapter / 预览；禁止厂商嵌套格式）
 */
import { z } from "zod";

/**
 * 导出工具入参 JSON Schema；单一出口，避免 Adapter 直读 Zod。
 */
export function toToolJsonSchema(schema: z.ZodType): unknown {
  return z.toJSONSchema(schema);
}
