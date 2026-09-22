/**
	* 过程话术变体列表规范化与新 UUID。
	*/
import type { PromptVariantForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

/** 新变体稳定键；隐藏字段，禁止作者手填 */
export function newVariantId(): string {
	return createStudioId("variant");
}

export function asVariantList(raw: unknown): PromptVariantForm[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => {
		if (typeof item !== "object" || item === null) {
			return { variantId: newVariantId(), text: "" };
		}
		const row = item as { variantId?: unknown; text?: unknown };
		const existing =
			typeof row.variantId === "string" && row.variantId.trim() !== ""
				? row.variantId
				: newVariantId();
		return {
			variantId: existing,
			text: typeof row.text === "string" ? row.text : "",
		};
	});
}

export function buildVariantWatchText(list: PromptVariantForm[]): string {
	if (list.length === 0) return "（空列表）";
	return list.map((v) => v.text || "（空正文）").join("；");
}
