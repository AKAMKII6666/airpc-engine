/**
 * L1-E：core-compose 包装默认 providers（T7）。
 */
import { describe, expect, it } from "vitest";
import {
	CORE_COMPOSE_PACK_ID,
	coreComposePack,
	createDefaultPromptProviderRegistry,
	listPromptProviderIds,
	mergeCapabilityPacks,
	USER_LOCATION_PACK_ID,
	userLocationPack,
} from "../../src/index.js";

describe("capabilityPacks L1-E core-compose", function () {
	it("T7 core-compose provider ids match default registry", function () {
		const defaults = listPromptProviderIds(
			createDefaultPromptProviderRegistry(),
		);
		const merged = mergeCapabilityPacks({
			packs: [coreComposePack],
			enabledPackIds: [CORE_COMPOSE_PACK_ID],
			baseProviders: [],
		});
		expect(merged.promptProviderRegistry.getProviderIds()).toEqual(defaults);
	});

	it("core-compose + user-location appends without duplicating defaults", function () {
		const defaults = listPromptProviderIds(
			createDefaultPromptProviderRegistry(),
		);
		const merged = mergeCapabilityPacks({
			packs: [coreComposePack, userLocationPack],
			enabledPackIds: [CORE_COMPOSE_PACK_ID, USER_LOCATION_PACK_ID],
			baseProviders: [],
		});
		const ids = merged.promptProviderRegistry.getProviderIds();
		expect(ids.slice(0, defaults.length)).toEqual(defaults);
		expect(ids).toContain("user.location");
	});
});
