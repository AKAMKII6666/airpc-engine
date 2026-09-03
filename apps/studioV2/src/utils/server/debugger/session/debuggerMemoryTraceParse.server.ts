/**
	* Memory Trace DTO 字段解析助手。
	*/
import { readFile } from "node:fs/promises";
import path from "node:path";
import { processOwnerScope } from "@studio-v2/src/utils/server/observability/processOwnerScope.server";
import type { DebuggerMemoryTraceBlockView } from "./debuggerCallDtos.server";

const MAX_BLOCK_CHARS = 1600;

export function safeDtoId(id: string): string {
	const safe = id.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
	return safe || "unknown";
}

export function previewBlock(title: string, value: unknown): DebuggerMemoryTraceBlockView {
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
	const safeText = text ?? "";
	return {
		title,
		text:
			safeText.length > MAX_BLOCK_CHARS
				? `${safeText.slice(0, MAX_BLOCK_CHARS - 3)}...`
				: safeText,
		charCount: safeText.length,
		truncated: safeText.length > MAX_BLOCK_CHARS,
	};
}

export function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};
}

export function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter(function (item): item is string {
				return typeof item === "string";
			})
		: [];
}

export function asCountRecord(value: unknown): Record<string, number> {
	const raw = asRecord(value);
	const out: Record<string, number> = {};
	for (const [key, item] of Object.entries(raw)) {
		if (typeof item === "number" && Number.isFinite(item)) out[key] = item;
	}
	return out;
}

export function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value;
	}
	return null;
}

export function traceFileCandidates(dataRoot: string, dtoId: string): string[] {
	const file = `${safeDtoId(dtoId)}.json`;
	return [
		path.join(dataRoot, "debug-dto", "memory-commits", file),
		path.join(
			dataRoot,
			"debug-dto",
			".fallback",
			processOwnerScope(),
			"memory-commits",
			file,
		),
	];
}

export async function readTraceDocument(
	dtoId: string,
	dataRoot: string,
): Promise<Record<string, unknown>> {
	for (const file of traceFileCandidates(dataRoot, dtoId)) {
		try {
			return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
		} catch {
			// 继续试 fallback
		}
	}
	throw Object.assign(new Error("memory trace not found"), {
		code: "NOT_FOUND",
		status: 404,
	});
}
