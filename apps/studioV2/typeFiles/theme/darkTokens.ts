/**
 * V2 暗色设计 token（对照 色板参考.md）。
 * 仅作静态页 / Theme 真源；浅色主题本步不做。
 */
export const darkTokens = {
  bg: {
    app: "#070D16",
    canvas: "#0A1320",
    canvasGrid: "#132236",
    panel: "#101824",
    panelElevated: "#151F2D",
    node: "#182232",
    nodeMuted: "#121B28",
    input: "#0D1522",
    hover: "#1C2A3D",
    active: "#223451",
  },
  border: {
    subtle: "#1E2A3A",
    panel: "#26364A",
    node: "#354760",
    strong: "#536BFF",
    warning: "#FFB020",
    danger: "#FF5A4E",
    success: "#62D26F",
  },
  text: {
    primary: "#F2F6FF",
    secondary: "#B9C6DA",
    muted: "#7E8DA4",
    disabled: "#526073",
    inverse: "#07111D",
    warning: "#FFC24A",
    danger: "#FF776D",
    success: "#7DE086",
  },
  brand: {
    primary: "#5B6CFF",
    primaryHover: "#6F7DFF",
    primaryActive: "#4658E8",
    violet: "#8B5CF6",
    cyan: "#32D6FF",
    teal: "#25D0A2",
  },
  state: {
    success: "#62D26F",
    warning: "#FFB020",
    danger: "#FF5A4E",
    info: "#32D6FF",
    pending: "#A78BFA",
    running: "#FF8A00",
  },
  card: {
    story: "#5B6CFF",
    free: "#2FA86D",
    scheduled: "#FF8A00",
    cutscene: "#8B5CF6",
    start: "#62D26F",
    end: "#FF5A4E",
    world: "#25D0A2",
    action: "#32D6FF",
  },
  window: {
    bg: "#101824",
    bgActive: "#151F2D",
    header: "#121C2A",
    border: "#2A3A50",
    shadow: "rgba(0, 0, 0, 0.36)",
    overlay: "rgba(7, 13, 22, 0.62)",
  },
} as const;

/** darkTokens 的只读结构别名；供 Theme / 样式消费方标注类型，禁止另起浅色分叉。 */
export type DarkTokens = typeof darkTokens;
