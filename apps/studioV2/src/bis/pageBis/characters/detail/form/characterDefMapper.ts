/**
	* CharacterDef（引擎落盘）↔ CharacterSummary（Studio 投影）双向映射。
	* 保存时合并既有 JSON，避免冲掉 social / freeCardId 等本轮不编辑字段。
	* 禁止写入 timeBuckets；记忆不进角色 JSON。
	*/
import type { CharacterDef } from "@airpc/rpg-engine";
import type {
	PromptSceneLayerForm,
	PromptVariantForm,
} from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type {
	CharacterGender,
	CharacterKind,
	CharacterSummary,
	FreeCallReadiness,
} from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { PERSONALITY_CODE_OPTIONS } from "@studio-v2/typeFiles/library/characters/persona/personalityCodeOptions";
import { REALTIME_VOICE_OPTIONS } from "@studio-v2/typeFiles/library/characters/realtime/realtimeVoiceOptions";
import type { CharacterDetailFormValues } from "./characterDetailFormValues";

function asString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v : fallback;
}

function asNumberOrNull(v: unknown): number | null {
	return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapGender(raw: unknown): CharacterGender {
	if (raw === "male" || raw === "female" || raw === "non_binary") {
		return raw;
	}
	if (raw === "other") return "non_binary";
	return "unspecified";
}

function mapEditGenderToDef(
	gender: CharacterDetailFormValues["identity"]["gender"],
): string {
	if (gender === "male") return "male";
	if (gender === "female") return "female";
	return "non_binary";
}

function mapVariants(
	raw: unknown,
	fallbackPrefix: string,
): PromptVariantForm[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [{ variantId: `${fallbackPrefix}_1`, text: "" }];
	}
	return raw.map(function (item, index) {
		const row = item as { variantId?: unknown; text?: unknown };
		return {
			variantId: asString(row.variantId, `${fallbackPrefix}_${index + 1}`),
			text: asString(row.text),
		};
	});
}

function mapScenes(raw: unknown): PromptSceneLayerForm[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [
			{
				layerId: "scene_1",
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
			},
		];
	}
	return raw.map(function (item, index) {
		const layer = item as {
			layerId?: unknown;
			priority?: unknown;
			match?: {
				callDirection?: unknown;
				localHourRange?: { from?: unknown; to?: unknown };
			};
			patch?: Record<string, unknown>;
		};
		const dir = layer.match?.callDirection;
		const callDirection =
			dir === "inbound" || dir === "outbound" || dir === "either"
				? dir
				: "either";
		const from = asNumberOrNull(layer.match?.localHourRange?.from) ?? 0;
		const to = asNumberOrNull(layer.match?.localHourRange?.to) ?? 24;
		const patch = layer.patch ?? {};
		return {
			layerId: asString(layer.layerId, `scene_${index + 1}`),
			priority:
				typeof layer.priority === "number" ? layer.priority : index * 10,
			match: {
				callDirection,
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
	});
}

function inferKind(def: CharacterDef): CharacterKind {
	const tags = def.meta?.tags;
	if (Array.isArray(tags) && tags.includes("schedule")) return "schedule";
	if (def.isNarrativeOnly === true) return "support";
	return "story";
}

function inferFreeCall(def: CharacterDef): FreeCallReadiness {
	return typeof def.freeCardId === "string" && def.freeCardId.length > 0
		? "ready"
		: "missing";
}

function socialSummaryOf(def: CharacterDef): string {
	const social = def.social;
	if (!Array.isArray(social) || social.length === 0) return "";
	return social
		.map(function (edge) {
			const target = asString(
				(edge as { targetAgentId?: unknown }).targetAgentId,
				"?",
			);
			return `可关联 ${target}`;
		})
		.join("；");
}

/**
	* 将磁盘 CharacterDef 投影为角色库 CharacterSummary。
	* 列表标签（kind/bio/引用）给安全默认，不伪造「已引用」事实。
	*/
export function characterDefToSummary(def: CharacterDef): CharacterSummary {
	const identity = def.identity ?? {};
	const persona = def.persona ?? {};
	const meta = (def.meta ?? {}) as Record<string, unknown>;
	const phoneNumber = asString(meta.phoneNumber);
	const avatarAssetId = asString(meta.avatarAssetId);
	const voiceId =
		asString(persona.voiceId) ||
		REALTIME_VOICE_OPTIONS[0]?.value ||
		"";

	return {
		agentId: def.agentId,
		displayName: asString(def.displayName, def.agentId),
		kind: inferKind(def),
		avatarAssetId: avatarAssetId.length > 0 ? avatarAssetId : null,
		bio: "",
		packageRefCount: 0,
		freeCall: inferFreeCall(def),
		lastEditedAt: new Date().toISOString(),
		referenceLines: [],
		identity: {
			fullName: asString(identity.fullName),
			nickname: asString(identity.nickname),
			gender: mapGender(identity.gender),
			age: asNumberOrNull(identity.age),
			birthday: asString(identity.birthday),
			ageNote: asString(identity.ageNote),
			phoneNumber,
			dialable: def.dialable === true,
		},
		meta: {
			phoneNumber,
			avatarAssetId,
		},
		persona: {
			systemPrompt: asString(persona.systemPrompt),
			personalityCode: asString(persona.personalityCode),
			profession: asString(persona.profession),
			speakingStyle: asString(persona.speakingStyle),
			exampleLines: Array.isArray(persona.exampleLines)
				? persona.exampleLines.filter(function (l): l is string {
						return typeof l === "string";
					})
				: [],
			voiceId,
			voiceNotes: asString(persona.voiceNotes),
		},
		callFlowPrompts: {
			longSilence: mapVariants(def.callFlowPrompts?.longSilence, "silence"),
			longCallNudge: mapVariants(
				def.callFlowPrompts?.longCallNudge,
				"nudge",
			),
			preHangupFarewell: mapVariants(
				def.callFlowPrompts?.preHangupFarewell,
				"farewell",
			),
		},
		defaultPromptScenes: mapScenes(def.defaultPromptScenes),
		socialSummary: socialSummaryOf(def),
	};
}

/**
	* 详情 Formik 合并进既有 CharacterDef；保留 social/freeCardId/dialable 等。
	* 显式剥离 match.timeBuckets；不写入记忆。
	*/
export function mergeDetailFormIntoCharacterDef(
	previous: CharacterDef,
	values: CharacterDetailFormValues,
): CharacterDef {
	const phoneNumber = values.meta.phoneNumber.trim();
	const avatarAssetId = values.meta.avatarAssetId.trim();
	const age =
		values.identity.age === "" ? undefined : (values.identity.age as number);
	const prevMeta =
		typeof previous.meta === "object" && previous.meta !== null
			? { ...(previous.meta as Record<string, unknown>) }
			: {};

	const nextMeta: Record<string, unknown> = {
		...prevMeta,
		phoneNumber,
	};
	if (avatarAssetId.length > 0) {
		nextMeta.avatarAssetId = avatarAssetId;
	} else {
		delete nextMeta.avatarAssetId;
	}

	const scenes = values.defaultPromptScenes.map(function (scene, index) {
		const match: {
			callDirection: "inbound" | "outbound" | "either";
			localHourRange: { from: number; to: number };
		} = {
			callDirection: scene.match.callDirection,
			localHourRange: {
				from: scene.match.localHourRange.from,
				to: scene.match.localHourRange.to,
			},
		};
		return {
			layerId: scene.layerId.trim(),
			priority: index * 10,
			match,
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

	return {
		...previous,
		schemaVersion: previous.schemaVersion ?? 1,
		agentId: previous.agentId,
		displayName: values.displayName.trim(),
		identity: {
			...(previous.identity ?? {}),
			fullName: values.identity.fullName.trim(),
			nickname: values.identity.nickname.trim(),
			gender: mapEditGenderToDef(values.identity.gender),
			...(age === undefined ? {} : { age }),
			birthday: values.identity.birthday.trim(),
		},
		persona: {
			...(previous.persona ?? {}),
			systemPrompt: values.persona.systemPrompt.trim(),
			personalityCode: values.persona.personalityCode.trim(),
			speakingStyle: values.persona.speakingStyle.trim(),
			profession: values.persona.profession.trim(),
			exampleLines: values.persona.exampleLines.map(function (l) {
				return l.trim();
			}),
			voiceId: values.persona.voiceId,
			voiceNotes: values.persona.voiceNotes.trim(),
		},
		callFlowPrompts: {
			...(previous.callFlowPrompts ?? {}),
			longSilence: values.callFlowPrompts.longSilence.map(function (v) {
				return {
					variantId: v.variantId.trim(),
					text: v.text.trim(),
				};
			}),
			longCallNudge: values.callFlowPrompts.longCallNudge.map(function (v) {
				return {
					variantId: v.variantId.trim(),
					text: v.text.trim(),
				};
			}),
			preHangupFarewell: values.callFlowPrompts.preHangupFarewell.map(
				function (v) {
					return {
						variantId: v.variantId.trim(),
						text: v.text.trim(),
					};
				},
			),
		},
		defaultPromptScenes: scenes,
		meta: nextMeta,
	};
}

/**
	* 新建角色最小 CharacterDef（对齐空档；无 timeBuckets）。
	*/
export function buildCreateCharacterDef(input: {
	agentId: string;
	displayName: string;
	kind: CharacterKind;
	bio: string;
}): CharacterDef {
	const displayName = input.displayName.trim();
	return {
		schemaVersion: 1,
		agentId: input.agentId,
		displayName,
		dialable: false,
		isNarrativeOnly: input.kind === "support",
		identity: {
			fullName: displayName,
			nickname: displayName,
			gender: "non_binary",
		},
		persona: {
			systemPrompt: "",
			personalityCode: PERSONALITY_CODE_OPTIONS[0]?.value ?? "",
			speakingStyle: "",
			exampleLines: [],
			profession: "",
			voiceId: REALTIME_VOICE_OPTIONS[0]?.value ?? "",
			voiceNotes: "",
		},
		callFlowPrompts: {
			longSilence: [{ variantId: "silence_1", text: "" }],
			longCallNudge: [{ variantId: "nudge_1", text: "" }],
			preHangupFarewell: [{ variantId: "farewell_1", text: "" }],
		},
		defaultPromptScenes: [
			{
				layerId: "scene_1",
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
			},
		],
		social: [],
		meta: {
			...(input.kind === "schedule" ? { tags: ["schedule"] } : {}),
			...(input.bio.trim() ? { studioBio: input.bio.trim() } : {}),
		},
	};
}

/**
	* 拒载守卫：若 raw match 含 timeBuckets 则返回错误文案。
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
