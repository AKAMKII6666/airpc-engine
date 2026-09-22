/**
	* 导入三步进度指示。
	*/
"use client";

import type { FC } from "react";
import type { ImportFlowStep } from "../../importFlowStep";
import styles from "../ImportPackageView.module.scss";

const STEP_CLASS = {
	active: styles.stepActive,
	idle: styles.step,
} as const;

type StepNavProps = {
	step: ImportFlowStep;
};

export const ImportStepNav: FC<StepNavProps> = function ({
	// step 当前导入向导步骤，驱动进度高亮
	step,
}) {
	return (
		<ol className={styles.steps} aria-label="导入步骤">
			<li className={step === "pick" ? STEP_CLASS.active : STEP_CLASS.idle}>
				选择文件
			</li>
			<li
				className={step === "precheck" ? STEP_CLASS.active : STEP_CLASS.idle}
			>
				预检报告
			</li>
			<li
				className={
					step === "confirm" || step === "done"
						? STEP_CLASS.active
						: STEP_CLASS.idle
				}
			>
				确认导入
			</li>
		</ol>
	);
};
