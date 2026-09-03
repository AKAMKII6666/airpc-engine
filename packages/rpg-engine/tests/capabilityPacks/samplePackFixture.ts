/**
 * CapabilityPack 测试夹具。
 */
import type { FirstPartyPack, PromptProvider } from "../../src/index.js";

function sampleProvider(providerId: string): PromptProvider {
	return {
		providerId,
		apply(ctx) {
			ctx.softContext.push(`[${providerId}]\nsample`);
		},
	};
}

export function samplePack(packId: string, providerId: string): FirstPartyPack {
	return {
		manifest: {
			packId,
			packVersion: "0.0.1",
			apiVersion: 1,
			domains: ["realtime"],
		},
		contribute: {
			realtime: {
				"compose.providers": [sampleProvider(providerId)],
			},
		},
	};
}
