/**
 * Lore bootstrap 单测共用 fixture
 */
import type { LoreBootstrapPort, PlayerProfile, WorldLoreDoc } from "@airpc/rpg-engine";

export function bareProfile(userId: string): PlayerProfile {
	const now = new Date().toISOString();
	return {
		schemaVersion: 1,
		userId,
		user: {
			userId,
			nickname: "t",
			location: {
				country: "中国",
				province: "广东省",
				city: "深圳市",
			},
			createdAt: now,
			updatedAt: now,
		},
		characters: {},
		stories: {},
		callCards: { board: { byAgent: {} } },
		world: { lore: null, facts: [], knowledge: {} },
		schedule: { clockMs: 0, intents: [] },
		research: { commitments: [] },
	};
}

export function mockLlmPort(lore: WorldLoreDoc): LoreBootstrapPort {
	return {
		generate: async function () {
			return lore;
		},
	};
}

export function failingLorePort(message: string): LoreBootstrapPort {
	return {
		generate: async function () {
			throw new Error(message);
		},
	};
}
