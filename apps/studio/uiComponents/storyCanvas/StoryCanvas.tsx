/**
 * 模块名称：故事画布（Start／End／泳道／Exit 投影／撤销）
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import { useStoryEditorActionsBis } from "@studio/bis/storyEditor/storyEditor.bis";
import {
  listTerminalSourceCardIds,
  projectExitEdges,
  type ExitConnectKind,
} from "@studio/bis/storyEditor/storyExitEdges.bis";
import {
  END_NODE_ID,
  LANE_BAND_HEIGHT,
  LANE_ORIGIN_Y,
  START_NODE_ID,
  agentIdForLaneY,
  yForLaneOrder,
} from "@studio/bis/storyEditor/storyEditorLayout.bis";
import { ExitConnectDialog } from "@studio/uiComponents/storyCanvas/ExitConnectDialog";
import { deriveMediaBadges } from "@studio/bis/storyEditor/storyMediaBadges.bis";
import styles from "./storyCanvas.module.scss";

function cardLabel(card: unknown, cardId: string): string {
  if (card && typeof card === "object" && "title" in card) {
    const title = (card as { title?: string }).title;
    if (title) return title;
  }
  return cardId;
}

function kindClass(kind: string): string {
  if (kind === "free") return styles.nodeKindFree;
  if (kind === "system") return styles.nodeKindSystem;
  return styles.nodeKindStory;
}

function modeClass(entryMode: string): string {
  if (entryMode.includes("outbound")) return styles.nodeModeOutbound;
  if (entryMode.includes("inbound")) return styles.nodeModeInbound;
  return styles.nodeModeEither;
}

const BADGE_CLASS: Record<string, string> = {
  inbound: styles.badge_inbound,
  outbound: styles.badge_outbound,
  playback: styles.badge_playback,
  prompt: styles.badge_prompt,
  voicemail: styles.badge_voicemail,
  redial: styles.badge_redial,
  schedule: styles.badge_schedule,
  attach: styles.badge_attach,
};

function CallCardNode(props: NodeProps) {
  const data = props.data as {
    title: string;
    meta: string;
    badges: Array<{ id: string; label: string }>;
  };
  return (
    <div className={styles.nodeInner}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeBody}>
        <span className={styles.nodeTitle}>{data.title}</span>
        <span className={styles.nodeMeta}>{data.meta}</span>
        {data.badges.length > 0 ? (
          <div className={styles.badgeRow}>
            {data.badges.map(function (b) {
              return (
                <span
                  key={b.id}
                  className={[styles.badge, BADGE_CLASS[b.id] ?? ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {b.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function MarkerNode(props: NodeProps) {
  const data = props.data as { title: string };
  return (
    <div className={styles.markerInner}>
      {props.id === END_NODE_ID ? (
        <Handle type="target" position={Position.Left} />
      ) : null}
      <span>{data.title}</span>
      {props.id === START_NODE_ID ? (
        <Handle type="source" position={Position.Right} />
      ) : null}
    </div>
  );
}

const nodeTypes = {
  callCard: CallCardNode,
  marker: MarkerNode,
};

function StoryCanvasInner() {
  const {
    conf,
    layout,
    cards,
    selectedCardId,
    selectedEdgeId,
    entryCardId,
  } = useStudioStoreShallow(function (s) {
    return {
      conf: s.storyEditor.conf,
      layout: s.storyEditor.layout,
      cards: s.storyEditor.cards,
      selectedCardId: s.storyEditor.selectedCardId,
      selectedEdgeId: s.storyEditor.selectedEdgeId,
      entryCardId: s.storyEditor.conf?.entryCardId ?? null,
    };
  });

  const setStoryEditorSelectedCard = useStudioStore(
    (s) => s.setStoryEditorSelectedCard,
  );
  const setStoryEditorSelectedEdge = useStudioStore(
    (s) => s.setStoryEditorSelectedEdge,
  );
  const {
    connectExitEdge,
    disconnectExitEdge,
    setEntryCard,
    changeCardOwnerAgent,
    deleteSelectedCards,
    undoCanvas,
    redoCanvas,
    initHistoryScope,
  } = useStoryEditorActionsBis();

  const [pendingConnect, setPendingConnect] = useState<{
    source: string;
    target: string;
  } | null>(null);
  const [connectKind, setConnectKind] =
    useState<ExitConnectKind>("user_dial");

  useEffect(
    function (): void {
      initHistoryScope(conf?.packageId ?? null);
    },
    [conf?.packageId, initHistoryScope],
  );

  const sortedLanes = useMemo(
    function () {
      if (!layout) return [];
      return layout.lanes.slice().sort(function (a, b) {
        return a.order - b.order;
      });
    },
    [layout],
  );

  const layoutNodes = useMemo(
    function () {
      if (!layout || !conf) return [];
      const cardNodes: Node[] = layout.nodes.map(function (n) {
        const card = cards[n.cardId];
        const kind =
          card && typeof card === "object" && "cardKind" in card
            ? String((card as { cardKind?: string }).cardKind ?? "story")
            : "story";
        const entryMode =
          card && typeof card === "object" && "entryMode" in card
            ? String((card as { entryMode?: string }).entryMode ?? "")
            : "";
        const owner =
          card && typeof card === "object" && "ownerAgentId" in card
            ? String((card as { ownerAgentId?: string }).ownerAgentId ?? "")
            : "";
        const isEntry = n.cardId === entryCardId;
        const badges = deriveMediaBadges(card);
        return {
          id: n.cardId,
          type: "callCard",
          position: { x: n.x, y: n.y },
          data: {
            title: cardLabel(card, n.cardId),
            meta: [kind, entryMode, owner, isEntry ? "entry" : ""]
              .filter(Boolean)
              .join(" · "),
            badges,
          },
          className: [
            styles.node,
            kindClass(kind),
            modeClass(entryMode),
            isEntry ? styles.nodeEntry : "",
            selectedCardId === n.cardId ? styles.nodeSelected : "",
          ]
            .filter(Boolean)
            .join(" "),
          selected: selectedCardId === n.cardId,
        } satisfies Node;
      });

      const midY =
        sortedLanes.length > 0
          ? yForLaneOrder(Math.floor((sortedLanes.length - 1) / 2))
          : LANE_ORIGIN_Y + 48;

      const markers: Node[] = [
        {
          id: START_NODE_ID,
          type: "marker",
          position: { x: 16, y: midY },
          data: { title: "Start" },
          className: styles.markerStart,
          draggable: false,
          selectable: true,
          deletable: false,
        },
        {
          id: END_NODE_ID,
          type: "marker",
          position: { x: 920, y: midY },
          data: { title: "End" },
          className: styles.markerEnd,
          draggable: false,
          selectable: true,
          deletable: false,
        },
      ];

      return [...markers, ...cardNodes];
    },
    [layout, conf, cards, entryCardId, selectedCardId, sortedLanes],
  );

  const flowEdges: Edge[] = useMemo(
    function () {
      const edges: Edge[] = projectExitEdges(cards).map(function (e) {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          selectable: true,
          selected: selectedEdgeId === e.id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            strokeWidth: selectedEdgeId === e.id ? 2.5 : 1.5,
            stroke:
              e.connectKind === "outbound_callback" ? "#b45309" : undefined,
          },
        } satisfies Edge;
      });

      if (entryCardId) {
        edges.push({
          id: `${START_NODE_ID}::entry::${entryCardId}`,
          source: START_NODE_ID,
          target: entryCardId,
          label: "entry",
          selectable: false,
          deletable: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#2e7d32", strokeWidth: 2 },
        });
      }

      for (const term of listTerminalSourceCardIds(cards)) {
        edges.push({
          id: `__term__::${term.cardId}::${term.exitId}`,
          source: term.cardId,
          target: END_NODE_ID,
          label: term.label,
          selectable: false,
          deletable: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#616161", strokeDasharray: "4 3", strokeWidth: 1.5 },
        });
      }

      return edges;
    },
    [cards, selectedEdgeId, entryCardId],
  );

  const [nodes, setNodes] = useState<Node[]>(layoutNodes);
  const [edges, setEdges] = useState<Edge[]>(flowEdges);

  useEffect(
    function (): void {
      setNodes(layoutNodes);
    },
    [layoutNodes],
  );

  useEffect(
    function (): void {
      setEdges(flowEdges);
    },
    [flowEdges],
  );

  const onNodesChange = useCallback(function (changes: NodeChange<Node>[]): void {
    setNodes(function (current) {
      return applyNodeChanges(changes, current);
    });
  }, []);

  const onNodeDragStop = useCallback(
    function (_evt: unknown, node: Node): void {
      if (node.id === START_NODE_ID || node.id === END_NODE_ID) return;
      if (!layout) return;
      const targetAgent =
        agentIdForLaneY(node.position.y, layout.lanes) ??
        (cards[node.id] as { ownerAgentId?: string } | undefined)?.ownerAgentId;
      if (!targetAgent) return;
      const lane = layout.lanes.find(function (l) {
        return l.agentId === targetAgent;
      });
      const snappedY = lane ? yForLaneOrder(lane.order) : node.position.y;
      void changeCardOwnerAgent(node.id, targetAgent, {
        x: node.position.x,
        y: snappedY,
      });
    },
    [layout, cards, changeCardOwnerAgent],
  );

  const onNodeClick = useCallback(
    function (_evt: unknown, node: Node): void {
      if (node.id === START_NODE_ID || node.id === END_NODE_ID) {
        setStoryEditorSelectedCard(null);
        return;
      }
      setStoryEditorSelectedCard(node.id);
    },
    [setStoryEditorSelectedCard],
  );

  const onEdgeClick = useCallback(
    function (_evt: unknown, edge: Edge): void {
      if (
        edge.id.startsWith(`${START_NODE_ID}::`) ||
        edge.id.startsWith("__term__::")
      ) {
        return;
      }
      setStoryEditorSelectedEdge(edge.id);
    },
    [setStoryEditorSelectedEdge],
  );

  const onConnect = useCallback(
    function (connection: Connection): void {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      if (connection.source === START_NODE_ID) {
        if (
          connection.target !== END_NODE_ID &&
          connection.target !== START_NODE_ID
        ) {
          void setEntryCard(connection.target);
        }
        return;
      }
      if (
        connection.target === START_NODE_ID ||
        connection.source === END_NODE_ID ||
        connection.target === END_NODE_ID
      ) {
        return;
      }
      setConnectKind("user_dial");
      setPendingConnect({
        source: connection.source,
        target: connection.target,
      });
    },
    [setEntryCard],
  );

  const onEdgesDelete = useCallback(
    function (deleted: Edge[]): void {
      for (const edge of deleted) {
        void disconnectExitEdge(edge.id);
      }
    },
    [disconnectExitEdge],
  );

  const onNodesDelete = useCallback(
    function (deleted: Node[]): void {
      const ids = deleted
        .filter(function (n) {
          return n.type === "callCard";
        })
        .map(function (n) {
          return n.id;
        });
      if (ids.length > 0) {
        void deleteSelectedCards(ids);
      }
    },
    [deleteSelectedCards],
  );

  useEffect(
    function (): (() => void) | void {
      function onKey(evt: KeyboardEvent): void {
        const target = evt.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        const mod = evt.metaKey || evt.ctrlKey;
        if (!mod) return;
        if (evt.key === "z" && !evt.shiftKey) {
          evt.preventDefault();
          void undoCanvas();
        } else if (evt.key === "z" && evt.shiftKey) {
          evt.preventDefault();
          void redoCanvas();
        } else if (evt.key === "y") {
          evt.preventDefault();
          void redoCanvas();
        }
      }
      window.addEventListener("keydown", onKey);
      return function (): void {
        window.removeEventListener("keydown", onKey);
      };
    },
    [undoCanvas, redoCanvas],
  );

  useEffect(
    function (): void {
      if (!layout || selectedCardId) return;
      const first = layout.nodes[0]?.cardId ?? null;
      if (first) {
        setStoryEditorSelectedCard(first);
      }
    },
    [layout, selectedCardId, setStoryEditorSelectedCard],
  );

  if (!conf || !layout) {
    return <div className={styles.empty}>暂无画布数据</div>;
  }

  const canvasHeight = Math.max(
    360,
    LANE_ORIGIN_Y + sortedLanes.length * LANE_BAND_HEIGHT + 80,
  );

  return (
    <div className={styles.canvas} style={{ minHeight: canvasHeight }}>
      <div className={styles.laneBands} aria-hidden>
        {sortedLanes.map(function (lane) {
          return (
            <div
              key={lane.agentId}
              className={styles.laneBand}
              style={{
                top: LANE_ORIGIN_Y + lane.order * LANE_BAND_HEIGHT,
                height: LANE_BAND_HEIGHT,
              }}
            >
              <span className={styles.laneLabel}>{lane.agentId}</span>
            </div>
          );
        })}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        multiSelectionKeyCode={["Meta", "Control"]}
        fitView
        minZoom={0.35}
        maxZoom={1.5}
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls />
      </ReactFlow>
      <ExitConnectDialog
        open={pendingConnect !== null}
        sourceCardId={pendingConnect?.source ?? null}
        targetCardId={pendingConnect?.target ?? null}
        value={connectKind}
        onChange={setConnectKind}
        onCancel={function (): void {
          setPendingConnect(null);
        }}
        onConfirm={function (): void {
          if (!pendingConnect) return;
          const { source, target } = pendingConnect;
          setPendingConnect(null);
          void connectExitEdge(source, target, connectKind);
        }}
      />
    </div>
  );
}

export function StoryCanvas() {
  return (
    <ReactFlowProvider>
      <StoryCanvasInner />
    </ReactFlowProvider>
  );
}
