# 10. 态度记忆 + Memory Trace 成品面板（已落地）

> 完成：2026-08-17。原为下一步开工单，现已实现并过两侧测试与 import 门禁。
> 事实记忆主链见 [09](./09-记忆Commit与Trace.md)，产品真源见 [12](../../AI和人类/需求/12-记忆模型.md)。

## 1. 结果

- Memory Trace 成品面板：调试器右侧待机态新增「上下文 / Memory Trace」双 Tab，读取最近一次 `endCall.memoryTrace.dtoId`，展示 committed/skipped、写入层、计数、exclusionSeeds、summary、结构化字段与 LLM 预览块。
- 态度记忆：每次通话挂机后单独抽取一次，落 `relational/attitude`；text 是人话摘要，payload_json 保存 `stance/summary/evidence/feel/keywords`。
- 态度字段拆成 `feel`（抽象感觉标签）和 `keywords`（从原文原样抽出的溯源关键词），避免用归纳词冒充搜索词。
- 角色编辑：`persona.attitudeHistoryLimit` 配置历史态度参考条数，最小 1、无上限，缺省 5。
- 角色库记忆区：在通用记忆列表上方展示最近 5 条态度卡片，含 stance/summary/evidence/keywords。
- 模型：全库文本模型统一 `qwen3.5-flash`，事实与态度抽取同走该模型；抽取请求显式 `enable_thinking: false`，避免思考拖慢挂机收尾。

## 2. 关键约束

- 人设只作抽取视角，不得写成身份或事实记忆。
- 态度只要抽出 stance/summary/evidence 就优先落库；坏 `evidenceTurnIndexes` 会按 evidence/keywords 回填，不再因种子误伤或双向 grounding 整条作废。
- 没有可依据信号时模型可返回 null；空 stance/summary/evidence 才丢弃。
- 态度失败不阻断事实记忆与 endCall；每条通话只追加一条态度。
- 热层投影固定最近 3 条态度，抽取参考条数由角色配置控制。
