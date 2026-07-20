/**
 * /packages/create 薄入口：只装配 Formik 试点页；主流程在列表 FormModal。
 */
import { CreatePackageView } from "@studio-v2/src/pageComponents/packages/create/CreatePackageView";

export default function PackageCreatePage() {
  return <CreatePackageView />;
}
