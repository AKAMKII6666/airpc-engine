/**
	* 角色定时外呼列表面板状态：列表加载 + Modal 新增/编辑 + 删除确认。
	*/
import { useState } from "react";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
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
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentMutations.bis";
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

function useScheduleIntentCommands(input: {
	userId: string;
	agentId: string;
	clockMs: number;
	editingIntent: ScheduledIntent | null;
	deleteTarget: ScheduledIntent | null;
	closeForm: () => void;
	setDeleteTarget: (intent: ScheduledIntent | null) => void;
	reload: () => Promise<void>;
}) {
	async function submitForm(
		values: ScheduleIntentFormValues,
	): Promise<void> {
		if (!input.userId) {
			throw new Error("请先选择玩家");
		}
		await saveScheduleIntentFromForm({
			userId: input.userId,
			agentId: input.agentId,
			clockMs: input.clockMs,
			values,
			previous: input.editingIntent,
		});
		input.closeForm();
		await input.reload();
	}

	async function confirmDelete(): Promise<void> {
		if (!input.userId || !input.deleteTarget) return;
		await removeScheduleIntent(
			input.userId,
			input.agentId,
			input.deleteTarget.intentId,
		);
		input.setDeleteTarget(null);
		await input.reload();
	}

	async function togglePause(intent: ScheduledIntent): Promise<void> {
		if (!input.userId) return;
		await toggleRecurringPause(input.userId, input.agentId, intent);
		await input.reload();
	}

	return { submitForm, confirmDelete, togglePause };
}

function beginScheduleCreate(
	setFormMode: (mode: "add" | "edit") => void,
	setEditingIntent: (intent: ScheduledIntent | null) => void,
	setFormInitial: (values: ScheduleIntentFormValues) => void,
	setFormOpen: (open: boolean) => void,
): void {
	setFormMode("add");
	setEditingIntent(null);
	setFormInitial({ ...SCHEDULE_INTENT_INITIAL_VALUES });
	setFormOpen(true);
}

function beginScheduleEdit(
	intent: ScheduledIntent,
	clockMs: number,
	setFormMode: (mode: "add" | "edit") => void,
	setEditingIntent: (intent: ScheduledIntent | null) => void,
	setFormInitial: (values: ScheduleIntentFormValues) => void,
	setFormOpen: (open: boolean) => void,
): void {
	setFormMode("edit");
	setEditingIntent(intent);
	setFormInitial(intentToFormValues(intent, clockMs));
	setFormOpen(true);
}

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

	function closeForm(): void {
		setFormOpen(false);
		setEditingIntent(null);
	}

	function openCreate(): void {
		beginScheduleCreate(setFormMode, setEditingIntent, setFormInitial, setFormOpen);
	}

	function openEdit(intent: ScheduledIntent): void {
		beginScheduleEdit(intent, list.clockMs, setFormMode, setEditingIntent, setFormInitial, setFormOpen);
	}

	const commands = useScheduleIntentCommands({
		userId: usersState.userId,
		agentId,
		clockMs: list.clockMs,
		editingIntent,
		deleteTarget,
		closeForm,
		setDeleteTarget,
		reload: list.reload,
	});

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
		submitForm: commands.submitForm,
		deleteTarget,
		requestDelete: setDeleteTarget,
		closeDelete: () => setDeleteTarget(null),
		confirmDelete: commands.confirmDelete,
		togglePause: commands.togglePause,
	};
}
