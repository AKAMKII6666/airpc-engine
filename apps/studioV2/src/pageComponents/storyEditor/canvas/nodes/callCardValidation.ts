/**
* CallCard 节点校验角标文案与样式映射。
* 与引擎校验真源无关；仅驱动静态蓝图节点展示（不进 Formik）。
*/
import type { EditorNodeValidationBadge } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
import styles from "./editorNodes.module.scss";

export function callCardValidationClass(
	validation: EditorNodeValidationBadge,
): string {
	if (validation === "ok") return styles.ok;
	if (validation === "warning") return styles.warn;
	return styles.err;
}

export function callCardValidationText(
	validation: EditorNodeValidationBadge,
): string {
	if (validation === "ok") return "已校验";
	if (validation === "warning") return "警告";
	return "错误";
}
