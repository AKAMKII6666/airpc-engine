# stores/workbench

工作台域账本：右侧工程状态 + 最近调试（静态 mock）。

- 实现：`workbenchStore.ts`
- 灌账：`bis/shellBis/workbench/workbench.shell.bis.ts`
- 故事包列表复用 `packages` store；工作台页同时挂 packages shell
- UI 经 feature bis 读写；禁止 `WorkbenchShell` / `WorkbenchSideCol` 直引 mock / ajaxProxy / stores
- 禁止在此目录发请求或 import bis / ajaxProxy
