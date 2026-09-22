/**
	* CharacterDef ↔ Summary 映射用的纯工具与场景层投影。
	*/
import type {
	PromptSceneLayerForm,
	PromptVariantForm,
} from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { CharacterGender } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { CharacterDetailFormValues } from "../characterDetailFormValues";

/** asString：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function asString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v : fallback;
}

/** asNumberOrNull：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function asNumberOrNull(v: unknown): number | null {
	return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** mapGender：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function mapGender(raw: unknown): CharacterGender {
	if (raw === "male" || raw === "female" || raw === "non_binary") {
		return raw;
	}
	if (raw === "other") return "non_binary";
	return "unspecified";
}

/** mapEditGenderToDef：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function mapEditGenderToDef(
	gender: CharacterDetailFormValues["identity"]["gender"],
): string {
	if (gender === "male") return "male";
	if (gender === "female") return "female";
	return "non_binary";
}

/** mapVariants：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function mapVariants(
	raw: unknown,
	_fallbackPrefix: string,
): PromptVariantForm[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [{ variantId: createStudioId("variant"), text: "" }];
	}
	return raw.map(function (item) {
		const row = item as { variantId?: unknown; text?: unknown };
		const existing =
			typeof row.variantId === "string" && row.variantId.trim() !== ""
				? row.variantId.trim()
				: createStudioId("variant");
		return {
			variantId: existing,
			text: asString(row.text),
		};
	});
}

function emptySceneLayer(): PromptSceneLayerForm {
	return {
		layerId: createStudioId("scene"),
		priority: 0,
		match: {
			callDirection: "either",
			localHourRange: { from: 0, to: 24 },
		},
		patch: {
			openingSpeakable: "",
			openingPrivate: "",
			emotion: "",
			toneHint: "",
			appendSpeakable: "",
			appendPrivate: "",
		},
	};
}

function mapCallDirection(
	dir: unknown,
): PromptSceneLayerForm["match"]["callDirection"] {
	if (dir === "inbound" || dir === "outbound" || dir === "either") {
		return dir;
	}
	return "either";
}

function mapOneScene(item: unknown, index: number): PromptSceneLayerForm {
	const layer = item as {
		layerId?: unknown;
		priority?: unknown;
		match?: {
			callDirection?: unknown;
			localHourRange?: { from?: unknown; to?: unknown };
		};
		patch?: Record<string, unknown>;
	};
	const from = asNumberOrNull(layer.match?.localHourRange?.from) ?? 0;
	const to = asNumberOrNull(layer.match?.localHourRange?.to) ?? 24;
	const patch = layer.patch ?? {};
	const existingLayerId = asString(layer.layerId).trim();
	return {
		layerId: existingLayerId || createStudioId("scene"),
		priority:
			typeof layer.priority === "number" ? layer.priority : index * 10,
		match: {
			callDirection: mapCallDirection(layer.match?.callDirection),
			localHourRange: { from, to },
		},
		patch: {
			openingSpeakable: asString(patch.openingSpeakable),
			openingPrivate: asString(patch.openingPrivate),
			emotion: asString(patch.emotion),
			toneHint: asString(patch.toneHint),
			appendSpeakable: asString(patch.appendSpeakable),
			appendPrivate: asString(patch.appendPrivate),
		},
	};
}

/** mapScenes：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function mapScenes(raw: unknown): PromptSceneLayerForm[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [emptySceneLayer()];
	}
	return raw.map(mapOneScene);
}
