/**
	* 故事包列表路由：只做装配。
	*/
import { PackageListView } from "@studio-v2/src/pageComponents/packages/list/PackageListView";

export default function PackagesPage() {
	// 引用了PackageListView组件，用于页面展示与交互
	return <PackageListView />;
}
