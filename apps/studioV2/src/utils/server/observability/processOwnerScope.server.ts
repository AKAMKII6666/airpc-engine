/**
	* 观测落盘 fallback 的进程 owner 分区。
	* 用 uid 优先，避免同机多用户或 root/普通用户混写时互相覆盖。
	*/
import os from "node:os";

/** 返回当前进程写 fallback 日志时使用的 owner scope。 */
export function processOwnerScope(): string {
	if (typeof process.getuid === "function") {
		return String(process.getuid());
	}
	return os.userInfo().username;
}
