/**
	* Studio V2 DTO 快照落盘与索引维护。
	* 路径：data/debug-dto/<bucket>/<id>.json，并维护 indexes/by-trace 等索引。
	*/
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";
import { redactForLog } from "@studio-v2/src/utils/server/observability/logger/loggerRedact.server";
import { processOwnerScope } from "@studio-v2/src/utils/server/observability/processOwnerScope.server";
import type {
	DtoLogDocument,
	DtoLogIndexDocument,
	DtoLogIndexKey,
	DtoLogRef,
	WriteDtoLogInput,
} from "@studio-v2/src/utils/server/observability/dto/dtoLogTypes.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

type DtoLogOptions = {
	/** 测试可注入 dataRoot；正式路径自动解析 workspace data */
	dataRoot?: string;
	/** 测试可注入时间；正式路径使用当前时间 */
	now?: Date;
};

const MAX_INDEX_REFS = 500;

const jsonWriteQueues = new Map<string, Promise<void>>();

function enqueueJsonWrite(file: string, write: () => Promise<void>): Promise<void> {
	const previous = jsonWriteQueues.get(file) ?? Promise.resolve();
	const current = previous.then(write, write);
	const queued = current.finally(function () {
		if (jsonWriteQueues.get(file) === queued) {
			jsonWriteQueues.delete(file);
		}
	}).catch(function () {
		// 调用方仍 await current 获得真实错误；队列清理链路不可留下未处理 rejection。
	});
	jsonWriteQueues.set(file, queued);
	return current;
}

function safeFileId(id: string): string {
	const safe = id.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
	return safe || "unknown";
}

function dtoRoot(dataRoot: string): string {
	return path.join(dataRoot, "debug-dto");
}

function fallbackDtoRoot(dataRoot: string): string {
	return path.join(dataRoot, "debug-dto", ".fallback", processOwnerScope());
}

function dtoRelativePath(input: WriteDtoLogInput): string {
	return path.join(input.bucket, `${safeFileId(input.id)}.json`);
}

function dtoFilePath(root: string, input: WriteDtoLogInput): string {
	return path.join(root, dtoRelativePath(input));
}

function indexDirName(indexKey: DtoLogIndexKey): string {
	if (indexKey === "trace") return "by-trace";
	if (indexKey === "session") return "by-session";
	return "by-user";
}

function indexFilePath(
	root: string,
	indexKey: DtoLogIndexKey,
	id: string,
): string {
	return path.join(
		root,
		"indexes",
		indexDirName(indexKey),
		`${safeFileId(id)}.json`,
	);
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
	await enqueueJsonWrite(file, async function () {
		await mkdir(path.dirname(file), { recursive: true });
		const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random()
			.toString(36)
			.slice(2)}.tmp`;
		try {
			await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
			await rename(tmp, file);
		} catch (err) {
			await rm(tmp, { force: true }).catch(function () {
				// best effort cleanup
			});
			throw err;
		}
	});
}

async function readIndex(
	file: string,
	indexKey: DtoLogIndexKey,
	id: string,
): Promise<DtoLogIndexDocument> {
	try {
		const text = await readFile(file, "utf8");
		const parsed = JSON.parse(text) as DtoLogIndexDocument;
		if (parsed.schemaVersion === 1 && Array.isArray(parsed.refs)) {
			return parsed;
		}
	} catch {
		// 文件不存在或损坏时重建该索引；DTO 本体仍保留
	}
	return { schemaVersion: 1, indexKey, id, updatedAt: "", refs: [] };
}

function makeDocument(
	input: WriteDtoLogInput,
	at: string,
): DtoLogDocument {
	return {
		schemaVersion: 1,
		bucket: input.bucket,
		id: input.id,
		at,
		event: input.event,
		traceId: input.traceId,
		sessionId: input.sessionId,
		userId: input.userId,
		summary: redactForLog(input.summary) as Record<string, unknown> | undefined,
		payload: redactForLog(input.payload),
	};
}

function makeRef(input: WriteDtoLogInput, at: string): DtoLogRef {
	return {
		bucket: input.bucket,
		id: input.id,
		path: dtoRelativePath(input),
		at,
		event: input.event,
		summary: redactForLog(input.summary) as Record<string, unknown> | undefined,
	};
}

async function appendIndexRef(input: {
	/** debug-dto 根目录；可能是主根，也可能是 fallback 根 */
	root: string;
	/** 索引维度 */
	indexKey: DtoLogIndexKey;
	/** 维度值 */
	id: string;
	/** 引用 */
	ref: DtoLogRef;
	/** 更新时间 */
	at: string;
}): Promise<void> {
	const file = indexFilePath(input.root, input.indexKey, input.id);
	const doc = await readIndex(file, input.indexKey, input.id);
	const withoutDuplicate = doc.refs.filter(function (ref) {
		return !(ref.bucket === input.ref.bucket && ref.id === input.ref.id);
	});
	const refs = [...withoutDuplicate, input.ref].slice(-MAX_INDEX_REFS);
	await writeJsonAtomic(file, {
		...doc,
		updatedAt: input.at,
		refs,
	});
}

async function writeDtoLogToRoot(input: {
	/** debug-dto 根目录；可能是主根，也可能是 fallback 根 */
	root: string;
	/** DTO 写入参数 */
	log: WriteDtoLogInput;
	/** 写入时间 ISO 字符串 */
	at: string;
}): Promise<void> {
	const doc = makeDocument(input.log, input.at);
	const ref = makeRef(input.log, input.at);
	await writeJsonAtomic(dtoFilePath(input.root, input.log), doc);
	const indexes: Array<[DtoLogIndexKey, string | undefined]> = [
		["trace", input.log.traceId],
		["session", input.log.sessionId],
		["user", input.log.userId],
	];
	for (const [indexKey, id] of indexes) {
		if (!id) continue;
		await appendIndexRef({
			root: input.root,
			indexKey,
			id,
			ref,
			at: input.at,
		});
	}
}

/** 写入 DTO 快照并更新 trace/session/user 三类索引；失败只写 pino error，不阻断主流程 */
export async function writeDtoLog(
	input: WriteDtoLogInput,
	options: DtoLogOptions = {},
): Promise<void> {
	const dataRoot = options.dataRoot ?? getStudioV2DataRoot();
	const at = (options.now ?? new Date()).toISOString();
	try {
		await writeDtoLogToRoot({ root: dtoRoot(dataRoot), log: input, at });
	} catch (error) {
		try {
			await writeDtoLogToRoot({
				root: fallbackDtoRoot(dataRoot),
				log: input,
				at,
			});
			writeStudioLog("debugger", "warn", {
				event: "dto_log.write_fallback",
				traceId: input.traceId,
				sessionId: input.sessionId,
				userId: input.userId,
				message: `DTO log wrote to fallback: ${input.bucket}/${input.id}`,
				error,
			}, { dataRoot });
			return;
		} catch (fallbackError) {
			writeStudioLog("debugger", "error", {
				event: "dto_log.write_failed",
				traceId: input.traceId,
				sessionId: input.sessionId,
				userId: input.userId,
				message: `failed to write DTO log: ${input.bucket}/${input.id}`,
				payload: {
					fallbackRoot: fallbackDtoRoot(dataRoot),
				},
				error: fallbackError,
			}, { dataRoot });
			return;
		}
	}
}

/** 测试专用：暴露 DTO fallback 文件路径，生产调用不要依赖。 */
export function getDtoLogFallbackFilePathForTests(
	dataRoot: string,
	input: WriteDtoLogInput,
): string {
	return dtoFilePath(fallbackDtoRoot(dataRoot), input);
}
