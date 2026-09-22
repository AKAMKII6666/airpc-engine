/**
	* 能力 API：characters 域。
	*/
import type { PluginCapabilityApi } from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import type { WrapApiCall } from "../core/wrapApiCall.server";
import {
	getPluginCharacter,
	getPluginCharacterRuntime,
	listPluginCharacters,
	updatePluginCharacterRuntime,
} from "./charactersApiHandlers.server";

export function createCharactersApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
}): Pick<PluginCapabilityApi, "characters"> {
	const { wrap, pluginId, host } = input;
	return {
		characters: {
			list() {
				return wrap(pluginId, "characters.list", listPluginCharacters);
			},
			get(characterId) {
				return wrap(pluginId, "characters.get", function () {
					return getPluginCharacter(characterId);
				});
			},
			getRuntime(userId, characterId) {
				return wrap(pluginId, "characters.getRuntime", function () {
					return getPluginCharacterRuntime({ host, userId, characterId });
				});
			},
			updateRuntime(userId, characterId, patch) {
				return wrap(pluginId, "characters.updateRuntime", function () {
					return updatePluginCharacterRuntime({
						host,
						userId,
						characterId,
						patch,
					});
				});
			},
		},
	};
}
