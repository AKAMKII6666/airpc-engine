# shellBis/users

`users.shell.bis.ts`：用户库页级唯一 shell。

- 打开页 / `refreshStamp` → GET 列表 → `applyListLoadResult`
- 一类页只挂一次（`UserLibraryView`）
- 不处理 create / save / delete 按钮（见 `pageBis/users/`）
