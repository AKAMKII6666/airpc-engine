/**
	* 静态路由占位：只展示模块名与说明，禁止在此拼 BFF / Host 写口。
	*/
import { Typography } from "@mui/material";
import styles from "./RoutePlaceholder.module.scss";

export type RoutePlaceholderProps = {
	/** 人类可读模块标题 */
	title: string;
	/** 本步边界说明（静态壳、无业务编排） */
	description: string;
};

export function RoutePlaceholder({
		// title 是组件入参，用于渲染
		title,
		// description 是组件入参，用于渲染
		description,
	}: RoutePlaceholderProps) {
	return (
		<section className={styles.root} aria-label={title}>
			{/* 引用了Typography组件，用于页面展示与交互 */}
			<Typography variant="h5" component="h1" className={styles.title}>
				{title}
			</Typography>
			{/* 引用了Typography组件，用于页面展示与交互 */}
			<Typography variant="body2" className={styles.description}>
				{description}
			</Typography>
			{/* 引用了Typography组件，用于页面展示与交互 */}
			<Typography variant="caption" className={styles.badge}>
				静态占位 · 无 Host 写口
			</Typography>
		</section>
	);
}
