/**
	* 导出故事包路由：只做装配，不接真实导出管线。
	*/
import { ExportPackageView } from "@studio-v2/src/pageComponents/packages/export/ExportPackageView";

export default function PackageExportPage() {
	// 引用了ExportPackageView组件，用于页面展示与交互
	return <ExportPackageView />;
}
