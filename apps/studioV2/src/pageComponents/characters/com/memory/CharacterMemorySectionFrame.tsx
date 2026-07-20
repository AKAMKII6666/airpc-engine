/**
	* 记忆只读区统一区块外壳：标题 + 内容槽。
	*/
"use client";

import type { FC, ReactNode } from "react";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type CharacterMemorySectionFrameProps = {
	/** 区块正文 */
	children: ReactNode;
};

export const CharacterMemorySectionFrame: FC<
	CharacterMemorySectionFrameProps
> = function CharacterMemorySectionFrame({
	// children 是各态正文槽，用于填充标题下内容
	children,
}) {
	return (
		<div className={styles.section}>
			<h3 className={styles.sectionTitle}>记忆（只读）</h3>
			{children}
		</div>
	);
};
