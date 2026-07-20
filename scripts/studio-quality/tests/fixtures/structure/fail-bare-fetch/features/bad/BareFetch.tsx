"use client";

/** 夹具：UI 组件裸 fetch，应触发 STUDIO-STRUCT-010 */
export function BareFetch() {
  void fetch("/api/probe");
  return null;
}
