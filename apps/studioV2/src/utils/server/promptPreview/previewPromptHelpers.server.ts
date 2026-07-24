/**
	* 首通预览请求校验与 softExtras 组装；从 previewFirstConnectPrompt 拆出控复杂度。
	*/
import {
	CallCardDefinitionSchema,
	CharacterDefSchema,
	FREE_PACKAGE_ID,
	WorldLoreDocSchema,
	formatLoreSoftContext,
	type CallCardDefinition,
	type CharacterDef,
	type MemoryPort,
	type PlayerProfile,
} from "@airpc/rpg-engine";
import { readCharacterJson } from "@studio-v2/src/utils/server/characters/charactersFs.server";

export type PromptPreviewCallDirection = "inbound" | "outbound";

export type PromptPreviewRequest = {
	userId: string;
	callDirection: PromptPreviewCallDirection;
	localHour: number;
	packageId?: string;
	card: unknown;
};

export type PreviewValidateOk = {
	userId: string;
	card: CallCardDefinition;
	packageId: string;
	callDirection: PromptPreviewCallDirection;
	localHour: number;
};

export function validatePromptPreviewRequest(
	input: PromptPreviewRequest,
): PreviewValidateOk {
	const userId = input.userId.trim();
	if (userId === "") {
		throw Object.assign(new Error("userId required"), {
			code: "USER_REQUIRED",
		});
	}
	const localHour = readLocalHour(input.localHour);
	const callDirection = readCallDirection(input.callDirection);
	const card = readCard(input.card);
	const packageId = resolvePreviewPackageId(card, input.packageId);
	return { userId, card, packageId, callDirection, localHour };
}

function readLocalHour(raw: number): number {
	const hour = Math.trunc(raw);
	if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
		throw Object.assign(new Error("localHour must be 0–23"), {
			code: "VALIDATION_FAILED",
		});
	}
	return hour;
}

function readCallDirection(raw: unknown): PromptPreviewCallDirection {
	if (raw !== "inbound" && raw !== "outbound") {
		throw Object.assign(new Error("callDirection invalid"), {
			code: "VALIDATION_FAILED",
		});
	}
	return raw;
}

function readCard(raw: unknown): CallCardDefinition {
	const cardParsed = CallCardDefinitionSchema.safeParse(raw);
	if (!cardParsed.success) {
		throw Object.assign(
			new Error(
				`card schema: ${cardParsed.error.issues[0]?.message ?? "invalid"}`,
			),
			{ code: "VALIDATION_FAILED" },
		);
	}
	return cardParsed.data;
}

function resolvePreviewPackageId(
	card: CallCardDefinition,
	packageId: string | undefined,
): string {
	const trimmed = typeof packageId === "string" ? packageId.trim() : "";
	if (trimmed !== "") return trimmed;
	if (card.cardKind === "free" || card.cardKind === "schedule") {
		return FREE_PACKAGE_ID;
	}
	throw Object.assign(new Error("packageId required for story card"), {
		code: "VALIDATION_FAILED",
	});
}

export async function loadCharacterDefForPreview(
	agentId: string | undefined,
): Promise<CharacterDef | null> {
	const id = typeof agentId === "string" ? agentId.trim() : "";
	if (id === "") return null;
	try {
		const raw = await readCharacterJson(id);
		const parsed = CharacterDefSchema.safeParse(raw);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export async function buildPreviewSoftExtras(input: {
	userId: string;
	card: CallCardDefinition;
	profile: PlayerProfile;
	memory: MemoryPort | null;
}): Promise<string[]> {
	const softExtras: string[] = [];
	if (input.memory) {
		const projection = await input.memory.projectForCall({
			userId: input.userId,
			agentId: input.card.ownerAgentId ?? "",
			card: input.card,
			nowIso: new Date().toISOString(),
		});
		if (projection.softText) {
			softExtras.push(`[memory]\n${projection.softText}`);
		}
	}
	const loreParsed = WorldLoreDocSchema.safeParse(input.profile.world?.lore);
	const loreSoft = formatLoreSoftContext(
		loreParsed.success ? loreParsed.data : null,
		input.card.ownerAgentId ?? "",
	);
	if (loreSoft) {
		softExtras.push(loreSoft);
	}
	return softExtras;
}
