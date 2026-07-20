/**
	* GET/POST /api/characters — 角色 JSON 列表与新建落盘。
	*/
import {
	CharacterDefSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	characterExists,
	isValidAgentId,
	listCharacterAgentIds,
	readCharacterJson,
	writeCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import { findTimeBucketsRejectReason } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";

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
		if (!body.character || typeof body.character !== "object") {
			return apiFail("VALIDATION_FAILED", "character object required");
		}
		const raw = body.character as { agentId?: string };
		if (!raw.agentId || typeof raw.agentId !== "string") {
			return apiFail("VALIDATION_FAILED", "agentId required");
		}
		if (!isValidAgentId(raw.agentId)) {
			return apiFail("VALIDATION_FAILED", "agentId 格式无效");
		}
		if (await characterExists(raw.agentId)) {
			return apiFail(
				"VALIDATION_FAILED",
				`character already exists: ${raw.agentId}`,
			);
		}
		const reject = findTimeBucketsRejectReason(body.character);
		if (reject) {
			return apiFail("VALIDATION_FAILED", reject, 422);
		}
		const parsed = CharacterDefSchema.safeParse(body.character);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		await writeCharacterJson(parsed.data.agentId, parsed.data);
		return apiOk({ character: parsed.data });
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
