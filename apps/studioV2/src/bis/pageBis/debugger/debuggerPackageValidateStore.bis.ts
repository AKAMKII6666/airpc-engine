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

type DebuggerPackageValidateStoreSlice = {
	packages: StoryPackageSummary[];
	packageId: string;
	listLoading: boolean;
	listError: string | undefined;
	validating: boolean;
	validateError: string | undefined;
	report: ValidationReport | null;
	applyValidatePackagesLoadStarted: () => void;
	applyValidatePackagesLoadResult: (
		result: DebuggerValidatePackagesLoadResult,
	) => void;
	setValidatePackageId: (nextId: string) => void;
	applyValidateRunStarted: () => void;
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
