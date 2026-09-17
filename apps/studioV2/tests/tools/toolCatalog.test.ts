/** 动态工具目录必须直接投影统一 Registry 与角色能力。 */
import { describe, expect, it } from "vitest";
import {
	createToolRegistry,
	type CharacterDef,
	type RegisteredTool,
} from "@airpc/rpg-engine";
import { projectToolCatalog } from "@studio-v2/src/utils/server/tools/toolCatalog.server";

function pluginTool(): RegisteredTool {
	return {
		definition: {
			toolId: "plugin:weather-kit:lookup_weather",
			displayName: "查询天气",
			description: "查询天气。",
			inputSchema: { type: "object" },
			allowedCardKinds: ["story", "free"],
			allowedInPlayback: false,
			behavior: "external",
		},
		source: {
			kind: "plugin",
			providerId: "weather-kit",
			displayName: "天气能力",
		},
		inheritByDefault: false,
		invoke() {
			return {};
		},
	};
}

function character(agentId: string, withBazi: boolean): CharacterDef {
	return {
		schemaVersion: 1,
		agentId,
		dialable: true,
		capabilities: withBazi
			? { tools: [{ toolId: "compute_bazi_chart", enabled: true }] }
			: { tools: [] },
	};
}

describe("projectToolCatalog", function () {
	it("groups shell/plugin tools and gates character-only bazi capability", function () {
		const registry = createToolRegistry([pluginTool()]);
		const bai = projectToolCatalog({
			agentId: "bai_bansian",
			cardKind: "story",
			interactionMode: "realtime_dialogue",
			registry,
			character: character("bai_bansian", true),
		});
		const other = projectToolCatalog({
			agentId: "lanxing",
			cardKind: "story",
			interactionMode: "realtime_dialogue",
			registry,
			character: character("lanxing", false),
		});
		expect(bai.tools.find((tool) => tool.toolId === "request_hangup"))
			.toMatchObject({ group: "call_control", selectable: true });
		expect(bai.tools.find((tool) => tool.toolId === "compute_bazi_chart"))
			.toMatchObject({ group: "character", selectable: true });
		expect(other.tools.find((tool) => tool.toolId === "compute_bazi_chart"))
			.toMatchObject({
				group: "character",
				selectable: false,
				unavailableReason: "character_capability_missing",
			});
		expect(bai.tools.find((tool) => tool.toolId === "plugin:weather-kit:lookup_weather"))
			.toMatchObject({
				group: "plugin",
				providerDisplayName: "天气能力",
				inheritByDefault: false,
				pluginEnabled: true,
				pluginLoaded: true,
			});
	});

	it("marks every tool unselectable for playback and voicemail", function () {
		const registry = createToolRegistry([pluginTool()]);
		for (const cardKind of ["story", "voicemail"] as const) {
			const catalog = projectToolCatalog({
				agentId: "bai_bansian",
				cardKind,
				interactionMode: "playback_only",
				registry,
				character: character("bai_bansian", true),
			});
			expect(catalog.tools.every((tool) => !tool.selectable)).toBe(true);
		}
	});
});
