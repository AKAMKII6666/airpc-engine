# shellBis/characters

`characters.shell.bis.ts`：角色库页级唯一 shell。

- 打开页 / `refreshStamp` → GET 列表 → `applyListLoadResult`
- 一类页只挂一次（`CharacterLibraryView`）
- 不处理 create / save / delete 按钮（见 `pageBis/characters/`）
