/**
 * 带无原因抑制指令的夹具；应触发 STUDIO-COMMENT-003。
 * 覆盖裸 eslint-disable（无 --/原因 标记）与裸 @ts-expect-error。
 */
// eslint-disable-next-line no-console
console.log("fixture-no-reason");

// @ts-expect-error
export const forced: string = 1 as unknown as string;
