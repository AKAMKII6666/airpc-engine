# CallCard / 引擎需求概览

> **文档入口**：[00-文档索引.md](./00-文档索引.md)（AI-RPG NPC 引擎总纲）。  
> 本文保留 CallCard 动机与电话媒介语法；**产品定位已升维为完整 NPC 引擎**（用户存档、角色、记忆、剧情包、瘦世界、可插拔对话通道）。

## 1. 需求来源

需求来自「澜星电话」类产品的剧情与多 NPC 讨论：用户可拨号、接听、外呼、与角色实时语音对话；并需要任务外呼、语音信箱、重播、世界事件、剧情、记忆等能力。

进一步承载强剧情时，缺少统一结构表达「这一通电话是什么」，以及缺少与角色记忆、用户存档、世界背景解耦清晰的引擎边界。因此本仓库建设：

> **独立的 AI-RPG NPC 引擎**；CallCard 是其中「单次通话合同」一柱。  
> 每一通电话由一张 CallCard 驱动；自由通话使用角色默认 FreeCallCard。

## 2. 为什么需要 CallCard（电话媒介）

电话剧情天然包含：主动拨号、外呼、未接/占线/挂断、重播、留言、过场播放、角色接力、明确目标与多出口。

没有统一合同会出现：规则散落代码、工具误用、不知自由聊还是剧情态、出口副作用难维护、多角色 pending 不直观、难离机调试。

CallCard 把电话剧情收成：**数据驱动 + 可编辑 + 可模拟验证**。

## 3. 引擎要解决的更大问题

除 CallCard 外，引擎还必须：

| 柱 | 要点 |
|----|------|
| User / Profile | 按用户存档；记忆与剧情进度只在 Profile |
| Character | 角色定义；社交一对多；可拨与否 |
| StoryPackage | 可插拔剧情定义；进度在 Profile |
| World（瘦） | Lore（含按地理位置生成背景）、Facts、WET；数据在 Profile |
| Dialogue | Realtime / 文本 / Manual 适配器 |

引荐与带话：**用 CallCard 挂卡 + 上下文**，不设 Relay 硬模块。

## 4. CallCard 能统一什么

- 自由通话与剧情通话统一（Free / Story / System）
- 每轮目标、beats、禁区、工具策略、出口 effect plan
- 出口可挂卡、回拨、重播、留言、写事实、结束剧情等
- 限制本轮 tools
- 画布编辑 + 调试器模拟

出口不是简单 `nextCardId`，而是 `condition + priority + effect plan`。

## 5. 核心技术形态（摘要）

```text
选中 User → 加载 PlayerProfile
CallIntent
  → Resolver（Profile.Board + Character）
  → Composer(Card + Memory + Lore/Facts)
  → DialogueAdapter
  → OutcomeEvaluator
  → ExitSelector → Effects（写回 Profile）
  → WET 事件
```

`cardKind`: free | story | system  
`interactionMode`: realtime_dialogue | playback_only | hybrid  

详情见 [01](./01-CallCard数据模型.md)、[02](./02-运行时协议.md)。

## 6. 本项目交付物

1. **`packages/rpg-engine`**：纯 TS；EngineHost 单例；CallSession；跑在 server/壳  
2. **`apps/studio`**：B/S；MUI；故事列表→画布；UserGate；调试与编辑分离  
3. **工作区 JSON + logs**：可被未来电话壳加载  

拓扑见 [18](../技术设计文档/18-部署拓扑与BS架构.md)；宿主见 [19](../技术设计文档/19-引擎宿主与会话模型.md)。

## 7. 基础技术选型

Next.js + React + TypeScript；**MUI**；画布 `@xyflow/react`；引擎零 React。详见 [05](../技术设计文档/05-技术选型与工程边界.md)。

## 8. Studio 形态（摘要）

- `/stories` → UserGate → 画布；`/characters`；`/debugger`（先 UserGate）  
- Free 挂机：FreeCallPostPipeline；Story：Exit  
- 详见 [03](./03-编辑器界面需求.md)、[04](./04-调试器界面需求.md)

## 9. 项目边界

**引擎 / Studio**：数据结构、可编辑、可模拟、可导出、有日志。  
**电话壳**：硬件、Realtime、EffectSink。

## 10. 硬约束摘要

| 主题 | 结论 |
|------|------|
| 文档入口 | [00](./00-文档索引.md) · [19](../技术设计文档/19-引擎宿主与会话模型.md) |
| 拓扑 | B/S；Host 单例；引擎在 server |
| 存档 | Profile JSON；Session 内存；logs jsonl |
| Story 出口 | condition + priority + effects；静态∪动态 |
| Free 挂机 | FreeCallPostPipeline |
| 用户门禁 | 无密码 UserGate 组件 |
| UI | MUI |
| 旧迁移 | 不做 |
