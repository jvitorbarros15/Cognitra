"use client";

import { Handle, Position } from "@xyflow/react";

export default function MindMapNode({ data }) {
  const {
    label,
    shape = "rounded",
    color = "#0f172a",
    textColor = "#e2e8f0",
    borderColor = "#334155",
    width = 180,
    height = 56,
    fontSize = 14,
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
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <span>{label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}