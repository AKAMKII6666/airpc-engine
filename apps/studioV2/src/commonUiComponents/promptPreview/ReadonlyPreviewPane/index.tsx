/**
	* 只读 JSON / 文本预览板：固定宽度 + 格式化；JSON 走 Monaco。
	*/
"use client";

import type { FC } from "react";
import Editor from "@monaco-editor/react";
import { Typography } from "@mui/material";
import styles from "./index.module.scss";

export type ReadonlyPreviewPaneProps = {
	/** 分区标题 */
	title: string;
	/** 纯文本；与 jsonValue 二选一优先 jsonValue */
	text?: string;
	/** 任意可 JSON 序列化对象；走 Monaco 格式化 */
	jsonValue?: unknown;
	/** Monaco 高度 px；默认 220 */
	height?: number;
};

export const ReadonlyPreviewPane: FC<ReadonlyPreviewPaneProps> = function ({
	// title 表示分区标题，用于展示
	title,
	// text 表示纯文本预览，用于 pre
	text,
	// jsonValue 表示结构化 JSON，用于 Monaco
	jsonValue,
	// height 表示 Monaco 高度 px，用于布局
	height = 220,
}) {
	const useJson = jsonValue !== undefined;
	const jsonText = useJson
		? JSON.stringify(jsonValue, null, 2)
		: (text ?? "");

	return (
		<section className={styles.pane}>
			{/* 引用了Typography组件，用于分区标题 */}
			<Typography variant="caption" className={styles.title}>
				{title}
			</Typography>
			{useJson ? (
				<div className={styles.monacoWrap} style={{ height }}>
					{/* 引用了Editor组件，用于格式化只读 JSON */}
					<Editor
						height="100%"
						defaultLanguage="json"
						value={jsonText}
						theme="vs-dark"
						options={{
							readOnly: true,
							minimap: { enabled: false },
							wordWrap: "on",
							scrollBeyondLastLine: false,
							fontSize: 12,
							tabSize: 2,
							automaticLayout: true,
						}}
					/>
				</div>
			) : (
				<pre className={styles.pre}>{jsonText || "（空）"}</pre>
			)}
		</section>
	);
};
