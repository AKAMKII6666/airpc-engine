/**
	* characters 能力 API 的具体实现（与 factory 分离以降复杂度）。
	*/
import type {
	PluginCharacterRecord,
	PluginCharacterSummary,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import {
	listCharacterAgentIds,
	readCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";

export async function listPluginCharacters(): Promise<PluginCharacterSummary[]> {
	const ids = await listCharacterAgentIds();
	const out: PluginCharacterSummary[] = [];
	for (const characterId of ids) {
		out.push(await summarizeCharacter(characterId));
	}
	return out;
}

async function summarizeCharacter(
	characterId: string,
): Promise<PluginCharacterSummary> {
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
	return { characterId, displayName };
}

export async function getPluginCharacter(
	characterId: string,
): Promise<PluginCharacterRecord | null> {
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
}

export async function getPluginCharacterRuntime(input: {
	host: () => Promise<EngineHost>;
	userId: string;
	characterId: string;
}): Promise<{
	userId: string;
	characterId: string;
	unlocked: boolean;
	pendingCount: number;
}> {
	const profile = await (await input.host()).ensureProfile(input.userId);
	const runtime = profile.characters?.[input.characterId];
	const board = profile.callCards?.board?.byAgent?.[input.characterId];
	return {
		userId: input.userId,
		characterId: input.characterId,
		unlocked: runtime?.unlocked ?? false,
		pendingCount: board?.pending?.length ?? 0,
	};
}

export async function updatePluginCharacterRuntime(input: {
	host: () => Promise<EngineHost>;
	userId: string;
	characterId: string;
	patch: { unlocked?: boolean };
}): Promise<{
	userId: string;
	characterId: string;
	unlocked: boolean;
	pendingCount: number;
}> {
	const h = await input.host();
	const profile = await h.ensureProfile(input.userId);
	const prev = profile.characters?.[input.characterId] ?? {
		agentId: input.characterId,
	};
	const next = {
		...prev,
		agentId: input.characterId,
		...(typeof input.patch.unlocked === "boolean"
			? { unlocked: input.patch.unlocked }
			: {}),
	};
	profile.characters = {
		...(profile.characters ?? {}),
		[input.characterId]: next,
	};
	await h.saveProfile(input.userId, "manual");
	const board = profile.callCards?.board?.byAgent?.[input.characterId];
	return {
		userId: input.userId,
		characterId: input.characterId,
		unlocked: next.unlocked ?? false,
		pendingCount: board?.pending?.length ?? 0,
	};
}
