/**
	* GET/POST /api/schedule-cards — 角色日常 ScheduleCard 列表与新建落盘。
	* 真源 = data/characters/schedule-cards；禁止写入 storis-packages。
	*/
import {
	CallCardDefinitionSchema,
	formatZodError,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	isValidScheduleCardId,
	listScheduleCardIds,
	readScheduleCardJson,
	scheduleCardExists,
	writeScheduleCardJson,
} from "@studio-v2/src/utils/server/characters/scheduleCardsFs.server";
import type { ScheduleCardSummary } from "@studio-v2/src/utils/server/types/scheduleCardSummary.server";

function toSummary(raw: unknown): ScheduleCardSummary | null {
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

export async function GET(): Promise<Response> {
	try {
		const ids = await listScheduleCardIds();
		const items: ScheduleCardSummary[] = [];
		for (const cardId of ids) {
			try {
				const summary = toSummary(await readScheduleCardJson(cardId));
				if (summary) items.push(summary);
			} catch {
				// 跳过破损单卡，避免整表失败
			}
		}
		return apiOk({ items });
	} catch (error) {
		const code =
			error instanceof Error &&
			"code" in error &&
			typeof (error as { code?: unknown }).code === "string"
				? (error as { code: string }).code
				: "INTERNAL";
		return apiFail(code, error instanceof Error ? error.message : "list failed", httpStatusForCode(code));
	}
}

/**
	* 新建日常 ScheduleCard：body 为完整 CallCardDefinition，强制 cardKind=schedule。
	*/
export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as { card?: unknown };
		const cardRaw = body.card ?? body;
		const parsed = CallCardDefinitionSchema.safeParse(cardRaw);
		if (!parsed.success) {
			return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
				issues: parsed.error.issues,
			});
		}
		if (parsed.data.cardKind !== "schedule") {
			return apiFail(
				"VALIDATION_FAILED",
				"schedule-cards require cardKind=schedule",
			);
		}
		const cardId = parsed.data.cardId;
		if (!isValidScheduleCardId(cardId)) {
			return apiFail("VALIDATION_FAILED", "cardId 格式无效");
		}
		if (await scheduleCardExists(cardId)) {
			return apiFail(
				"VALIDATION_FAILED",
				`schedule card already exists: ${cardId}`,
			);
		}
		await writeScheduleCardJson(cardId, parsed.data);
		const summary = toSummary(parsed.data);
		return apiOk({ item: summary }, { status: 201 });
	} catch (error) {
		const code =
			error instanceof Error &&
			"code" in error &&
			typeof (error as { code?: unknown }).code === "string"
				? (error as { code: string }).code
				: "INTERNAL";
		return apiFail(
			code,
			error instanceof Error ? error.message : "create failed",
			httpStatusForCode(code),
		);
	}
}
