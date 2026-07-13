# apps/studio

B/S Studio（Next.js）。客户端分层见技术设计 [21](../../docs/AI和人类/技术设计文档/21-Studio客户端分层.md)。

```text
app/                 Next App Router
bis/shell/           页面 shell
store/               Zustand（非 Profile 真源）
utils/ajaxHelper/    唯一浏览器请求出口
uiComponents/        跨页共享
types/frontEnd/      客户端类型
```

**禁止**本包内 `index.ts` barrel；直引具体文件。  
引擎只经 `@airpc/rpg-engine` 门面（server）；见技术设计 [05 §1.1](../../docs/AI和人类/技术设计文档/05-技术选型与工程边界.md)、[21](../../docs/AI和人类/技术设计文档/21-Studio客户端分层.md)。
