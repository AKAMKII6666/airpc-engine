/**
	* 最小宿主任务定时：plugins 经能力 API register；到期调 onTick handlers。
	* 存储键与 tick handler 均为 pluginId:taskId。
	*/
import type { PluginTaskDescriptor } from "@airpc/pack-sdk";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";

export type PluginTaskTickHandler = (input: {
	taskId: string;
	nowIso: string;
	pluginId: string;
	payload?: Record<string, unknown>;
}) => void | Promise<void>;

type StoredTask = PluginTaskDescriptor & {
	pluginId: string;
	/** 绝对触发时间 ms */
	nextFireAtMs: number;
};

const tasks = new Map<string, StoredTask>();
const tickHandlers = new Map<string, PluginTaskTickHandler>();
/** 插件级回退：tasks.onTick 声明 taskId 与运行时 register 的 taskId 可能不同 */
const tickFallbacks = new Map<string, PluginTaskTickHandler>();
let clockMs: () => number = function () {
	return Date.now();
};
let timer: ReturnType<typeof setInterval> | null = null;

function storageKey(pluginId: string, taskId: string): string {
	return `${pluginId}:${taskId}`;
}

export function setPluginTaskClockForTests(fn: (() => number) | null): void {
	clockMs =
		fn ??
		function () {
			return Date.now();
		};
}

export function registerPluginTickHandler(
	pluginId: string,
	taskId: string,
	handler: PluginTaskTickHandler,
): void {
	tickHandlers.set(storageKey(pluginId, taskId), handler);
	tickFallbacks.set(pluginId, handler);
}

export function unregisterPluginTickHandlersForPlugin(pluginId: string): void {
	const prefix = `${pluginId}:`;
	for (const key of [...tickHandlers.keys()]) {
		if (key.startsWith(prefix)) tickHandlers.delete(key);
	}
	tickFallbacks.delete(pluginId);
}

/** @deprecated 兼容旧名：清该插件全部 tick handler */
export function unregisterPluginTickHandler(pluginId: string): void {
	unregisterPluginTickHandlersForPlugin(pluginId);
}

export function clearPluginTasksForPlugin(pluginId: string): void {
	const prefix = `${pluginId}:`;
	for (const key of [...tasks.keys()]) {
		if (key.startsWith(prefix)) tasks.delete(key);
	}
	unregisterPluginTickHandlersForPlugin(pluginId);
}

export function clearPluginTasksForTests(): void {
	tasks.clear();
	tickHandlers.clear();
	tickFallbacks.clear();
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}

function ensureTimer(): void {
	if (timer) return;
	timer = setInterval(function () {
		void drainDuePluginTasks().catch(function (err) {
			const reason = err instanceof Error ? err.message : String(err);
			emitPluginLog({
				type: "plugin.load_failed",
				reason: `task_drain_error:${reason}`,
			});
		});
	}, 1000);
	if (typeof timer.unref === "function") {
		timer.unref();
	}
}

export async function registerPluginTask(
	pluginId: string,
	task: PluginTaskDescriptor,
): Promise<PluginTaskDescriptor> {
	const now = clockMs();
	const nextFireAtMs =
		typeof task.fireAtMs === "number" && Number.isFinite(task.fireAtMs)
			? task.fireAtMs
			: now + (task.intervalMs ?? 60_000);
	const stored: StoredTask = {
		...task,
		pluginId,
		nextFireAtMs,
	};
	tasks.set(storageKey(pluginId, task.taskId), stored);
	emitPluginLog({
		type: "plugin.task_register",
		pluginId,
		taskId: task.taskId,
	});
	ensureTimer();
	return task;
}

export async function cancelPluginTask(
	pluginId: string,
	taskId: string,
): Promise<void> {
	const key = storageKey(pluginId, taskId);
	const existing = tasks.get(key);
	if (!existing) {
		throw new Error("task_not_found_or_forbidden");
	}
	tasks.delete(key);
}

export async function listPluginTasks(filter: {
	pluginId: string;
}): Promise<PluginTaskDescriptor[]> {
	const out: PluginTaskDescriptor[] = [];
	for (const t of tasks.values()) {
		if (t.pluginId !== filter.pluginId) continue;
		out.push({
			taskId: t.taskId,
			fireAtMs: t.nextFireAtMs,
			intervalMs: t.intervalMs,
			payload: t.payload,
		});
	}
	return out;
}

export async function getPluginTask(
	pluginId: string,
	taskId: string,
): Promise<PluginTaskDescriptor | null> {
	const t = tasks.get(storageKey(pluginId, taskId));
	if (!t) return null;
	return {
		taskId: t.taskId,
		fireAtMs: t.nextFireAtMs,
		intervalMs: t.intervalMs,
		payload: t.payload,
	};
}

/**
	* 推进到期任务；测试可直接调用。
	*/
export async function drainDuePluginTasks(): Promise<number> {
	const now = clockMs();
	const nowIso = new Date(now).toISOString();
	let fired = 0;
	for (const [key, t] of [...tasks.entries()]) {
		if (t.nextFireAtMs > now) continue;
		const handler =
			tickHandlers.get(storageKey(t.pluginId, t.taskId)) ??
			tickFallbacks.get(t.pluginId);
		emitPluginLog({
			type: "plugin.task_tick",
			pluginId: t.pluginId,
			taskId: t.taskId,
		});
		if (handler) {
			try {
				await handler({
					taskId: t.taskId,
					nowIso,
					pluginId: t.pluginId,
					payload: t.payload,
				});
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				emitPluginLog({
					type: "plugin.load_failed",
					pluginId: t.pluginId,
					reason: `task_tick_error:${reason}`,
					entry: t.taskId,
				});
				continue;
			}
		}
		fired += 1;
		if (typeof t.intervalMs === "number" && t.intervalMs > 0) {
			t.nextFireAtMs = now + t.intervalMs;
			tasks.set(key, t);
		} else {
			tasks.delete(key);
		}
	}
	return fired;
}
