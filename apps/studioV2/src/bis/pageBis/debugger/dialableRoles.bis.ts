/**
	* 调试器待机角色 feature bis：读取外部入口 free card 可拨状态。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDebuggerDialableRoles } from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSessionApi";
import type { DebuggerDialableRole } from "@studio-v2/typeFiles/debugger/dialableRole";

/** UI 可消费的待机角色查询状态 */
export type DebuggerDialableRolesBis = {
	/** 待机角色投影，包含不可拨原因 */
	roles: DebuggerDialableRole[];
	/** 正在加载角色列表 */
	loading: boolean;
	/** 加载失败人话；无则 undefined */
	error: string | undefined;
	/** 手动刷新待机角色列表 */
	refresh: () => Promise<void>;
};

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "读取可拨角色失败";
}

/** 读取调试器待机角色列表，并提供刷新命令 */
export function useDebuggerDialableRolesBis(): DebuggerDialableRolesBis {
	const [roles, setRoles] = useState<DebuggerDialableRole[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();

	const refresh = useCallback(async function () {
		setLoading(true);
		setError(undefined);
		try {
			setRoles(await fetchDebuggerDialableRoles());
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(function () {
		void refresh();
	}, [refresh]);

	return { roles, loading, error, refresh };
}
