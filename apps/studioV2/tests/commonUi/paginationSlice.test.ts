/**
 * 前端分页切片契约：不挂载 React，只锁 page/pageSize/total 语义。
 */
import { describe, expect, it } from "vitest";
import {
  computePageCount,
  sliceForPage,
} from "@studio-v2/src/commonUiComponents/pagination/sliceForPage";

describe("computePageCount", () => {
  it("returns 1 for empty list so UI can stay on page 1", () => {
    expect(computePageCount(0, 10)).toBe(1);
  });

  it("ceils by pageSize", () => {
    expect(computePageCount(25, 10)).toBe(3);
    expect(computePageCount(10, 10)).toBe(1);
  });

  it("returns 0 when pageSize is invalid", () => {
    expect(computePageCount(10, 0)).toBe(0);
  });
});

describe("sliceForPage", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("slices 1-based pages", () => {
    expect(sliceForPage(items, 1, 2)).toEqual(["a", "b"]);
    expect(sliceForPage(items, 2, 2)).toEqual(["c", "d"]);
    expect(sliceForPage(items, 3, 2)).toEqual(["e"]);
  });

  it("treats page < 1 as page 1", () => {
    expect(sliceForPage(items, 0, 2)).toEqual(["a", "b"]);
  });
});
