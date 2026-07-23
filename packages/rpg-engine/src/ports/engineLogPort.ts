/**
 * 模块名称：EngineLogPort（技术设计 23 §4.4）
 * 模块说明：旁路 jsonl 持久化契约；WET 内存 ring 仍可在 Host，落盘只经本 Port。
 */
import type { LogRecord } from "../host/types.js";

/**
 * 引擎旁路日志。append 失败应由 Port 如实 throw；Host 主路径可 .catch 吞掉以免拖垮通话。
 */
export interface EngineLogPort {
	/**
	 * 追加一条。实现必须做隐私脱敏（剥 privateBrief / openingPrivate / systemHard 等）
	 * 后再落盘；引擎可先脱敏再传入，实现仍应防御性脱敏。
	 */
	append(input: { record: LogRecord }): Promise<void>;

	/**
	 * 读某日 jsonl 尾部切片。文件不存在：lines=[]，truncated=false，不抛。
	 * day：YYYYMMDD；缺省=今天 UTC。limit 缺省建议 80。
	 */
	readSlice(input?: {
		day?: string;
		limit?: number;
	}): Promise<{
		/** 实现侧定位提示（本机可为文件路径）；仅调试 */
		locator?: string;
		lines: LogRecord[];
		truncated: boolean;
	}>;
}
