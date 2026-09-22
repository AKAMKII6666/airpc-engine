/**
	* voicemail 卡种选中时锁定入口/交互/工具策略表单值。
	* 与引擎校验（mailbox_open + playback_only + deny_all）对齐。
	*/
import { useEffect } from "react";
import type { FormikProps } from "formik";
import type { NodePropertyFormValues } from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";

/** cardKind=voicemail 时即时写死锁定字段，避免 disable 态残留旧值 */
export function useVoicemailModeLock(
	formik: FormikProps<NodePropertyFormValues>,
): void {
	const isVoicemail = formik.values.cardKind === "voicemail";
	const setFieldValue = formik.setFieldValue;
	useEffect(() => {
		if (!isVoicemail) return;
		void setFieldValue("entryMode", "mailbox_open");
		void setFieldValue("interactionMode", "playback_only");
		void setFieldValue("toolPolicy.mode", "deny_all");
	}, [isVoicemail, setFieldValue]);
}
