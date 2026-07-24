# stores/debugger

调试器域账本：叙事会话快照 + 信箱投影。

- 实现：`debuggerStore.ts`
- 灌账：`bis/shellBis/debugger/debugger.shell.bis.ts`
- UI 经 feature bis 读写；禁止 `DebuggerShell` 直引 mock / ajaxProxy / stores
- 禁止在此目录发请求或 import bis / ajaxProxy
