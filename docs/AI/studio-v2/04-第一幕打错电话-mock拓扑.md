# 第一幕《打错电话》· 磁盘包拓扑（代码事实）

> 正式稿（仓外）：`doubaoSister/.../定稿的故事/1.第一幕初识.md`（标题《打错电话》）。  
> **运行时真源：** `data/storis-packages/wrong_number_act1/`（`story.conf.json` + `cards/*.s-card.json` + `canvas.layout.json`）。  
> **编辑器投影：** `bis/pageBis/storyEditor/package/graph/diskBundleGraph.ts`（`bundleToEditorGraph` / `editorGraphToBundle`）。  
> 固化：2026-07-22（V2-T3-8）；文件名保留「mock拓扑」仅为历史导航，**不再指 CanvasMockGraph**。

## 1. 包 / 章节展示名

| 键 | 当前值 | 说明 |
|----|--------|------|
| `packageId` | `wrong_number_act1` | 正式语义 id；与 `story.conf.json` 一致 |
| 列表 title | `第一幕：打错电话` | 磁盘 `story.conf.json` |
| chapter_start.title | `第一幕 · 打错电话` | `canvas.layout.json` |
| entryCardId | `lanxing_wrong_number` | `story.conf.json` |
| participants | `lanxing` · `xiaopi` | conf + layout lanes |

## 2. 卡拓扑（业务理解）

磁盘 cardId 与画布 nodeId 映射见 layout；叙事结构：

```text
chapter_start
    → lanxing_wrong_number「打错电话」(lanxing, outbound_auto)
         exit_callback「挂机后补打」
           effects: attach_call_card → lanxing_callback_intro
                    schedule_call_card delayMinutes=2
           story 边 + attach 效果边 → lanxing_callback_intro
    → lanxing_callback_intro「补打自报」
         exit_known「记住名号」→ end_story → chapter_end
         exit_voicemail「没说清→留言」→ attach_call_card → lanxing_voicemail（cardKind=voicemail，进信箱）
    → lanxing_voicemail「语音留言」→ set_redial_slot + end_story → chapter_end
chapter_end.summary：小皮收拾书包 / 纸条 / 拿起电话（下章钩子，无独立小皮卡）
```

三张叙事卡 **均归属澜星**；左侧角色锚点来自 participants + 角色库 displayName。

## 3. 与正式稿节拍对照

| 正式稿节拍 | 磁盘落点 | 偏差备注 |
|------------|----------|----------|
| 第一次误拨、闲聊、不留名号挂断 | `lanxing_wrong_number` | speakable 为压缩台词，非逐句剧本 |
| 补打自报、问称呼、留 2267070、提小皮露营 | `lanxing_callback_intro` | 「告诉名字 / 不告诉」收敛成两条出口 |
| 未说清 → 语音信箱 | `attach_call_card` → `lanxing_voicemail`（`cardKind=voicemail`） | 挂卡分流进 GenStack/信箱；听完走卡 exits（已废弃 `create_voicemail`） |
| 文末小皮 vignette | `chapter_end.summary` | **刻意**不做小皮 CallCard |
| 「没过多久再响」 | `schedule_call_card` 2 分钟 | UI 投影；Host 未跑 |

## 4. 历史：从会话 mock 迁到磁盘

已删除的打开/列表 mock 路径：

- `CanvasMockGraph.ts` / `.edges.ts`（内存唯一种子）  
- `MOCK_STORY_PACKAGES` 作列表或打开真源  
- 旧 packageId `pkg_memory_bar_1` 作正式第一幕包（现仅调试器/设置展示 mock 可能引用）

替换原因：第三步要求真实业务接线；打开只读磁盘，保存整包写回。

## 5. 角色锚点计数

打开包时 `diskBundleGraph` 按各卡 `ownerAgentId` 统计 `pendingCardCount`；澜星通常为 3，小皮 0（文末镜头），其余参与者 0。
