"use client";

import { Handle, Position } from "@xyflow/react";

export default function MindMapNode({ id, data }) {
  const {
    label,
    shape = "rounded",
    color = "#0f172a",
    textColor = "#e2e8f0",
    borderColor = "#334155",
    width = 180,
    height = 56,
    fontSize = 14,
    onLabelChange,
    onDelete,
  } = data;

  let borderRadius = "14px";

  if (shape === "circle") {
    borderRadius = "9999px";
  }

  if (shape === "square") {
    borderRadius = "10px";
  }

  if (shape === "pill") {
    borderRadius = "999px";
  }

  return (
    <div
      style={{
        width,
        minHeight: height,
        background: color,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        gap: 8,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <textarea
        value={label} // ADDED: editable text
        onChange={(e) => onLabelChange?.(id, e.target.value)} // ADDED: update node label
        className="nodrag nopan resize-none rounded-md px-2 py-1 outline-none" // ADDED: prevents drag while typing
        style={{
          width: "100%",
          minHeight: shape === "circle" ? 50 : 42, // ADDED
          background: "transparent",
          color: textColor,
          border: "1px solid rgba(255,255,255,0.12)", // ADDED
          textAlign: "center",
          fontSize,
          fontWeight: 600,
        }}
      />

      <button
        onClick={() => onDelete?.(id)} // ADDED: delete current node
        className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-100 hover:bg-red-500/30" // ADDED
        type="button" // ADDED
      >
        Delete
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}