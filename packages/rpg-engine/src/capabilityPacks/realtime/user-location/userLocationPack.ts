/**
 * F-10 样板：将 Profile.user.location 注入 compose soft（Prompt Provider）。
 * 真源只读 Profile；禁止当墙钟。
 */
import type { PromptProvider } from "../../../runtime/composer.js";
import type { FirstPartyPack } from "../../types.js";
import type { UserLocationSnapshot } from "../../contributeTypes.js";

export const USER_LOCATION_PACK_ID = "user-location";
export const USER_LOCATION_PROVIDER_ID = "user.location";

function formatLocationBlock(location: UserLocationSnapshot): string {
	const district = location.district?.trim();
	const parts = [
		location.country,
		location.province,
		location.city,
		district || undefined,
	].filter(Boolean);
	return `[location]\n用户当前位置：${parts.join(" · ")}`;
}

export const userLocationPromptProvider: PromptProvider = {
	providerId: USER_LOCATION_PROVIDER_ID,
	apply(ctx) {
		const location = ctx.input.userSnapshot?.location;
		if (!location) return;
		if (!location.country && !location.province && !location.city) return;
		ctx.softContext.push(formatLocationBlock(location));
	},
};

export const userLocationPack: FirstPartyPack = {
	manifest: {
		packId: USER_LOCATION_PACK_ID,
		packVersion: "1.0.0",
		apiVersion: 1,
		domains: ["realtime"],
	},
	contribute: {
		realtime: {
			"compose.providers": [userLocationPromptProvider],
		},
	},
};
