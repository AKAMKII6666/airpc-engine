/**
	* 首通预览弹层瞬时态：门禁开关 + open 时清空结果。
	*/
"use client";

import { useEffect, useState } from "react";

export function useFirstConnectPromptPreviewModalState(opts: {
	open: boolean;
	resetResult: () => void;
}): {
	gateOpen: boolean;
	openGate: () => void;
	closeGate: () => void;
} {
	const { open, resetResult } = opts;
	const [gateOpen, setGateOpen] = useState(false);

	useEffect(
		function () {
			if (open) resetResult();
		},
		[open, resetResult],
	);

	return {
		gateOpen,
		openGate() {
			setGateOpen(true);
		},
		closeGate() {
			setGateOpen(false);
		},
	};
}
