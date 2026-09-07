/**
	* L2 能力 API 路径泄漏防线：返回 DTO 禁止暴露宿主磁盘根。
	*/
import { describe, expect, it } from "vitest";
import type { EngineHost, PlayerProfile } from "@airpc/rpg-engine";
import { createPluginCapabilityApi } from "@studio-v2/src/utils/server/plugins/api/createPluginCapabilityApi.server";

function expectNoDiskPath(value: unknown): void {
	const text = JSON.stringify(value);
	expect(text).not.toMatch(/\/Users\//);
	expect(text).not.toMatch(/\/data\//);
	expect(text).not.toMatch(/data\/(?:users|characters|storis-packages)/);
	expect(text).not.toMatch(/\.sqlite/);
}

function createLeakyProfile(userId: string): PlayerProfile {
	return {
		schemaVersion: 1,
		userId,
		user: {
			userId,
			nickname: "路径防线用户",
			location: {
				country: "CN",
				province: "ZJ",
				city: "HZ",
				district: "XH",
			},
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
		characters: {},
		stories: {},
		callCards: { board: { byAgent: {} } },
		world: { lore: null, facts: [], knowledge: {} },
		schedule: { clockMs: 0, intents: [] },
		research: { commitments: [] },
		meta: {
			privatePath: "/Users/bolbiao/workspace/airpc-engine/data/users",
			sqlitePath: "data/memory/demo.sqlite",
		},
	};
}

function createHost(profile: PlayerProfile): EngineHost {
	const host = {
		async ensureProfile() {
			return profile;
		},
		async saveProfile() {},
	} satisfies Partial<EngineHost>;
	return host as unknown as EngineHost;
}

describe("createPluginCapabilityApi path leak guard", () => {
	it("users.list and users.get never expose filesystem roots", async function () {
		const api = createPluginCapabilityApi({
			pluginId: "path-leak-test",
			getHost() {
				return createHost(createLeakyProfile("demo-user"));
			},
		});

		expectNoDiskPath(await api.users.list());
		expectNoDiskPath(await api.users.get("demo-user"));
	});

	it("characters list/get/runtime projections stay path-free", async function () {
		const profile = createLeakyProfile("demo-user");
		profile.callCards.board.byAgent.lanxing = {
			pending: [
				{
					instanceId: "inst_1",
					cardId: "card_1",
					chapterId: "chapter_1",
					agentId: "lanxing",
					status: "pending",
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
		};
		const api = createPluginCapabilityApi({
			pluginId: "path-leak-test",
			getHost() {
				return createHost(profile);
			},
		});

		expectNoDiskPath(await api.characters.list());
		expectNoDiskPath(await api.characters.get("lanxing"));
		expectNoDiskPath(await api.characters.getRuntime("demo-user", "lanxing"));
	});
});
