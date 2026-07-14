/**
 * 模块名称：Studio 首页框架（各台导航）
 */
"use client";

import Link from "next/link";
import { Typography } from "@mui/material";
import { useStudioStoreShallow } from "@studio/store/storeContext/studioStoreContext";
import styles from "./home.module.scss";

const DESKS = [
  {
    href: "/stories",
    title: "故事",
    desc: "故事包列表 → 画布编辑器（CallCard / Exit / layout / 校验 / 导出）",
    primary: true,
  },
  {
    href: "/debugger",
    title: "调试",
    desc: "Manual 通话：Begin / 工具 / End；查看 ComposeScene 与 frozenCard",
    primary: true,
  },
  {
    href: "/characters",
    title: "角色",
    desc: "CharacterDef 列表、可拨态、Free 卡引用（内容库只读预览）",
    primary: false,
  },
  {
    href: "/users",
    title: "用户",
    desc: "UserGate：选择 / 新建 Profile 上下文；导出 SaveGame",
    primary: false,
  },
] as const;

export default function StudioHomePage() {
  const { userId, userNickname } = useStudioStoreShallow(function (s) {
    return {
      userId: s.layout.userId,
      userNickname: s.layout.userNickname,
    };
  });

  return (
    <section className={styles.page}>
      <Typography component="h1" variant="h4" className={styles.title}>
        Studio
      </Typography>
      <p className={styles.lead}>
        AI-RPG 引擎本机编辑与调试框架。从下方进入各台；顶栏也可随时切换。
      </p>
      <p className={styles.userLine}>
        当前用户：
        {userId ? (
          <strong>
            {userNickname ?? userId}（{userId}）
          </strong>
        ) : (
          <span>未选择（调试前请先选用户）</span>
        )}
      </p>

      <div className={styles.grid}>
        {DESKS.map(function (desk) {
          return (
            <Link
              key={desk.href}
              href={desk.href}
              className={
                desk.primary ? `${styles.card} ${styles.cardPrimary}` : styles.card
              }
            >
              <h2 className={styles.cardTitle}>{desk.title}</h2>
              <p className={styles.cardDesc}>{desk.desc}</p>
              <span className={styles.cardPath}>{desk.href}</span>
            </Link>
          );
        })}
      </div>

      <div className={styles.note}>
        <p className={styles.noteTitle}>后续可挂</p>
        <p className={styles.noteBody}>
          世界台、资源库等（需求 03「可选后续」）暂不建独立路由；有需要时再挂进来。
        </p>
      </div>
    </section>
  );
}
