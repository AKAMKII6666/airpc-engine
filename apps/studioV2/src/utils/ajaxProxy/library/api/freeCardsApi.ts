/**
	* FreeCallCard BFF：读写 data/characters/free-cards（经 /api/characters/free-cards）。
	*/
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";

export type FreeCardOneData = {
	card: CallCardDefinition;
};

/** GET /api/characters/free-cards/:freeCardId */
export async function fetchFreeCard(
	freeCardId: string,
): Promise<CallCardDefinition> {
	const res = await fetch(
		`/api/characters/free-cards/${encodeURIComponent(freeCardId)}`,
	);
	const data = await parseStudioApiJson<FreeCardOneData>(res);
	return data.card;
}

/** PUT /api/characters/free-cards/:freeCardId：整卡落盘（服务端强制 exits=[]） */
export async function putFreeCard(
	freeCardId: string,
	card: CallCardDefinition,
): Promise<CallCardDefinition> {
	const res = await fetch(
		`/api/characters/free-cards/${encodeURIComponent(freeCardId)}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ card }),
		},
	);
	const data = await parseStudioApiJson<FreeCardOneData>(res);
	return data.card;
}
