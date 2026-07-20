/**
 * 新建 / 详情资源表单校验与 mock 投影轻量回归；含删改会话一致性。
 */
import { describe, expect, it } from "vitest";
import {
  buildMockAssetFromForm,
  validateCreateAssetForm,
  CREATE_ASSET_INITIAL_VALUES,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
  applyAssetDetailForm,
  toAssetDetailFormValues,
  validateAssetDetailForm,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import { commitDeleteAssetMock } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import {
  applyCharacterDetailForm,
  toCharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { buildMockCharacterFromForm } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import {
  appendMockAsset,
  appendMockCharacter,
  listMockAssets,
  listMockCharacters,
  removeMockAsset,
  removeMockCharacter,
} from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";

describe("createAssetForm", () => {
  it("rejects empty displayName", () => {
    const errors = validateCreateAssetForm(CREATE_ASSET_INITIAL_VALUES);
    expect(errors.displayName).toBe("请填写资源名");
  });

  it("builds session mock with system assetId", () => {
    resetStudioIdSeq(0);
    const summary = buildMockAssetFromForm({
      displayName: " 试写音效 ",
      kind: "wav",
      note: "备注",
    });
    expect(summary.displayName).toBe("试写音效");
    expect(summary.kind).toBe("wav");
    expect(summary.note).toBe("备注");
    expect(summary.assetId.startsWith("asset_")).toBe(true);
    expect(summary.availability).toBe("unchecked");
    expect(summary.refCount).toBe(0);
  });
});

describe("assetDetailForm", () => {
  it("rejects empty displayName and bad measure text", () => {
    resetStudioIdSeq(10);
    const base = buildMockAssetFromForm({
      displayName: "基线",
      kind: "image",
      note: "",
    });
    const values = toAssetDetailFormValues(base);
    values.displayName = "  ";
    values.measureValueText = "12.5";
    const errors = validateAssetDetailForm(values);
    expect(errors.displayName).toBe("请填写资源名");
    expect(errors.measureValueText).toBe("请填写非负整数，或留空");
  });

  it("applies type and note without changing assetId", () => {
    resetStudioIdSeq(20);
    const base = buildMockAssetFromForm({
      displayName: "可编辑",
      kind: "text",
      note: "旧备注",
    });
    const values = toAssetDetailFormValues(base);
    values.note = "新备注";
    values.kind = "other";
    values.availability = "missing";
    values.measureValueText = "4096";
    values.measureUnit = "size_bytes";
    const next = applyAssetDetailForm(base, values);
    expect(next.assetId).toBe(base.assetId);
    expect(next.note).toBe("新备注");
    expect(next.kind).toBe("other");
    expect(next.availability).toBe("missing");
    expect(next.measureValue).toBe(4096);
  });
});

describe("character delete mock", () => {
  it("keeps list and detail selection consistent after remove", () => {
    resetStudioIdSeq(30);
    const created = buildMockCharacterFromForm({
      displayName: "待删角色",
      kind: "support",
      bio: "列表标签",
    });
    appendMockCharacter(created);
    expect(
      listMockCharacters().some((c) => c.agentId === created.agentId),
    ).toBe(true);

    // 详情表单对齐 CharacterDef：改嵌套字段；bio 为列表标签，apply 须保留
    const values = toCharacterDetailFormValues(created);
    values.identity.fullName = "先改再删";
    const updated = applyCharacterDetailForm(created, values);
    expect(updated.identity.fullName).toBe("先改再删");
    expect(updated.bio).toBe("列表标签");

    removeMockCharacter(created.agentId);
    expect(
      listMockCharacters().some((c) => c.agentId === created.agentId),
    ).toBe(false);
  });

  it("removeMockCharacter returns false for unknown id", () => {
    expect(removeMockCharacter("agent_not_exists_zzz")).toBe(false);
  });
});

describe("asset delete mock", () => {
  it("keeps list and detail selection consistent after remove", () => {
    resetStudioIdSeq(40);
    const created = buildMockAssetFromForm({
      displayName: "待删资源",
      kind: "wav",
      note: "",
    });
    appendMockAsset(created);
    expect(listMockAssets().some((a) => a.assetId === created.assetId)).toBe(
      true,
    );

    const values = toAssetDetailFormValues(created);
    values.note = "先改再删";
    const updated = applyAssetDetailForm(created, values);
    expect(updated.note).toBe("先改再删");

    commitDeleteAssetMock(created.assetId);
    expect(listMockAssets().some((a) => a.assetId === created.assetId)).toBe(
      false,
    );
  });

  it("removeMockAsset returns false for unknown id", () => {
    expect(removeMockAsset("asset_not_exists_zzz")).toBe(false);
  });
});
