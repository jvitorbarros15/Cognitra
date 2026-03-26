"use client";

import { useCallback, useState, useEffect } from "react";
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
import MindMapNode from "./MindMapNode";

const nodeTypes = {
  mindMapNode: MindMapNode,
};


function mindMapToFlow(data, styleSettings, handleLabelChange, handleDeleteNode) {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;

  function createNode(label, x, y, level = 0, branchIndex = 0) {
  const id = `node-${nodeIdCounter++}`;

  const palette = [
    { color: "#06b6d4", textColor: "#082f49", borderColor: "#22d3ee" },
    { color: "#a855f7", textColor: "#f5f3ff", borderColor: "#c084fc" },
    { color: "#22c55e", textColor: "#052e16", borderColor: "#4ade80" },
    { color: "#f97316", textColor: "#431407", borderColor: "#fb923c" },
    { color: "#e11d48", textColor: "#fff1f2", borderColor: "#fb7185" },
  ];

  const monoPalette = { 
      root: { color: "#f8fafc", textColor: "#0f172a", borderColor: "#cbd5e1" },
      child: { color: "#0f172a", textColor: "#e2e8f0", borderColor: "#334155" },
      leaf: { color: "#1e293b", textColor: "#e2e8f0", borderColor: "#475569" },
    };
  
  let colors;

  if (styleSettings.colorMode === "mono") { 
      if (level === 0) colors = monoPalette.root;
      else if (level === 1) colors = monoPalette.child;
      else colors = monoPalette.leaf;
    } else {
      colors =
        level === 0
          ? { color: "#f8fafc", textColor: "#0f172a", borderColor: "#cbd5e1" }
          : palette[branchIndex % palette.length];
    }

  const branchStyle = palette[branchIndex % palette.length];

  let shape = "rounded";
  let width = 180;
  let height = 56;

  if (level === 0) {
      shape = styleSettings.rootShape; 
      width = shape === "circle" ? 150 : 220; 
      height = shape === "circle" ? 150 : 64; 
    } else if (level === 1) {
      shape = styleSettings.childShape;
      width = shape === "circle" ? 140 : 190; 
      height = shape === "circle" ? 140 : 56; 
    } else {
      shape = styleSettings.leafShape; 
      width = shape === "circle" ? 130 : 160; 
      height = shape === "circle" ? 130 : 56; 
    }


  nodes.push({
    id,
    type: "mindMapNode",
    position: { x, y },
    data: {
      label,
      shape,
      width,
      height,
      color: colors.color,
      textColor: colors.textColor,
      borderColor: colors.borderColor,
      fontSize: level === 0 ? 16 : 14,
      onLabelChange: handleLabelChange, 
      onDelete: handleDeleteNode, 
    },
  });

  return id;
}
  
  const safeData = data || { root: "Main Topic", children: [] };
  // create root node
  const rootId = createNode(safeData.root || "Main Topic", 400, 50, 0, 0); 

  const level1 = safeData.children || [];
  const level1Spacing = 250;
  const startX1 = 400 - ((level1.length - 1) * level1Spacing) / 2;

  level1.forEach((child, i) => {
    const childX = startX1 + i * level1Spacing;
    const childY = 220;
    const childId = createNode(child.label, childX, childY, 1, i); 

    edges.push({
      id: `${rootId}-${childId}`,
      source: rootId,
      target: childId,
      type: "smoothstep",
      animated: false,
    });

    const grandchildren = child.children || [];
    const level2Spacing = 170;
    const startX2 = childX - ((grandchildren.length - 1) * level2Spacing) / 2;

    grandchildren.forEach((grandchild, j) => {
      const grandchildX = startX2 + j * level2Spacing;
      const grandchildY = 390;
      const grandchildId = createNode(grandchild.label, grandchildX, grandchildY, 2, i); 

      edges.push({
        id: `${childId}-${grandchildId}`,
        source: childId,
        target: grandchildId,
        type: "smoothstep",
        animated: false,
      });
    });
  });

  return { nodes, edges };
}

export default function MindMapFlow({ mindMap }) {

  const [styleSettings, setStyleSettings] = useState({ 
    colorMode: "branch",
    rootShape: "pill",
    childShape: "rounded",
    leafShape: "circle",
  });

  const [nodes, setNodes] = useState([]); 
  const [edges, setEdges] = useState([]); 
  const [nextId, setNextId] = useState(1000); 

  const handleLabelChange = useCallback((nodeId, newLabel) => { 
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
              },
            }
          : node
      )
    );
  }, []);

  const handleDeleteNode = useCallback((nodeId) => { 
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
  }, []);

  const onEdgesDelete = useCallback((deletedEdges) => { 
    setEdges((prev) =>
        prev.filter((edge) => !deletedEdges.some((e) => e.id === edge.id))
    );
    }, []);

    const onReconnect = useCallback((oldEdge, newConnection) => { 
    setEdges((eds) =>
        eds.map((edge) =>
        edge.id === oldEdge.id
            ? { ...edge, ...newConnection }
            : edge
        )
    );
    }, []);

  const handleAddNode = useCallback(() => { 
    const id = `node-${nextId}`;

    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "mindMapNode",
        position: {
          x: 250 + Math.random() * 250,
          y: 180 + Math.random() * 250,
        },
        data: {
          label: "New Node",
          shape: styleSettings.leafShape,
          width: styleSettings.leafShape === "circle" ? 130 : 160,
          height: styleSettings.leafShape === "circle" ? 130 : 56,
          color: "#1e293b",
          textColor: "#e2e8f0",
          borderColor: "#475569",
          fontSize: 14,
          onLabelChange: handleLabelChange, 
          onDelete: handleDeleteNode, 
        },
      },
    ]);
    setNextId((id) => id + 1);
  }, [nextId, styleSettings.leafShape, handleLabelChange, handleDeleteNode]);

  useEffect(() => {
    const flow = mindMapToFlow(mindMap, styleSettings, handleLabelChange, handleDeleteNode);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [mindMap, styleSettings, handleLabelChange, handleDeleteNode]);

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
    <div className="w-full rounded-3xl border border-white/10 bg-slate-950 p-4">
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={styleSettings.colorMode}
          onChange={(e) =>
            setStyleSettings((prev) => ({
              ...prev,
              colorMode: e.target.value,
            }))
          }
          className="rounded-xl bg-slate-800 px-3 py-2 text-white"
        >
          <option value="branch">Colors by Branch</option>
          <option value="mono">Monochrome</option>
        </select>

        <select
          value={styleSettings.leafShape}
          onChange={(e) =>
            setStyleSettings((prev) => ({
              ...prev,
              leafShape: e.target.value,
            }))
          }
          className="rounded-xl bg-slate-800 px-3 py-2 text-white"
        >
          <option value="circle">Circle Leaves</option>
          <option value="rounded">Rounded Leaves</option>
          <option value="pill">Pill Leaves</option>
          <option value="square">Square Leaves</option>
        </select>

        <button
          onClick={handleAddNode} 
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
          type="button"
        >
          + Add Node
        </button>
      </div>

    <div className="h-[700px] w-full rounded-3xl border border-white/10 bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onReconnect={onReconnect}
        deleteKeyCode={["Backspace", "Delete"]} 
        edgesReconnectable={true}
        onConnect={onConnect}
        fitView
      >
        <Background color="#334155" gap={16} />
        <MiniMap
            nodeColor={(node) => node.data?.color || "#06b6d4"} 
            nodeStrokeColor="#1e293b" 
            nodeBorderRadius={4} 
            style={{
            backgroundColor: "#020617", 
            border: "1px solid #334155",
            }}
        />

        <Controls
            style={{
            background: "#020617",
            border: "1px solid #334155",
            color: "#9fa9b5", 
            }}
        />

      </ReactFlow>
    </div>
   </div>
  );
}