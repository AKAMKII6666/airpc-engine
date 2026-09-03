/**
	* 记忆态度列表区块。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { MemoryAttitudeListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type CharacterMemoryAttitudeSectionProps = {
	/** 最近态度记忆条目 */
	attitudes: MemoryAttitudeListItemDto[];
};

export const CharacterMemoryAttitudeSection: FC<
	CharacterMemoryAttitudeSectionProps
> = function CharacterMemoryAttitudeSection({
	// attitudes 是最近态度记忆，用于态度记忆区展示
	attitudes,
}) {
	return (
		<section className={styles.attitudeSection}>
			<h4 className={styles.sectionTitle}>态度记忆</h4>
			{attitudes.length === 0 ? (
				// 引用了Typography组件，用于无态度记忆空态
				<Typography variant="body2" color="text.secondary">
					暂无态度记忆。
				</Typography>
			) : (
				<ul className={styles.attitudeList}>
					{attitudes.map((attitude) => (
						<li key={attitude.id} className={styles.attitudeItem}>
							<div className={styles.attitudeItemHead}>
								<strong>{attitude.stance}</strong>
								<small>{attitude.at}</small>
							</div>
							<p className={styles.attitudeSummary}>{attitude.summary}</p>
							<p className={styles.attitudeEvidence}>
								依据：{attitude.evidence}
							</p>
							<div className={styles.attitudeKeywords}>
								{attitude.feel.map((tag) => (
									<span key={`feel_${tag}`}>{tag}</span>
								))}
							</div>
							<p className={styles.attitudeKeywordLabel}>可溯源关键词</p>
							<div className={styles.attitudeKeywords}>
								{attitude.keywords.map((keyword) => (
									<span key={`keyword_${keyword}`}>{keyword}</span>
								))}
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
