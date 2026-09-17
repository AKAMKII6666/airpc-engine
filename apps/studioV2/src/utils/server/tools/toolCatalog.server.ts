/**
	* Studio 动态工具目录：只从 Host 注入 Registry 投影，Client 不 import 引擎值。
	*/
import {
	listEnabledCharacterToolCapabilityIds,
	toolAllowedForCardContext,
	type CardKind,
	type CharacterDef,
	type InteractionMode,
	type RegisteredTool,
	type ToolRegistry,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { loadCharacterDefForPreview } from "@studio-v2/src/utils/server/promptPreview/previewPromptHelpers.server";

export type ToolCatalogGroup =
	| "call_control"
	| "builtin"
	| "character"
	| "plugin";

export type ToolCatalogItemDto = {
	toolId: string;
	displayName: string;
	description: string;
	behavior: string;
	group: ToolCatalogGroup;
	sourceKind: "builtin" | "shell" | "l1" | "plugin";
	providerId: string;
	providerDisplayName: string;
	selectable: boolean;
	unavailableReason: string | null;
	inheritByDefault: boolean;
	declaredByCharacter: boolean;
	pluginEnabled: boolean | null;
	pluginLoaded: boolean | null;
};

export type ToolCatalogDto = {
	registryRevision: string;
	agentId: string;
	cardKind: CardKind;
	interactionMode: InteractionMode;
	tools: ToolCatalogItemDto[];
};

function groupFor(registration: RegisteredTool): ToolCatalogGroup {
	if (registration.source.kind === "shell") return "call_control";
	if (registration.source.kind === "plugin") return "plugin";
	if (registration.definition.availability === "character_capability") {
		return "character";
	}
	return "builtin";
}

function availability(input: {
	registration: RegisteredTool;
	cardKind: CardKind;
	interactionMode: InteractionMode;
	character: CharacterDef | null;
}): { selectable: boolean; reason: string | null; declared: boolean } {
	const declared = new Set(
		listEnabledCharacterToolCapabilityIds(input.character),
	).has(input.registration.definition.toolId);
	if (!toolAllowedForCardContext(input.registration.definition, input)) {
		const reason = input.interactionMode === "playback_only" ||
			input.cardKind === "voicemail"
			? "playback_tools_disabled"
			: "card_kind_blocked";
		return { selectable: false, reason, declared };
	}
	if (
		input.registration.definition.availability === "character_capability" &&
		!declared
	) {
		return {
			selectable: false,
			reason: "character_capability_missing",
			declared,
		};
	}
	return { selectable: true, reason: null, declared };
}

export async function getToolCatalog(input: {
	agentId: string;
	cardKind: CardKind;
	interactionMode: InteractionMode;
}): Promise<ToolCatalogDto> {
	const host = await getStudioV2EngineHost();
	const registry = host.getToolRegistry();
	const character = await loadCharacterDefForPreview(input.agentId);
	return projectToolCatalog({ ...input, registry, character });
}

/** 纯投影：API、单测和未来导出预检共用，不维护静态工具镜像。 */
export function projectToolCatalog(input: {
	agentId: string;
	cardKind: CardKind;
	interactionMode: InteractionMode;
	registry: ToolRegistry;
	character: CharacterDef | null;
}): ToolCatalogDto {
	return {
		registryRevision: input.registry.revision,
		agentId: input.agentId,
		cardKind: input.cardKind,
		interactionMode: input.interactionMode,
		tools: input.registry.registrations.map(function (registration) {
			const state = availability({
				...input,
				registration,
				character: input.character,
			});
			const plugin = registration.source.kind === "plugin";
			return {
				toolId: registration.definition.toolId,
				displayName: registration.definition.displayName,
				description: registration.definition.description,
				behavior: registration.definition.behavior,
				group: groupFor(registration),
				sourceKind: registration.source.kind,
				providerId: registration.source.providerId,
				providerDisplayName: registration.source.displayName,
				selectable: state.selectable,
				unavailableReason: state.reason,
				inheritByDefault: registration.inheritByDefault,
				declaredByCharacter: state.declared,
				pluginEnabled: plugin ? true : null,
				pluginLoaded: plugin ? true : null,
			};
		}),
	};
}
