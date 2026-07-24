/**
	* 内容包列表顶栏动作：导出下载 + 覆盖导入确认。
	* UI 瞬时态与编排在本 hook；禁直引 ajaxProxy。
	*/
"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { downloadContentPackExport } from "@studio-v2/src/bis/pageBis/packages/contentPack/downloadContentPack_bis";
import { importContentPackFromText } from "@studio-v2/src/bis/pageBis/packages/contentPack/importContentPack_bis";

export type ContentPackActionsState = {
	exportBusy: boolean;
	importBusy: boolean;
	confirmOpen: boolean;
	pendingLabel: string;
	error: string | undefined;
	doneMsg: string | undefined;
	fileRef: RefObject<HTMLInputElement | null>;
	onExport: () => void;
	onPickClick: () => void;
	onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onConfirmImport: () => void;
	onCancelConfirm: () => void;
};

/**
	* 内容包导入导出交互态；成功导入后回调 onImported。
	*/
export function useContentPackActions(input: {
	onImported: (startupPackageId: string) => void;
}): ContentPackActionsState {
	const { onImported } = input;
	const fileRef = useRef<HTMLInputElement | null>(null);
	const [exportBusy, setExportBusy] = useState(false);
	const [importBusy, setImportBusy] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [pendingText, setPendingText] = useState<string | undefined>(
		undefined,
	);
	const [pendingLabel, setPendingLabel] = useState("");
	const [error, setError] = useState<string | undefined>(undefined);
	const [doneMsg, setDoneMsg] = useState<string | undefined>(undefined);

	function onExport(): void {
		setError(undefined);
		setDoneMsg(undefined);
		setExportBusy(true);
		void (async function () {
			try {
				const { fileName } = await downloadContentPackExport();
				setDoneMsg(`已下载 ${fileName}`);
			} catch (err) {
				setError(err instanceof Error ? err.message : "导出内容包失败");
			} finally {
				setExportBusy(false);
			}
		})();
	}

	function onPickClick(): void {
		setError(undefined);
		setDoneMsg(undefined);
		fileRef.current?.click();
	}

	function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		void (async function () {
			try {
				const text = await file.text();
				setPendingText(text);
				setPendingLabel(file.name);
				setConfirmOpen(true);
			} catch (err) {
				setError(err instanceof Error ? err.message : "读取文件失败");
			}
		})();
	}

	function onCancelConfirm(): void {
		if (importBusy) return;
		setConfirmOpen(false);
		setPendingText(undefined);
	}

	function onConfirmImport(): void {
		if (pendingText === undefined) return;
		setImportBusy(true);
		setError(undefined);
		void (async function () {
			try {
				const result = await importContentPackFromText(pendingText);
				setConfirmOpen(false);
				setPendingText(undefined);
				setDoneMsg(
					`已覆盖导入 ${result.packageIds.length} 个故事包；首故事 ${result.startupPackageId}`,
				);
				onImported(result.startupPackageId);
			} catch (err) {
				setError(err instanceof Error ? err.message : "导入内容包失败");
			} finally {
				setImportBusy(false);
			}
		})();
	}

	return {
		exportBusy,
		importBusy,
		confirmOpen,
		pendingLabel,
		error,
		doneMsg,
		fileRef,
		onExport,
		onPickClick,
		onFileChange,
		onConfirmImport,
		onCancelConfirm,
	};
}
