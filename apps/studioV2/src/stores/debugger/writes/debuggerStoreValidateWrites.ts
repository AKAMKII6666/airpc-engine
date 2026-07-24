/**
	* debugger 读盘 validate 切片结果型 write。
	*/
import type { StoreApi } from "zustand";
import type {
	DebuggerValidatePackagesLoadResult,
	DebuggerValidateRunResult,
} from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import {
	VALIDATE_DEFAULT_PACKAGE_ID,
	type DebuggerStoreState,
} from "@studio-v2/src/stores/debugger/model/debuggerStoreModel";

type DebuggerSet = StoreApi<DebuggerStoreState>["setState"];

/** 包列表灌账、选中、单次校验 */
export function createDebuggerValidateActions(
	set: DebuggerSet,
): Pick<
	DebuggerStoreState,
	| "applyValidatePackagesLoadStarted"
	| "applyValidatePackagesLoadResult"
	| "setValidatePackageId"
	| "applyValidateRunStarted"
	| "applyValidateRunResult"
> {
	return {
		applyValidatePackagesLoadStarted() {
			set({
				validateListLoading: true,
				validateListError: undefined,
			});
		},

		applyValidatePackagesLoadResult(
			result: DebuggerValidatePackagesLoadResult,
		) {
			if (!result.ok) {
				set({
					validateListLoading: false,
					validateListError: result.message,
					validatePackages: [],
				});
				return;
			}
			set(function (prev) {
				const list = [...result.packages];
				const keep =
					prev.validatePackageId !== "" &&
					list.some(function (p) {
						return p.packageId === prev.validatePackageId;
					});
				const preferred = list.find(function (p) {
					return p.packageId === VALIDATE_DEFAULT_PACKAGE_ID;
				});
				return {
					validateListLoading: false,
					validateListError: undefined,
					validatePackages: list,
					validatePackageId: keep
						? prev.validatePackageId
						: (preferred?.packageId ??
							list[0]?.packageId ??
							prev.validatePackageId),
				};
			});
		},

		setValidatePackageId(packageId) {
			set({
				validatePackageId: packageId,
				validateReport: null,
				validateError: undefined,
			});
		},

		applyValidateRunStarted() {
			set({
				validating: true,
				validateError: undefined,
			});
		},

		applyValidateRunResult(result: DebuggerValidateRunResult) {
			if (!result.ok) {
				set({
					validating: false,
					validateError: result.message,
					validateReport: null,
				});
				return;
			}
			set({
				validating: false,
				validateError: undefined,
				validateReport: result.report,
			});
		},
	};
}
