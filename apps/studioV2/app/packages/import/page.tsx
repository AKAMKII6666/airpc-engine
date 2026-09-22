/**
	* /packages/import 薄入口：只装配提示页；主流程在列表 ImportPackageModal。
	*/
import { ImportPackageView } from "@studio-v2/src/pageComponents/packages/import/ImportPackageView";

export default function PackageImportPage() {
	// 引用了ImportPackageView组件，用于页面展示与交互
	return <ImportPackageView />;
}
