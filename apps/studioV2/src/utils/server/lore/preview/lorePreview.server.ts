/**
	* Profile.world.lore → 详情页只读预览 DTO（Server/API 专用）。
	*/
import {
	WorldLoreDocSchema,
	type PlayerProfile,
	type WorldLoreDoc,
} from "@airpc/rpg-engine";
import type { LorePreviewDto } from "./lorePreviewDto.server";

/** 从 WorldLoreDoc 投影详情页只读字段。 */
export function lorePreviewFromDoc(lore: WorldLoreDoc): LorePreviewDto {
	return {
		source: lore.source,
		sharedPremise: lore.sharedPremise,
		generatedAt: lore.generatedAt,
		location: lore.location,
	};
}

/** 从整份 Profile 投影 lore 预览；无 lore 或校验失败返回 null。 */
export function lorePreviewFromProfile(
	profile: PlayerProfile,
): LorePreviewDto | null {
	const parsed = WorldLoreDocSchema.safeParse(profile.world?.lore);
	if (!parsed.success) {
		return null;
	}
	return lorePreviewFromDoc(parsed.data);
}
