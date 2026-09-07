/**
	* 能力 API：characters 域。
	*/
import type {
	PluginCapabilityApi,
	PluginCharacterRecord,
	PluginCharacterSummary,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import {
	listCharacterAgentIds,
	readCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import type { WrapApiCall } from "./wrapApiCall.server";

export function createCharactersApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
}): Pick<PluginCapabilityApi, "characters"> {
	const { wrap, pluginId, host } = input;
	return {
		characters: {
			list() {
				return wrap(pluginId, "characters.list", async function () {
					const ids = await listCharacterAgentIds();
					const out: PluginCharacterSummary[] = [];
					for (const characterId of ids) {
						let displayName = characterId;
						try {
							const def = (await readCharacterJson(characterId)) as {
								displayName?: unknown;
							};
							if (typeof def.displayName === "string") {
								displayName = def.displayName;
							}
						} catch {
							/* ignore */
						}
						out.push({ characterId, displayName });
					}
					return out;
				});
			},
			get(characterId) {
				return wrap(pluginId, "characters.get", async function () {
					try {
						const def = (await readCharacterJson(characterId)) as {
							displayName?: unknown;
						};
						return {
							characterId,
							displayName:
								typeof def.displayName === "string"
									? def.displayName
									: undefined,
						} as PluginCharacterRecord;
					} catch {
						return null;
					}
				});
			},
			getRuntime(userId, characterId) {
				return wrap(pluginId, "characters.getRuntime", async function () {
					const profile = await (await host()).ensureProfile(userId);
					const runtime = profile.characters?.[characterId];
					const board = profile.callCards?.board?.byAgent?.[characterId];
					return {
						userId,
						characterId,
						unlocked: runtime?.unlocked ?? false,
						pendingCount: board?.pending?.length ?? 0,
					};
				});
			},
			updateRuntime(userId, characterId, patch) {
				return wrap(pluginId, "characters.updateRuntime", async function () {
					const h = await host();
					const profile = await h.ensureProfile(userId);
					const prev = profile.characters?.[characterId] ?? {
						agentId: characterId,
					};
					const next = {
						...prev,
						agentId: characterId,
						...(typeof patch.unlocked === "boolean"
							? { unlocked: patch.unlocked }
							: {}),
					};
					profile.characters = {
						...(profile.characters ?? {}),
						[characterId]: next,
					};
					await h.saveProfile(userId, "manual");
					const board = profile.callCards?.board?.byAgent?.[characterId];
					return {
						userId,
						characterId,
						unlocked: next.unlocked ?? false,
						pendingCount: board?.pending?.length ?? 0,
					};
				});
			},
		},
	};
}
