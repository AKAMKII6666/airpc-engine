import { describe, expect, it } from "vitest";
import {
	CapabilityPacksManifestSchema,
	parseCapabilityPacksManifest,
	safeParseCapabilityPacksManifest,
} from "../src/manifest.js";
import { createMockPluginCapabilityApi, mockApi } from "../src/mockApi.js";
import {
	BACKGROUND_SLOTS,
	isUiSlot,
	REALTIME_SLOTS,
	UI_SLOTS,
} from "../src/slots.js";
import { PLUGIN_LOG_EVENT_TYPES } from "../src/logEvents.js";

const fullManifest = {
	id: "computer-control",
	name: "电脑控制",
	version: "1.0.0",
	apiVersion: 1 as const,
	enabled: true,
	main: "./index.js",
	realtime: {
		enabled: true,
		pipelines: [
			{
				slot: "compose.providers",
				after: "time",
				entry: "./realtime/injectPrompt.js",
			},
			{
				slot: "tools.register",
				entry: "./realtime/tools.js",
			},
		],
	},
	background: {
		enabled: true,
		pipelines: [
			{
				slot: "tasks.register",
				entry: "./background/registerJobs.js",
			},
			{
				slot: "outbound.request",
				entry: "./background/requestCall.js",
			},
		],
	},
	ui: {
		enabled: true,
		panels: [
			{ slot: "settings.plugin", entry: "./ui/GlobalSettings.js" },
			{ slot: "character.plugin", entry: "./ui/CharacterSettings.js" },
			{ slot: "user.plugin", entry: "./ui/UserSettings.js" },
		],
	},
};

describe("CapabilityPacksManifestSchema", () => {
	it("accepts a full 25 §4 example-shaped manifest", () => {
		const parsed = parseCapabilityPacksManifest(fullManifest);
		expect(parsed.id).toBe("computer-control");
		expect(parsed.apiVersion).toBe(1);
		expect(parsed.ui?.panels).toHaveLength(3);
		expect(parsed.realtime?.pipelines[0]?.after).toBe("time");
	});

	it("rejects apiVersion other than 1", () => {
		const result = safeParseCapabilityPacksManifest({
			...fullManifest,
			apiVersion: 2,
		});
		expect(result.success).toBe(false);
	});

	it("rejects unknown realtime slot", () => {
		const result = CapabilityPacksManifestSchema.safeParse({
			id: "x",
			version: "0.0.1",
			apiVersion: 1,
			enabled: true,
			realtime: {
				enabled: true,
				pipelines: [{ slot: "settings.plugin", entry: "./x.js" }],
			},
		});
		expect(result.success).toBe(false);
	});

	it("allows omitting domain blocks", () => {
		const parsed = parseCapabilityPacksManifest({
			id: "minimal",
			version: "0.0.1",
			apiVersion: 1,
			enabled: false,
		});
		expect(parsed.realtime).toBeUndefined();
		expect(parsed.background).toBeUndefined();
		expect(parsed.ui).toBeUndefined();
	});

	it("rejects empty id", () => {
		const result = safeParseCapabilityPacksManifest({
			id: "",
			version: "0.0.1",
			apiVersion: 1,
			enabled: true,
		});
		expect(result.success).toBe(false);
	});
});

describe("slot constants", () => {
	it("soft-copies realtime and background lists and exposes UI slots", () => {
		expect(REALTIME_SLOTS).toContain("compose.providers");
		expect(REALTIME_SLOTS).toContain("commit.extract");
		expect(BACKGROUND_SLOTS).toContain("tasks.onTick");
		expect(UI_SLOTS).toEqual([
			"settings.plugin",
			"character.plugin",
			"user.plugin",
		]);
		expect(isUiSlot("settings.plugin")).toBe(true);
		expect(isUiSlot("compose.providers")).toBe(false);
	});
});

describe("mockApi", () => {
	it("returns stub namespaces that resolve without throwing", async () => {
		const api = mockApi({ pluginId: "t" });
		expect(api.pluginId).toBe("t");
		expect(await api.users.list()).toEqual([]);
		expect(await api.memory.query({ userId: "u", characterId: "c" })).toEqual(
			[],
		);
		expect(await api.outbound.requestCall({ userId: "u", characterId: "c" })).toEqual(
			{ accepted: false, reason: "mock" },
		);
		const withOverride = createMockPluginCapabilityApi({
			users: {
				async list() {
					return [{ userId: "u1" }];
				},
			},
		});
		expect(await withOverride.users.list()).toEqual([{ userId: "u1" }]);
	});
});

describe("PluginLogEvent types", () => {
	it("lists all required observable event type strings", () => {
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.scan");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.load_ok");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.load_skipped");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.load_failed");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.slot_contrib");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.task_register");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.task_tick");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.outbound_prepare");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.outbound_request");
		expect(PLUGIN_LOG_EVENT_TYPES).toContain("plugin.api_call");
	});
});
