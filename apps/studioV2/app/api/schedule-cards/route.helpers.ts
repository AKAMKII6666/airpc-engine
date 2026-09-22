/**
	* /api/schedule-cards 旁路：新建 ScheduleCard 校验与摘要投影。
	*/
import {
	CallCardDefinitionSchema,
	formatZodError,
	type CallCardDefinition,
} from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	isValidScheduleCardId,
	scheduleCardExists,
} from "@studio-v2/src/utils/server/characters/scheduleCardsFs.server";
import type { ScheduleCardSummary } from "@studio-v2/src/utils/server/types/scheduleCardSummary.server";

/** 将 CallCardDefinition 投影为列表摘要；非 schedule 返回 null。 */
export function toSummary(raw: unknown): ScheduleCardSummary | null {
	const parsed = CallCardDefinitionSchema.safeParse(raw);
	if (!parsed.success || parsed.data.cardKind !== "schedule") {
		return null;
	}
	return {
		cardId: parsed.data.cardId,
		title: parsed.data.title ?? parsed.data.cardId,
		ownerAgentId: parsed.data.ownerAgentId,
	};
}

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown, fallbackMessage: string): Response {
	const code =
		err instanceof Error &&
		"code" in err &&
		typeof (err as { code?: unknown }).code === "string"
			? (err as { code: string }).code
			: "INTERNAL";
	return apiFail(
		code,
		err instanceof Error ? err.message : fallbackMessage,
		httpStatusForCode(code),
	);
}

/**
	* 校验新建日常卡：schema、cardKind、id 格式与冲突。
	*/
export async function prepareCreateScheduleCard(
	cardRaw: unknown,
): Promise<
	| { ok: true; card: CallCardDefinition }
	| { ok: false; response: Response }
> {
	const parsed = CallCardDefinitionSchema.safeParse(cardRaw);
	if (!parsed.success) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			}),
		};
	}
	if (parsed.data.cardKind !== "schedule") {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				"schedule-cards require cardKind=schedule",
			),
		};
	}
	const cardId = parsed.data.cardId;
	if (!isValidScheduleCardId(cardId)) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "cardId 格式无效"),
		};
	}
	if (await scheduleCardExists(cardId)) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				`schedule card already exists: ${cardId}`,
			),
		};
	}
	return { ok: true, card: parsed.data };
}
