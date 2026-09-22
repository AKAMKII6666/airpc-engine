/**
	* GET/POST /api/characters — 角色 JSON 列表与新建落盘。
	*/
import {
	CharacterDefSchema,
	formatZodError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	listCharacterAgentIds,
	readCharacterJson,
	writeCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import { findTimeBucketsRejectReason } from "@studio-v2/src/utils/server/characters/timeBucketsReject.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import { failFromUnknown, prepareCreateCharacter } from "./route.helpers";

export async function GET(): Promise<Response> {
	try {
		const ids = await listCharacterAgentIds();
		const characters = [];
		for (const agentId of ids) {
			const raw = await readCharacterJson(agentId);
			const reject = findTimeBucketsRejectReason(raw);
			if (reject) {
				return apiFail("VALIDATION_FAILED", reject, 422);
			}
			const parsed = CharacterDefSchema.safeParse(raw);
			if (!parsed.success) {
				return apiFail(
					"VALIDATION_FAILED",
					formatZodError(parsed.error),
					400,
					{ agentId, issues: parsed.error.issues },
				);
			}
			characters.push(parsed.data);
		}
		return apiOk({ characters });
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { character?: unknown };
		const prepared = await prepareCreateCharacter(body);
		if (!prepared.ok) return prepared.response;
		await writeCharacterJson(prepared.character.agentId, prepared.character);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({ character: prepared.character });
	} catch (err) {
		return failFromUnknown(err);
	}
}
