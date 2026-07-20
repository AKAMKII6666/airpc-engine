/**
	* 角色定时外呼列表面板状态：列表加载 + Modal 新增/编辑 + 删除确认。
	*/
import { useState } from "react";
import type { ScheduledIntent } from "@airpc/rpg-engine";
import {
	SCHEDULE_INTENT_INITIAL_VALUES,
	intentToFormValues,
	type ScheduleIntentFormValues,
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentForm";
import { useCharacterMemoryUsers } from "../../memory/hooks/useCharacterMemoryUsers";
import {
	removeScheduleIntent,
	saveScheduleIntentFromForm,
	toggleRecurringPause,
} from "./scheduleIntentMutations";
import { useScheduleListLoad } from "./useScheduleListLoad";

export type UseCharacterSchedulePanelResult = {
	usersState: ReturnType<typeof useCharacterMemoryUsers>;
	intents: ScheduledIntent[];
	clockMs: number;
	loading: boolean;
	error: string | undefined;
	setError: (msg: string | undefined) => void;
	formOpen: boolean;
	formMode: "add" | "edit";
	formInitial: ScheduleIntentFormValues;
	openCreate: () => void;
	openEdit: (intent: ScheduledIntent) => void;
	closeForm: () => void;
	submitForm: (values: ScheduleIntentFormValues) => Promise<void>;
	deleteTarget: ScheduledIntent | null;
	requestDelete: (intent: ScheduledIntent) => void;
	closeDelete: () => void;
	confirmDelete: () => Promise<void>;
	togglePause: (intent: ScheduledIntent) => Promise<void>;
};

/**
	* 绑定 agentId + 所选 userId 的 schedule intents CRUD（Modal 流）。
	*/
export function useCharacterSchedulePanel(
	agentId: string,
): UseCharacterSchedulePanelResult {
	const usersState = useCharacterMemoryUsers();
	const list = useScheduleListLoad(usersState.userId, agentId);
	const [formOpen, setFormOpen] = useState(false);
	const [formMode, setFormMode] = useState<"add" | "edit">("add");
	const [formInitial, setFormInitial] = useState(
		SCHEDULE_INTENT_INITIAL_VALUES,
	);
	const [editingIntent, setEditingIntent] = useState<ScheduledIntent | null>(
		null,
	);
	const [deleteTarget, setDeleteTarget] = useState<ScheduledIntent | null>(
		null,
	);

	function openCreate(): void {
		setFormMode("add");
		setEditingIntent(null);
		setFormInitial({ ...SCHEDULE_INTENT_INITIAL_VALUES });
		setFormOpen(true);
	}

	function openEdit(intent: ScheduledIntent): void {
		setFormMode("edit");
		setEditingIntent(intent);
		setFormInitial(intentToFormValues(intent, list.clockMs));
		setFormOpen(true);
	}

	function closeForm(): void {
		setFormOpen(false);
		setEditingIntent(null);
	}

	async function submitForm(
		values: ScheduleIntentFormValues,
	): Promise<void> {
		if (!usersState.userId) {
			throw new Error("请先选择玩家");
		}
		await saveScheduleIntentFromForm({
			userId: usersState.userId,
			agentId,
			clockMs: list.clockMs,
			values,
			previous: editingIntent,
		});
		closeForm();
		await list.reload();
	}

	async function confirmDelete(): Promise<void> {
		if (!usersState.userId || !deleteTarget) return;
		await removeScheduleIntent(
			usersState.userId,
			agentId,
			deleteTarget.intentId,
		);
		setDeleteTarget(null);
		await list.reload();
	}

	async function togglePause(intent: ScheduledIntent): Promise<void> {
		if (!usersState.userId) return;
		await toggleRecurringPause(usersState.userId, agentId, intent);
		await list.reload();
	}

	return {
		usersState,
		intents: list.intents,
		clockMs: list.clockMs,
		loading: list.loading,
		error: list.error,
		setError: list.setError,
		formOpen,
		formMode,
		formInitial,
		openCreate,
		openEdit,
		closeForm,
		submitForm,
		deleteTarget,
		requestDelete: setDeleteTarget,
		closeDelete: () => setDeleteTarget(null),
		confirmDelete,
		togglePause,
	};
}
