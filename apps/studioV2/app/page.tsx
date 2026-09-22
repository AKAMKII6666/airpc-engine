/**
	* 首页路由入口：只做装配，业务在 pageComponents/。
	*/
import { WorkbenchShell } from "@studio-v2/src/pageComponents/home/WorkbenchShell";

export default function HomePage() {
	// 引用了WorkbenchShell组件，用于页面展示与交互
	return <WorkbenchShell />;
}
