/**
	* 故事包校验响应契约（PUT 闸门 / GET 只读 validate / 失败 details）。
	*/
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/**
	* PUT 成功体：写盘并通过 validate 后的回读与报告。
	* 会话态以 bundle 为准；validation 仅供 UI 展示 warning，非持久化字段。
	*/
export type PutStoryPackageResult = {
	/** 写后整包（conf+cards+layout）；与 GET 同形，供会话替换 */
	bundle: DiskStoryPackageBundle;
	/** 本次落盘后的引擎 ValidationReport；errors 必为空，warnings 可非空 */
	validation: ValidationReport;
};

/**
	* GET /api/stories/:id/validate 成功体：只读磁盘校验；不写盘、不 Host。
	*/
export type DiskPackageValidateResult = {
	/** 当前磁盘包的引擎 ValidationReport；errors/warnings 均可非空 */
	validation: ValidationReport;
};

/**
	* PACKAGE_VALIDATION_FAILED 的 details：磁盘已回滚，报告供定位 UI。
	*/
export type PackageValidationFailDetails = {
	/** 写盘瞬间的校验报告；含 errors[]，path 可解析 card/exit */
	report: ValidationReport;
};

/**
	* 窄化 API details 是否为校验失败载荷；非该形状时调用方勿读 report。
	*/
export function isPackageValidationFailDetails(
	details: unknown,
): details is PackageValidationFailDetails {
	if (!details || typeof details !== "object") return false;
	const report = (details as { report?: unknown }).report;
	if (!report || typeof report !== "object") return false;
	const r = report as { errors?: unknown; warnings?: unknown };
	return Array.isArray(r.errors) && Array.isArray(r.warnings);
}
