/**
 * 新建故事包表单校验与 mock 投影轻量回归。
 */
import { describe, expect, it } from "vitest";
import {
  buildMockPackageFromForm,
  validateCreatePackageForm,
  CREATE_PACKAGE_INITIAL_VALUES,
} from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";

describe("createPackageForm", () => {
  it("rejects empty title", () => {
    const errors = validateCreatePackageForm(CREATE_PACKAGE_INITIAL_VALUES);
    expect(errors.title).toBe("请填写故事包名称");
  });

  it("builds session mock with system packageId", () => {
    resetStudioIdSeq(0);
    const summary = buildMockPackageFromForm({
      title: " 试写章节 ",
      description: "描述",
      language: "zh-CN",
      withStartCard: true,
    });
    expect(summary.title).toBe("试写章节");
    expect(summary.cardCount).toBe(1);
    expect(summary.packageId.startsWith("pkg_")).toBe(true);
    expect(summary.saveState).toBe("unsaved");
  });
});
