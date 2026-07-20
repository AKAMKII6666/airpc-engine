/**
 * 新建故事包编排（静态阶段）：Formik 校验后写入会话 mock。
 * 禁止 Host 写口与「已保存到磁盘」文案。
 */
import { appendMockPackage } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import {
  buildMockPackageFromForm,
  type CreatePackageFormValues,
} from "./createPackageForm";

/** 新建故事包 mock 提交结果；仅返回路由用 packageId，无磁盘路径 */
export type CreatePackageResult = {
  /** 新建后的路由用 packageId */
  packageId: string;
};

/**
 * 将会话内 mock 列表前置一条新包，供列表分页与返回工作台可见。
 * @returns packageId，调用方决定跳编辑器或仅关弹层
 */
export function commitCreatePackageMock(
  values: CreatePackageFormValues,
): CreatePackageResult {
  const summary = buildMockPackageFromForm(values);
  appendMockPackage(summary);
  return { packageId: summary.packageId };
}
