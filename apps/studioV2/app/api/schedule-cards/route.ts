/**
	* GET/POST /api/schedule-cards — 角色日常 ScheduleCard 列表与新建落盘。
	* 真源 = data/characters/schedule-cards；禁止写入 storis-packages。
	*/
import {
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	listScheduleCardIds,
	readScheduleCardJson,
	writeScheduleCardJson,
} from "@studio-v2/src/utils/server/characters/scheduleCardsFs.server";
import type { ScheduleCardSummary } from "@studio-v2/src/utils/server/types/scheduleCardSummary.server";
import {
	failFromUnknown,
	prepareCreateScheduleCard,
	toSummary,
} from "./route.helpers";

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
		return failFromUnknown(error, "list failed");
	}
}

/**
	* 新建日常 ScheduleCard：body 为完整 CallCardDefinition，强制 cardKind=schedule。
	*/
export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as { card?: unknown };
		const cardRaw = body.card ?? body;
		const prepared = await prepareCreateScheduleCard(cardRaw);
		if (!prepared.ok) return prepared.response;
		await writeScheduleCardJson(prepared.card.cardId, prepared.card);
		const summary = toSummary(prepared.card);
		return apiOk({ item: summary }, { status: 201 });
	} catch (error) {
		return failFromUnknown(error, "create failed");
	}
}
