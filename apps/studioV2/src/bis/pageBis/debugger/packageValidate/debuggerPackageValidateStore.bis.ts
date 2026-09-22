/**
	* 调试器读盘 validate：store 切片选择器（从 bis 抽出以降函数行数）。
	* 仅内部给 useDebuggerPackageValidateBis 用；真源仍在 debugger store。
	*/
"use client";

import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type {
	DebuggerValidatePackagesLoadResult,
	DebuggerValidateRunResult,
} from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** DebuggerPackageValidateStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type DebuggerPackageValidateStoreSlice = {
	/** DebuggerPackageValidateStoreSlice.packages：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	packages: StoryPackageSummary[];
	/** DebuggerPackageValidateStoreSlice.packageId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	packageId: string;
	/** DebuggerPackageValidateStoreSlice.listLoading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	listLoading: boolean;
	/** DebuggerPackageValidateStoreSlice.listError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	listError: string | undefined;
	/** DebuggerPackageValidateStoreSlice.validating：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	validating: boolean;
	/** DebuggerPackageValidateStoreSlice.validateError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	validateError: string | undefined;
	/** DebuggerPackageValidateStoreSlice.report：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	report: ValidationReport | null;
	/** DebuggerPackageValidateStoreSlice.applyValidatePackagesLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyValidatePackagesLoadStarted: () => void;
	/** DebuggerPackageValidateStoreSlice.applyValidatePackagesLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyValidatePackagesLoadResult: (
		result: DebuggerValidatePackagesLoadResult,
	) => void;
	/** DebuggerPackageValidateStoreSlice.setValidatePackageId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setValidatePackageId: (nextId: string) => void;
	/** DebuggerPackageValidateStoreSlice.applyValidateRunStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyValidateRunStarted: () => void;
	/** DebuggerPackageValidateStoreSlice.applyValidateRunResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyValidateRunResult: (result: DebuggerValidateRunResult) => void;
};

/**
	* 订 validate 相关 store 字段与 actions；禁止 UI 直读 store。
	*/
export function useDebuggerPackageValidateStoreSlice(): DebuggerPackageValidateStoreSlice {
	const packages = useDebuggerStore(function (s) {
		return s.validatePackages;
	});
	const packageId = useDebuggerStore(function (s) {
		return s.validatePackageId;
	});
	const listLoading = useDebuggerStore(function (s) {
		return s.validateListLoading;
	});
	const listError = useDebuggerStore(function (s) {
		return s.validateListError;
	});
	const validating = useDebuggerStore(function (s) {
		return s.validating;
	});
	const validateError = useDebuggerStore(function (s) {
		return s.validateError;
	});
	const report = useDebuggerStore(function (s) {
		return s.validateReport;
	});
	const applyValidatePackagesLoadStarted = useDebuggerStore(function (s) {
		return s.applyValidatePackagesLoadStarted;
	});
	const applyValidatePackagesLoadResult = useDebuggerStore(function (s) {
		return s.applyValidatePackagesLoadResult;
	});
	const setValidatePackageId = useDebuggerStore(function (s) {
		return s.setValidatePackageId;
	});
	const applyValidateRunStarted = useDebuggerStore(function (s) {
		return s.applyValidateRunStarted;
	});
	const applyValidateRunResult = useDebuggerStore(function (s) {
		return s.applyValidateRunResult;
	});
	return {
		packages,
		packageId,
		listLoading,
		listError,
		validating,
		validateError,
		report,
		applyValidatePackagesLoadStarted,
		applyValidatePackagesLoadResult,
		setValidatePackageId,
		applyValidateRunStarted,
		applyValidateRunResult,
	};
}
