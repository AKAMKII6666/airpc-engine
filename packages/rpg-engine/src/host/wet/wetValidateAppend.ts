/**
 * WET 受控追加校验谓词；从 wet.validateWetAppend 抽出以降圈复杂度。
 * 不反向依赖 wet.ts，避免循环 import。
 */
import { engineError, type EngineError } from "../errors.js";

const WET_APPENDABLE_TYPES_LOCAL = [
	"wet.annotation",
	"wet.compensation",
] as const;

export interface WetAppendInputLike {
	type: string;
	userId: string;
	sessionId?: string;
	note: string;
	payload?: Record<string, unknown>;
}

function validateWetAppendType(type: string): EngineError | null {
	if ((WET_APPENDABLE_TYPES_LOCAL as readonly string[]).includes(type)) {
		return null;
	}
	return engineError(
		"VALIDATION_FAILED",
		`wet append type not allowed: ${type}; only ${WET_APPENDABLE_TYPES_LOCAL.join(", ")}`,
	);
}

function validateWetAppendUserId(userId: string): EngineError | null {
	if (userId && typeof userId === "string") return null;
	return engineError("USER_REQUIRED", "wet append requires userId");
}

function validateWetAppendNote(noteRaw: unknown): EngineError | null {
	const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
	if (!note) {
		return engineError("VALIDATION_FAILED", "wet append requires non-empty note");
	}
	if (note.length > 2000) {
		return engineError("VALIDATION_FAILED", "wet note too long (max 2000)");
	}
	return null;
}

function validateWetAppendPayload(
	payload: WetAppendInputLike["payload"],
): EngineError | null {
	if (payload == null) return null;
	if (typeof payload !== "object" || Array.isArray(payload)) {
		return engineError("VALIDATION_FAILED", "wet payload must be object");
	}
	const forbidden = ["effectLedger", "rewrite", "mutateHistory", "deleteAt"];
	for (const k of forbidden) {
		if (k in payload) {
			return engineError(
				"VALIDATION_FAILED",
				`wet payload forbids key: ${k} (append-only; no history rewrite)`,
			);
		}
	}
	return null;
}

/** 逐项校验；首个失败即返回。 */
export function validateWetAppendInput(
	input: WetAppendInputLike,
): EngineError | null {
	return (
		validateWetAppendType(input.type) ??
		validateWetAppendUserId(input.userId) ??
		validateWetAppendNote(input.note) ??
		validateWetAppendPayload(input.payload)
	);
}
