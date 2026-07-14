/**
 * 模块名称：故事编辑器左侧库（角色 + 卡模板）
 */
"use client";

import { Button, Chip, Stack, Typography } from "@mui/material";
import { useStudioStoreShallow } from "@studio/store/storeContext/studioStoreContext";
import { useStoryEditorActionsBis } from "@studio/bis/storyEditor/storyEditor.bis";
import styles from "./storyPalette.module.scss";

export function StoryPalette() {
  const { characters, conf, saving } = useStudioStoreShallow(function (s) {
    return {
      characters: s.storyEditor.characters,
      conf: s.storyEditor.conf,
      saving: s.storyEditor.saving,
    };
  });
  const { addParticipant, createCardFromTemplate } =
    useStoryEditorActionsBis();

  const participants = new Set(conf?.participants ?? []);

  return (
    <aside className={styles.palette}>
      <Typography variant="subtitle2" gutterBottom>
        角色库
      </Typography>
      <Stack spacing={1} className={styles.list}>
        {characters.map(function (ch) {
          const inPkg = participants.has(ch.agentId);
          return (
            <div key={ch.agentId} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.name}>{ch.displayName}</span>
                <Chip
                  size="small"
                  label={ch.dialable ? "可拨" : "锁定"}
                  variant="outlined"
                />
              </div>
              <Typography variant="caption" color="text.secondary">
                {ch.agentId}
                {ch.freeCardId ? ` · free ${ch.freeCardId}` : ""}
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                <Button
                  size="small"
                  disabled={saving || inPkg}
                  onClick={function (): void {
                    void addParticipant(ch.agentId);
                  }}
                >
                  {inPkg ? "已在包内" : "加参与者"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={saving}
                  onClick={function (): void {
                    void createCardFromTemplate(ch.agentId);
                  }}
                >
                  新建 Story 卡
                </Button>
              </Stack>
            </div>
          );
        })}
        {characters.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            无角色（检查 data/characters）
          </Typography>
        ) : null}
      </Stack>

      <Typography variant="subtitle2" className={styles.section} gutterBottom>
        卡模板
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Story 卡：选角色后点「新建 Story 卡」。Free 卡在角色目录维护（本栏只读
        freeCardId）。
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        画布：从节点右侧拖到另一节点 = 写 attach_call_card；选中边可编辑
        Exit；Delete 删除连线。
      </Typography>
    </aside>
  );
}
