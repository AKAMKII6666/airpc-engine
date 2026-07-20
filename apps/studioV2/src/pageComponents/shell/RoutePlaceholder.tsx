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

export function RoutePlaceholder(props: RoutePlaceholderProps) {
  const { title, description } = props;
  return (
    <section className={styles.root} aria-label={title}>
      <Typography variant="h5" component="h1" className={styles.title}>
        {title}
      </Typography>
      <Typography variant="body2" className={styles.description}>
        {description}
      </Typography>
      <Typography variant="caption" className={styles.badge}>
        静态占位 · 无 Host 写口
      </Typography>
    </section>
  );
}
