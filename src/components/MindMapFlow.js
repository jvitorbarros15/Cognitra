"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ADDED: transform AI JSON into React Flow nodes and edges
function mindMapToFlow(data) {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;

  function createNode(label, x, y) {
    const id = `node-${nodeIdCounter++}`;
    nodes.push({
      id,
      position: { x, y },
      data: { label },
      style: {
          background: "#ffffff", // ADDED
          color: "#000000", // ADDED: makes text visible
          border: "1px solid #444",
          padding: 10,
          borderRadius: 8,
        },
    });
    return id;
  }

  // ADDED: root node
  const rootId = createNode(data.root || "Main Topic", 400, 50);

  const level1 = data.children || [];
  const level1Spacing = 250;
  const startX1 = 400 - ((level1.length - 1) * level1Spacing) / 2;

  level1.forEach((child, i) => {
    const childX = startX1 + i * level1Spacing;
    const childY = 220;
    const childId = createNode(child.label, childX, childY);

    edges.push({
      id: `${rootId}-${childId}`,
      source: rootId,
      target: childId,
    });

    const grandchildren = child.children || [];
    const level2Spacing = 170;
    const startX2 = childX - ((grandchildren.length - 1) * level2Spacing) / 2;

    grandchildren.forEach((grandchild, j) => {
      const grandchildX = startX2 + j * level2Spacing;
      const grandchildY = 390;
      const grandchildId = createNode(grandchild.label, grandchildX, grandchildY);

      edges.push({
        id: `${childId}-${grandchildId}`,
        source: childId,
        target: grandchildId,
      });
    });
  });

  return { nodes, edges };
}

export default function MindMapFlow({ mindMap }) {
  const initialFlow = useMemo(() => {
    return mindMapToFlow(mindMap);
  }, [mindMap]);

  const [nodes, setNodes] = useState(initialFlow.nodes);
  const [edges, setEdges] = useState(initialFlow.edges);

  const onNodesChange = useCallback(
    (changes) => setNodes((snapshot) => applyNodeChanges(changes, snapshot)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((snapshot) => applyEdgeChanges(changes, snapshot)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((snapshot) => addEdge(params, snapshot)),
    []
  );

  return (
    <div className="h-[700px] w-full rounded-3xl border border-white/10 bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}