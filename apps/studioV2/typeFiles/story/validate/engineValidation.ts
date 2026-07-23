/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/validation/types.ts 的 ValidationReport。
	*/

/** 对齐引擎 ValidationLevel */
export type ValidationLevel = "error" | "warning";

/** 对齐引擎 ValidationIssue */
export type ValidationIssue = {
	/** 校验规则稳定键 */
	ruleId: string;
	/** 严重度；error 阻塞保存/验收，warning 可继续 */
	level: ValidationLevel;
	/** 定位路径；可解析 card/exit 等层级 */
	path: string;
	/** 人类可读说明；非持久化，仅本轮校验响应 */
	message: string;
};

/** 对齐引擎 ValidationReport */
export type ValidationReport = {
	/** 被校验包 id；与磁盘目录名对齐 */
	packageId: string;
	/** 阻塞级问题列表；非空时 hasBlockingErrors=true */
	errors: ValidationIssue[];
	/** 非阻塞告警列表；不影响 hasBlockingErrors */
	warnings: ValidationIssue[];
};

/** 与引擎 hasBlockingErrors 同构镜像 */
export function hasBlockingErrors(report: ValidationReport): boolean {
	return report.errors.length > 0;
}
