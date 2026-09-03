/**
 * core-compose：把引擎默认 Prompt Providers 包装为第一方包，便于开关与顺序治理。
 * 装配时若启用本包，merge 应传 baseProviders: []，避免与 DEFAULT 双份。
 */
import { DEFAULT_PROMPT_PROVIDERS } from "../../runtime/defaultPromptProviders.js";
import type { FirstPartyPack } from "../types.js";

export const CORE_COMPOSE_PACK_ID = "core-compose";

export const coreComposePack: FirstPartyPack = {
	manifest: {
		packId: CORE_COMPOSE_PACK_ID,
		packVersion: "1.0.0",
		apiVersion: 1,
		domains: ["realtime"],
	},
	contribute: {
		realtime: {
			"compose.providers": [...DEFAULT_PROMPT_PROVIDERS],
		},
	},
};
