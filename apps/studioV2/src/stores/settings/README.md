# stores/settings

设置域账本：偏好 / Schema / 校验报告静态投影。

- 实现：`settingsStore.ts`
- 灌账：`bis/shellBis/settings/settings.shell.bis.ts`
- UI 经 feature bis 读写；禁止 Settings 页直引 mock / ajaxProxy / stores
- 分类选中、报告开合为 UI 瞬时态，不进本 store
- 禁止在此目录发请求或 import bis / ajaxProxy
