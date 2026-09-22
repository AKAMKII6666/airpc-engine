/**
	* 主导航项真源：中文标签对用户可见，href 仅作路由键，不在 UI 展示。
	* 与 03 导向稿模块对齐；创建/导入/导出走故事包子路由，不进侧栏一级。
	*/
export type StudioNavItem = {
	/** 路由 path；系统内部键，界面不展示 */
	href: string;
	/** 中文导航文案 */
	label: string;
	/** 用于选中态：path 前缀匹配（首页仅精确匹配） */
	match: "exact" | "prefix";
};

export const STUDIO_NAV_ITEMS: readonly StudioNavItem[] = [
	{ href: "/", label: "首页", match: "exact" },
	{ href: "/packages", label: "故事包", match: "prefix" },
	{ href: "/characters", label: "角色库", match: "prefix" },
	{ href: "/assets", label: "资源库", match: "prefix" },
	{ href: "/users", label: "玩家配置", match: "prefix" },
	{ href: "/debugger", label: "调试器", match: "prefix" },
	{ href: "/settings", label: "设置", match: "prefix" },
] as const;

/** 判断 pathname 是否对应某导航项的选中态。 */
export function isNavItemActive(pathname: string, item: StudioNavItem): boolean {
	if (item.match === "exact") {
		return pathname === item.href;
	}
	if (item.href === "/") {
		return pathname === "/";
	}
	return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
