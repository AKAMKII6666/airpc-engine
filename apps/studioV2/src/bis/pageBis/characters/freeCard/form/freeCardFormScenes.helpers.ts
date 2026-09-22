/**
	* Free 卡场景层投影（抽出以降圈复杂度）。
	*/
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

function emptyScenes(): PromptSceneLayerForm[] {
	return [];
}

function mapCallDirection(
	dir: unknown,
): PromptSceneLayerForm["match"]["callDirection"] {
	if (dir === "inbound" || dir === "outbound" || dir === "either") {
		return dir;
	}
	return "either";
}

function mapLayerId(layerId: unknown): string {
	if (typeof layerId === "string" && layerId.trim() !== "") {
		return layerId;
	}
	return createStudioId("scene");
}

function mapOneSceneFromCard(layer: unknown, index: number): PromptSceneLayerForm {
	const l = layer as {
		layerId?: string;
		match?: {
			callDirection?: string;
			localHourRange?: { from?: number; to?: number };
		};
		patch?: Record<string, string>;
	};
	return {
		layerId: mapLayerId(l.layerId),
		priority: index * 10,
		match: {
			callDirection: mapCallDirection(l.match?.callDirection),
			localHourRange: {
				from: l.match?.localHourRange?.from ?? 0,
				to: l.match?.localHourRange?.to ?? 24,
			},
		},
		patch: {
			openingSpeakable: l.patch?.openingSpeakable ?? "",
			openingPrivate: l.patch?.openingPrivate ?? "",
			emotion: l.patch?.emotion ?? "",
			toneHint: l.patch?.toneHint ?? "",
			appendSpeakable: l.patch?.appendSpeakable ?? "",
			appendPrivate: l.patch?.appendPrivate ?? "",
		},
	};
}

/** mapScenesFromCard：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function mapScenesFromCard(raw: unknown): PromptSceneLayerForm[] {
	if (!Array.isArray(raw)) return emptyScenes();
	return raw.map(mapOneSceneFromCard);
}

/** scenesToDisk：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function scenesToDisk(scenes: PromptSceneLayerForm[]) {
	return scenes.map(function (scene, index) {
		return {
			layerId: scene.layerId.trim() || createStudioId("scene"),
			priority: index * 10,
			match: {
				callDirection: scene.match.callDirection,
				localHourRange: {
					from: scene.match.localHourRange.from,
					to: scene.match.localHourRange.to,
				},
			},
			patch: {
				openingSpeakable: scene.patch.openingSpeakable.trim(),
				openingPrivate: scene.patch.openingPrivate.trim(),
				emotion: scene.patch.emotion.trim(),
				toneHint: scene.patch.toneHint.trim(),
				appendSpeakable: scene.patch.appendSpeakable.trim(),
				appendPrivate: scene.patch.appendPrivate.trim(),
			},
		};
	});
}
