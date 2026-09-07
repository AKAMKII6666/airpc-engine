/**
	* 能力 API：users 域。
	*/
import type {
	PluginCapabilityApi,
	PluginUserContext,
	PluginUserRecord,
	PluginUserSummary,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { listDiskUserSummaries } from "@studio-v2/src/utils/server/users/usersFs.server";
import type { WrapApiCall } from "./wrapApiCall.server";

export function createUsersApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
	getCurrentUserId?: () => string | null;
}): Pick<PluginCapabilityApi, "users"> {
	const { wrap, pluginId, host } = input;
	return {
		users: {
			list() {
				return wrap(pluginId, "users.list", async function () {
					const rows = await listDiskUserSummaries();
					return rows.map(function (u): PluginUserSummary {
						return { userId: u.userId, displayName: u.nickname };
					});
				});
			},
			get(userId) {
				return wrap(pluginId, "users.get", async function () {
					const profile = await (await host()).ensureProfile(userId);
					const record: PluginUserRecord = {
						userId,
						nickname: profile.user?.nickname,
						location: profile.user?.location,
					};
					return record;
				});
			},
			update(userId, patch) {
				return wrap(pluginId, "users.update", async function () {
					const h = await host();
					const profile = await h.ensureProfile(userId);
					if (typeof patch.nickname === "string") {
						profile.user = {
							...(profile.user ?? {}),
							nickname: patch.nickname,
						};
					}
					await h.saveProfile(userId, "manual");
					return {
						userId,
						nickname: profile.user?.nickname,
					} as PluginUserRecord;
				});
			},
			getCurrentContext() {
				return wrap(pluginId, "users.getCurrentContext", async function () {
					const userId = input.getCurrentUserId?.() ?? null;
					if (!userId) return null;
					const ctx: PluginUserContext = { userId };
					return ctx;
				});
			},
		},
	};
}
