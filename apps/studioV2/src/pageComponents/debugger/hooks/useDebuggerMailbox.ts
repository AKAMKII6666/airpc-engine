/**
	* 调试器信箱状态：加载 / 注入 / 模拟听完。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import {
	DEBUGGER_DEFAULT_MAILBOX_USER_ID,
	listenDebuggerMailboxSlot,
	loadDebuggerMailbox,
	seedDebuggerMailboxUnread,
} from "@studio-v2/src/bis/pageBis/debugger/mailbox_bis";
import { DEBUGGER_DEFAULT_PACKAGE_ID } from "@studio-v2/src/bis/pageBis/debugger/validateDiskPackage_bis";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailboxView";

export function useDebuggerMailbox() {
	const [userId, setUserId] = useState(DEBUGGER_DEFAULT_MAILBOX_USER_ID);
	const [mailbox, setMailbox] = useState<DebuggerMailboxSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastListenSummary, setLastListenSummary] = useState<string | null>(
		null,
	);

	const refresh = useCallback(async function refreshMailbox() {
		if (!userId) return;
		setLoading(true);
		setError(null);
		try {
			const snap = await loadDebuggerMailbox(userId);
			setMailbox(snap);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(
		function loadOnUserChange() {
			void refresh();
		},
		[refresh],
	);

	const onSeed = useCallback(
		async function seedUnread() {
			if (!userId) return;
			setBusy(true);
			setError(null);
			setLastListenSummary(null);
			try {
				const snap = await seedDebuggerMailboxUnread(
					userId,
					DEBUGGER_DEFAULT_PACKAGE_ID,
				);
				setMailbox(snap);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setBusy(false);
			}
		},
		[userId],
	);

	const onListen = useCallback(
		async function listenSlot(slot: DebuggerVoicemailSlotView) {
			if (!userId) return;
			setBusy(true);
			setError(null);
			try {
				const result = await listenDebuggerMailboxSlot({
					userId,
					voicemailId: slot.id,
					cardId: slot.cardId || undefined,
					packageId: slot.packageId || DEBUGGER_DEFAULT_PACKAGE_ID,
					agentId: slot.agentId,
				});
				setMailbox(result.mailbox);
				setLastListenSummary(
					`听完出口：${result.exitTitle || result.selectedExitId || "(无)"} · 未读=${result.mailbox.hasUnread ? "是" : "否"}`,
				);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setBusy(false);
			}
		},
		[userId],
	);

	return {
		userId,
		setUserId,
		mailbox,
		loading,
		busy,
		error,
		lastListenSummary,
		refresh,
		onSeed,
		onListen,
	};
}
