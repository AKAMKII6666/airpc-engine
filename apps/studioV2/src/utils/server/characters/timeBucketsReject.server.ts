/**
	* 拒载守卫：角色 JSON 含已删除字段 timeBuckets。
	* Server 侧副本；与 Client characterDefMapper 同构，不以 import 同步。
	*/
export function findTimeBucketsRejectReason(raw: unknown): string | null {
	if (typeof raw !== "object" || raw === null) return null;
	const scenes = (raw as { defaultPromptScenes?: unknown }).defaultPromptScenes;
	if (!Array.isArray(scenes)) return null;
	for (const layer of scenes) {
		if (typeof layer !== "object" || layer === null) continue;
		const match = (layer as { match?: unknown }).match;
		if (typeof match !== "object" || match === null) continue;
		if (Object.prototype.hasOwnProperty.call(match, "timeBuckets")) {
			return "角色 JSON 含已删除字段 timeBuckets，拒载";
		}
	}
	return null;
}
