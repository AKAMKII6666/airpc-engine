/**
 * mergeCapabilityPacks 单元测步骤：关包事件与 tools.register 归一化。
 */
import { expect } from "vitest";
import {
	mergeCapabilityPacks,
	type FirstPartyPack,
} from "../../src/index.js";
import { samplePack } from "./samplePackFixture.js";

export function assertDisabledPackMergeEvents(): void {
	const merged = mergeCapabilityPacks({
		packs: [
			samplePack("keep", "pack.keep"),
			samplePack("drop", "pack.drop"),
		],
		enabledPackIds: ["keep"],
	});
	expect(merged.enabledPackIds).toEqual(["keep"]);
	expect(merged.disabledPackIds).toEqual(["drop"]);
	expect(merged.promptProviderRegistry.getProviderIds()).toContain(
		"pack.keep",
	);
	expect(merged.promptProviderRegistry.getProviderIds()).not.toContain(
		"pack.drop",
	);
	expect(merged.events).toEqual(
		expect.arrayContaining([
			{ type: "capabilityPack.disabled", packId: "drop" },
			{
				type: "capabilityPack.merge",
				packIds: ["keep"],
				apiVersion: 1,
			},
		]),
	);
}

function buildL1WeatherPack(): FirstPartyPack {
	return {
		manifest: {
			packId: "l1-weather",
			packVersion: "1.0.0",
			apiVersion: 1,
			domains: ["realtime"],
		},
		contribute: {
			realtime: {
				"tools.register": [
					{
						definition: {
							toolId: "l1_lookup_weather",
							displayName: "查询天气",
							description: "查询天气。",
							inputSchema: { type: "object" },
							allowedCardKinds: ["free"],
							allowedInPlayback: false,
							behavior: "external",
						},
						inheritByDefault: true,
						invoke() {
							return { weather: "sunny" };
						},
					},
				],
			},
		},
	};
}

export function assertNormalizedL1ToolRegister(): void {
	const merged = mergeCapabilityPacks({
		packs: [buildL1WeatherPack()],
		baseProviders: [],
	});
	expect(merged.registeredTools[0]).toMatchObject({
		definition: { toolId: "l1_lookup_weather", behavior: "external" },
		source: {
			kind: "l1",
			providerId: "l1-weather",
			displayName: "l1-weather",
		},
		inheritByDefault: true,
	});
	expect(merged.packIdByToolId.get("l1_lookup_weather")).toBe("l1-weather");
}
