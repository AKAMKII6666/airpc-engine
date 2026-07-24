/**
	* 调试器读盘 validate：转发 feature bis；列表/报告真源在 debugger store。
	*/
"use client";

import { useDebuggerPackageValidateBis } from "@studio-v2/src/bis/pageBis/debugger/debuggerPackageValidate.bis";

export function useDebuggerPackageValidate() {
	return useDebuggerPackageValidateBis();
}
