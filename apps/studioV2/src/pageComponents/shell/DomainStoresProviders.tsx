/**
	* 多域 Zustand 挂载 Provider：AppProviders 下唯一 store 装配点。
	* V2-LY-1 骨架：域 store 默认模块单例即可订阅；若某域后续要 Context 隔离（测试双实例），
	* 在本组件内按域挂 Provider，禁止把多域业务切片塞进 studioV2Store。
	*/
"use client";

import type { FC, ReactNode } from "react";

export type DomainStoresProvidersProps = {
	children: ReactNode;
};

/**
	* 当前无 Context 包装（模块单例足够）；保留组件边界便于按域插入 Provider。
	* 已落地模块单例：storyEditor、characters、users、assets、packages、debugger、workbench、settings。
	*/
export const DomainStoresProviders: FC<DomainStoresProvidersProps> = function ({
	// children 是 App 路由子树，须落在全部域 store 可订阅范围之内
	children,
}) {
	return children;
};
