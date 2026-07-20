/**
 * 模块名称：Studio 顶栏导航
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FC } from "react";
import { Button } from "@mui/material";
import { UserGate } from "@studio/uiComponents/userGate/UserGate";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import styles from "./studioNav.module.scss";

const NAV_ITEMS = [
  { href: "/", label: "首页", match: (p: string) => p === "/" },
  {
    href: "/stories",
    label: "故事",
    match: (p: string) => p.startsWith("/stories"),
  },
  {
    href: "/characters",
    label: "角色",
    match: (p: string) => p.startsWith("/characters"),
  },
  {
    href: "/world",
    label: "世界",
    match: (p: string) => p.startsWith("/world"),
  },
  {
    href: "/assets",
    label: "资源",
    match: (p: string) => p.startsWith("/assets"),
  },
  {
    href: "/users",
    label: "用户",
    match: (p: string) => p.startsWith("/users"),
  },
  {
    href: "/debugger",
    label: "调试",
    match: (p: string) => p.startsWith("/debugger"),
  },
] as const;

export const StudioNav: FC = function () {
  const pathname = usePathname() ?? "/";
  const [gateOpen, setGateOpen] = useState(false);
  const { userId, userNickname } = useStudioStoreShallow(function (s) {
    return {
      userId: s.layout.userId,
      userNickname: s.layout.userNickname,
    };
  });
  const setLayoutUserId = useStudioStore((s) => s.setLayoutUserId);

  return (
    <>
      <nav className={styles.nav} aria-label="Studio 主导航">
        {NAV_ITEMS.map(function (item) {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.active : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <Button
          size="small"
          variant="text"
          className={styles.userBtn}
          onClick={function (): void {
            setGateOpen(true);
          }}
        >
          {userId ? `用户：${userNickname ?? userId}` : "选择用户"}
        </Button>
      </nav>
      <UserGate
        open={gateOpen}
        onClose={function (): void {
          setGateOpen(false);
        }}
        onSelected={function (id): void {
          setGateOpen(false);
          if (!userNickname) {
            setLayoutUserId(id, null);
          }
        }}
      />
    </>
  );
};
