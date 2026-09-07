/**
 * L2 可观测日志事件（执行索引「可观测日志」+ 25 §7/§14）。
 * 宿主写 EngineLog / jsonl 时 type 必须落在此联合内。
 */

export type PluginLogEventType =
	| "plugin.scan"
	| "plugin.load_ok"
	| "plugin.load_skipped"
	| "plugin.load_failed"
	| "plugin.slot_contrib"
	| "plugin.task_register"
	| "plugin.task_tick"
	| "plugin.outbound_prepare"
	| "plugin.outbound_request"
	| "plugin.api_call";

interface PluginLogEventBase {
	atMs?: number;
	pluginId?: string;
}

export type PluginLogEvent =
	| (PluginLogEventBase & {
			type: "plugin.scan";
			/** 已加载成功的 pluginId 列表 */
			pluginIds: string[];
			skippedDisabled: string[];
			apiVersion: number;
			/** 扫描到的目录数（可选诊断） */
			foundCount?: number;
			attemptedCount?: number;
	  })
	| (PluginLogEventBase & {
			type: "plugin.load_ok";
			pluginId: string;
			version?: string;
			slots?: string[];
			domains?: Array<"realtime" | "background" | "ui">;
	  })
	| (PluginLogEventBase & {
			type: "plugin.load_skipped";
			pluginId?: string;
			reason: string;
	  })
	| (PluginLogEventBase & {
			type: "plugin.load_failed";
			pluginId?: string;
			reason: string;
			slot?: string;
			entry?: string;
			errorMessage?: string;
	  })
	| (PluginLogEventBase & {
			type: "plugin.slot_contrib";
			pluginId: string;
			slot: string;
			entry: string;
			domain: "realtime" | "background" | "ui";
	  })
	| (PluginLogEventBase & {
			type: "plugin.task_register";
			pluginId: string;
			taskId: string;
	  })
	| (PluginLogEventBase & {
			type: "plugin.task_tick";
			pluginId: string;
			taskId: string;
	  })
	| (PluginLogEventBase & {
			type: "plugin.outbound_prepare";
			pluginId: string;
	  })
	| (PluginLogEventBase & {
			type: "plugin.outbound_request";
			pluginId: string;
			accepted?: boolean;
	  })
	| (PluginLogEventBase & {
			type: "plugin.api_call";
			pluginId: string;
			/** 如 users.list / memory.query */
			method: string;
			ok?: boolean;
	  });

export const PLUGIN_LOG_EVENT_TYPES = [
	"plugin.scan",
	"plugin.load_ok",
	"plugin.load_skipped",
	"plugin.load_failed",
	"plugin.slot_contrib",
	"plugin.task_register",
	"plugin.task_tick",
	"plugin.outbound_prepare",
	"plugin.outbound_request",
	"plugin.api_call",
] as const satisfies readonly PluginLogEventType[];
