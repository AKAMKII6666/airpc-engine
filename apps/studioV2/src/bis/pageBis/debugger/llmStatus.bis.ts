/**
	* 调试器大模型状态 feature bis。
	* UI 只消费脱敏状态；请求经 ajaxProxy，禁止页面裸 fetch。
	*/
"use client";

import { useEffect, useState } from "react";
import { fetchDebuggerLlmStatus } from "@studio-v2/src/utils/ajaxProxy/debugger/api/llmStatusApi";
import type { DebuggerLlmPublicStatus } from "@studio-v2/typeFiles/debugger/llmStatus";

/** 调试器模型状态投影；只包含脱敏配置和请求态 */
export type DebuggerLlmStatusBis = {
	/** 脱敏后的模型配置状态；加载前为 null */
	status: DebuggerLlmPublicStatus | null;
	/** 状态请求中 */
	loading: boolean;
	/** 状态请求失败人话 */
	error: string | undefined;
};

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "读取大模型配置状态失败";
}

/**
	* 挂载时读取 server-only 模型配置状态；后续聊天发送前复用该状态提示。
	*/
export function useDebuggerLlmStatusBis(): DebuggerLlmStatusBis {
	const [status, setStatus] = useState<DebuggerLlmPublicStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>(undefined);

	useEffect(function () {
		let cancelled = false;
		setLoading(true);
		setError(undefined);
		void (async function () {
			try {
				const next = await fetchDebuggerLlmStatus();
				if (cancelled) return;
				setStatus(next);
			} catch (err) {
				if (cancelled) return;
				setError(errorMessage(err));
				setStatus(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return function () {
			cancelled = true;
		};
	}, []);

	return {
		status,
		loading,
		error,
	};
}
