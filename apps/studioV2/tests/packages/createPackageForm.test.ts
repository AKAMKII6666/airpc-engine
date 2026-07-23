/**
 * 新建故事包表单校验轻量回归。
 */
import { describe, expect, it } from "vitest";
import {
  validateCreatePackageForm,
  CREATE_PACKAGE_INITIAL_VALUES,
} from "@studio-v2/src/bis/pageBis/packages/createPackageForm";

describe("createPackageForm", () => {
  it("rejects empty title", () => {
    const errors = validateCreatePackageForm(CREATE_PACKAGE_INITIAL_VALUES);
    expect(errors.title).toBe("请填写故事包名称");
  });

  it("accepts non-empty title", () => {
    const errors = validateCreatePackageForm({
      ...CREATE_PACKAGE_INITIAL_VALUES,
      title: "试写章节",
    });
    expect(errors.title).toBeUndefined();
  });
});
