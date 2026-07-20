# 全局资产库

真源见需求 [14](../../docs/AI和人类/需求/14-资源与媒体资产.md)。

| 路径 | 说明 |
|------|------|
| `meta/<assetId>.json` | `AssetMeta` 元数据 |
| `files/...` | 二进制／旁路文件（`uri` 相对本目录 `assets/`） |

样例：`clip_hello`（`files/clip_hello.wav`），由 `golden_handoff` 卡 `demo_playback_hello` 引用。
