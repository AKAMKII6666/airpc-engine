# Studio V2 · 代码事实索引（Agent 记忆真源）

> **目录性质：** `docs/AI/` = Agent 对照**当前代码**固化的理解与过程记忆。  
> **不是**产品需求真源（那是 `docs/AI和人类/需求/`），也**不是**工程选型定稿（那是 `docs/AI和人类/技术设计文档/`）。  
> **冲突裁决：** 代码 / 测试 > 本目录 > 需求 / 技术设计（先对齐用户）> `docs/人类/`。  
> **固化授权：** 2026-07-22 用户明示：「这个目录就是你的记忆真源库」。  
> **对照基线日期：** 2026-07-22（V2-T3-8：第三步真源接通已收口；角色/玩家/故事包列表/编辑器读写+编辑接线均磁盘真源；本步清零域 mock 已删）。

## 1. 本册导航

| 文档 | 内容 |
|------|------|
| [studio-v2/01-分层与目录落点.md](./studio-v2/01-分层与目录落点.md) | V2 顶层目录、剩余 mock 落点、禁 barrel |
| [studio-v2/02-角色库与人设编辑.md](./studio-v2/02-角色库与人设编辑.md) | 磁盘五人、`/api/characters`、详情 AutoForm、personalityCode |
| [studio-v2/03-故事编辑器画布与属性浮窗.md](./studio-v2/03-故事编辑器画布与属性浮窗.md) | 节点/边、选中、出口 Effect 面板 |
| [studio-v2/04-第一幕打错电话-mock拓扑.md](./studio-v2/04-第一幕打错电话-mock拓扑.md) | `wrong_number_act1` 磁盘包拓扑 vs 正式稿（文件名保留 mock 历史） |
| [studio-v2/05-引擎Composer与personalityCode.md](./studio-v2/05-引擎Composer与personalityCode.md) | 引擎侧人格 hard 注入 |
| [studio-v2/06-过程岔子与纠正记录.md](./studio-v2/06-过程岔子与纠正记录.md) | 做错什么、用户怎么要求改、最终口径 |
| [studio-v2/07-已知边界与下一步候选.md](./studio-v2/07-已知边界与下一步候选.md) | 故意未做的事、易误判项 |

## 2. 与其它文档层的分工

| 层 | 路径 | Agent 用法 |
|----|------|------------|
| 人类原始意图 | `docs/人类/` | **只读** |
| 产品「做什么」 | `docs/AI和人类/需求/` | 改行为 / UX / 验收时更新 |
| 工程「怎么建」 | `docs/AI和人类/技术设计文档/` | Host / 拓扑 / 导出等 |
| Studio V2 UI 需求 | `docs/AI和人类/sudioV2.0版本/需求/ui/` | 目录门禁、编辑器 UI 向导 |
| **本目录** | `docs/AI/` | 「代码现在长什么样、我们踩过什么坑」 |

外部正式剧情稿（**非本仓**）：  
`/Users/bolbiao/workspace/doubaoSister/docs/shared/plans/主线剧情内容/定稿的故事/1.第一幕初识.md`  
—— 叙事蓝本对照用；包落盘进度见第三步索引。

## 3. 一句话现状（2026-07-22 · T3-8 收口）

- **角色库 CRUD 真源**：`data/characters` ↔ `/api/characters`；五人 JSON 落盘；角色业务 mock（`MOCK_CHARACTERS` / `mockCharactersData` 等）**已删**，零残余。  
- **玩家配置 CRUD 真源**：`data/users` ↔ `/api/users`；`MOCK_USER_PROFILES` / `listMockUserProfiles` 等 **已删**；`buildUserFromForm`（无 Mock 语义）。  
- **故事包 BFF + UI 真源**：`data/storis-packages` ↔ `/api/stories`（列 / 整包读 / 整包写）；列表 `listStoryPackages_bis` 扫磁盘；编辑器 `loadStoryPackage_bis` / `saveStoryPackage_bis` + `diskBundleGraph` 读写 `wrong_number_act1`。  
- **本步清零 mock 已删**：`CanvasMockGraph`、`MOCK_STORY_PACKAGES` 列表真源、`MOCK_EDITOR_CHARACTERS`、`ExitEffectsMockList` 等业务入口；**允许暂留**：资源库 `MOCK_ASSETS`、调试器/设置/工作台侧栏展示 mock。  
- **编辑接线可落盘**：浮窗/出口/Effect/归属/章节字段 → 会话图 → 顶栏整包保存 → `cards` + `canvas.layout.json`。  
- **引擎已接** `persona.personalityCode` → Composer `systemHard`；Studio 字段与之对齐。  
- **下一步（非本步）：** 资源库落盘、调试器真会话、第二幕内容、Host 闭环。

## 4. 真源接通（里程碑）

- [第三步需求](../AI和人类/里程碑/v2.0/第三步需求.md)  
- [项目第三步计划执行索引](../AI和人类/里程碑/v2.0/项目第三步计划执行索引.md)（gbx：`workflow_dir=.ai-workflow-v2-step3`）

## 5. 维护约定

- 行为或契约以代码变更后**同步改本目录**；过时理解视为缺陷。  
- 新岔子记入 [06](./studio-v2/06-过程岔子与纠正记录.md)，不要只口头说过。  
- 升格为需求 / 技术设计须用户明示；本目录不偷偷替代 `需求/`。
