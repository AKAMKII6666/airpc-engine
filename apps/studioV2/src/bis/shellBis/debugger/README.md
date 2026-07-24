# shellBis/debugger

页级灌账：`debugger.shell.bis.ts` → `useDebuggerShellBis`。

- 挂载于 `/debugger`（`DebuggerShell` 内只挂一次）
- 灌叙事会话 mock + 信箱 GET；听 `sessionRefreshStamp` / `mailboxRefreshStamp`
- 不处理 validate / seed / listen 按钮（pageBis）
