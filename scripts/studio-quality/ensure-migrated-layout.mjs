/**
 * 若嵌套目录已落地，则删除已废弃的平铺副本，避免 STUDIO-STRUCT-008 / STUDIO-STRUCT-014。
 * 由 quality:studio 在 typecheck 之前调用；文件已清理后为 no-op。
 */
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const thisFile = fileURLToPath(import.meta.url);

/** @type {{ flat: string; nested: string }[]} */
const PAIRS = [
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/form/chapterPropertyForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/form/exitListForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/exitList/exitListForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/form/nodePropertyForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/form/nodePropertyFormItems.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/node/nodePropertyFormItems.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/form/floatingPanelSubmit.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/panel/floatingPanelSubmit.ts",
  },
  {
    flat: "apps/studioV2/src/pageComponents/characters/com/useCharacterLibraryPage.ts",
    nested:
      "apps/studioV2/src/pageComponents/characters/hooks/useCharacterLibraryPage.ts",
  },
  {
    flat: "apps/studioV2/src/pageComponents/assets/com/useAssetLibraryPage.ts",
    nested:
      "apps/studioV2/src/pageComponents/assets/hooks/useAssetLibraryPage.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/characters/createCharacterForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/create/createCharacterForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/characters/createCharacter_bis.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/create/createCharacter_bis.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/characters/characterDetailForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDetailForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/characters/deleteCharacter_bis.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/delete/deleteCharacter_bis.ts",
  },
  {
    flat: "apps/studioV2/src/pageComponents/characters/com/CharacterDeleteConfirmModal.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/modal/confirm/DeleteConfirmModal.tsx",
  },
  {
    flat: "apps/studioV2/src/pageComponents/assets/com/AssetDeleteConfirmModal.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/modal/confirm/DeleteConfirmModal.tsx",
  },
  {
    flat:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneCard.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneCard/index.tsx",
  },
  {
    flat:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneCardBody.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneCardBody/index.tsx",
  },
  {
    flat:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneListPanel.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptSceneListPanel/index.tsx",
  },
  {
    flat:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptScenePatchFields.tsx",
    nested:
      "apps/studioV2/src/commonUiComponents/form/blocks/PromptSceneListEditor/com/PromptScenePatchFields/index.tsx",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/characterDetailForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDetailForm.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/characterDefMapper.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDefMapper.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/characterDetailFormValidate.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDetailFormValidate.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/characterDetailFormItems.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDetailFormItems.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/characterDetailFormValues.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/form/characterDetailFormValues.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/characters/detail/saveCharacter_bis.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/characters/detail/save/saveCharacter_bis.ts",
  },
  {
    flat: "apps/studioV2/src/utils/ajaxProxy/library/charactersApi.ts",
    nested: "apps/studioV2/src/utils/ajaxProxy/library/api/charactersApi.ts",
  },
  {
    flat: "apps/studioV2/src/utils/ajaxProxy/library/memoryApi.ts",
    nested: "apps/studioV2/src/utils/ajaxProxy/library/api/memoryApi.ts",
  },
  {
    flat: "apps/studioV2/src/utils/ajaxProxy/library/usersApi.ts",
    nested: "apps/studioV2/src/utils/ajaxProxy/library/api/usersApi.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/users/form/userProfileMapper.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/users/form/mapper/mapUserProfile.ts",
  },
  {
    flat:
      "apps/studioV2/src/bis/pageBis/users/form/mapper/userProfileMapper.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/users/form/mapper/mapUserProfile.ts",
  },
  {
    flat: "apps/studioV2/src/utils/ajaxProxy/library/mockLibraryData.ts",
    nested: "apps/studioV2/src/utils/ajaxProxy/library/mock/mockLibraryData.ts",
  },
  {
    flat: "apps/studioV2/src/utils/ajaxProxy/library/mockCharactersData.ts",
    nested:
      "apps/studioV2/src/utils/ajaxProxy/library/mock/mockCharactersData.ts",
  },
  {
    flat: "apps/studioV2/src/utils/server/apiResponse.server.ts",
    nested: "apps/studioV2/src/utils/server/http/apiResponse.server.ts",
  },
  {
    flat: "apps/studioV2/src/utils/server/charactersFs.server.ts",
    nested: "apps/studioV2/src/utils/server/characters/charactersFs.server.ts",
  },
  {
    flat: "apps/studioV2/src/utils/server/dataRoot.server.ts",
    nested: "apps/studioV2/src/utils/server/data/dataRoot.server.ts",
  },
  {
    flat: "apps/studioV2/src/utils/server/memoryRead.server.ts",
    nested: "apps/studioV2/src/utils/server/memory/memoryRead.server.ts",
  },
  {
    flat: "apps/studioV2/src/utils/server/usersFs.server.ts",
    nested: "apps/studioV2/src/utils/server/users/usersFs.server.ts",
  },
  {
    flat: "apps/studioV2/typeFiles/library/characters/characterSummary.ts",
    nested:
      "apps/studioV2/typeFiles/library/characters/form/characterSummary.ts",
  },
  {
    flat: "apps/studioV2/typeFiles/library/characters/characterFormShapes.ts",
    nested:
      "apps/studioV2/typeFiles/library/characters/form/characterFormShapes.ts",
  },
  {
    flat: "apps/studioV2/typeFiles/library/characters/memoryReadModel.ts",
    nested:
      "apps/studioV2/typeFiles/library/characters/memory/memoryReadModel.ts",
  },
  {
    flat: "apps/studioV2/typeFiles/library/characters/realtimeVoiceOptions.ts",
    nested:
      "apps/studioV2/typeFiles/library/characters/realtime/realtimeVoiceOptions.ts",
  },
  {
    flat:
      "apps/studioV2/src/pageComponents/characters/com/memory/useCharacterMemoryList.ts",
    nested:
      "apps/studioV2/src/pageComponents/characters/com/memory/hooks/useCharacterMemoryList.ts",
  },
  {
    flat:
      "apps/studioV2/src/pageComponents/characters/com/memory/useCharacterMemoryPanel.ts",
    nested:
      "apps/studioV2/src/pageComponents/characters/com/memory/hooks/useCharacterMemoryPanel.ts",
  },
  {
    flat:
      "apps/studioV2/src/pageComponents/characters/com/memory/useCharacterMemoryUsers.ts",
    nested:
      "apps/studioV2/src/pageComponents/characters/com/memory/hooks/useCharacterMemoryUsers.ts",
  },
  {
    flat:
      "apps/studioV2/src/pageComponents/characters/com/memory/CharacterMemorySectionShell.tsx",
    nested:
      "apps/studioV2/src/pageComponents/characters/com/memory/CharacterMemorySectionFrame.tsx",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/canvasCharacterAnchor.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/canvas/canvasCharacterAnchor.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/exitHandleLayout.ts",
    nested: "apps/studioV2/src/bis/pageBis/storyEditor/canvas/exitHandleLayout.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/nodePropertyForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/nodePropertyFormItems.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/node/nodePropertyFormItems.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/exitListForm.ts",
    nested:
      "apps/studioV2/src/bis/pageBis/storyEditor/form/exitList/exitListForm.ts",
  },
  {
    flat: "apps/studioV2/src/bis/pageBis/storyEditor/roleConnection.ts",
    nested: "apps/studioV2/src/bis/pageBis/storyEditor/role/roleConnection.ts",
  },
  {
    flat:
      "apps/studioV2/src/pageComponents/storyEditor/com/panel/ExitListEditor/index.tsx",
    nested:
      "apps/studioV2/src/pageComponents/storyEditor/com/panel/ExitListEditor/ExitListEditor.tsx",
  },
];

/**
 * @returns {number} 删除的文件数
 */
export function ensureMigratedLayout() {
  let removed = 0;
  for (const pair of PAIRS) {
    const flatAbs = path.join(repoRoot, pair.flat);
    const nestedAbs = path.join(repoRoot, pair.nested);
    if (existsSync(nestedAbs) && existsSync(flatAbs)) {
      unlinkSync(flatAbs);
      removed += 1;
      console.log(`removed obsolete flat file: ${pair.flat}`);
    }
  }
  return removed;
}

const invokedAsCli =
  process.argv[1] != null && path.resolve(process.argv[1]) === thisFile;
if (invokedAsCli) {
  const n = ensureMigratedLayout();
  console.log(
    n === 0
      ? "ensure-migrated-layout: nothing to remove"
      : `ensure-migrated-layout: removed ${n} file(s)`,
  );
}
