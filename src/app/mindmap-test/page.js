"use client";

import { useState } from "react";
import MindMapFlow from "@/components/MindMapFlow";

export default function MindMapTestPage() {
  const [transcript, setTranscript] = useState("");
  const [mindMap, setMindMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      setMindMap(null);

      const res = await fetch("/api/generate/mindmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate mind map");
      }

      setMindMap(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold">Mind Map Prototype</h1>
          <p className="mt-2 text-slate-300">
            Paste a transcript and generate a React Flow mind map.
          </p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste transcript here..."
            className="mt-4 h-56 w-full rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-white outline-none"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !transcript.trim()}
            className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Mind Map"}
          </button>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}
        </div>

        {mindMap && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold">Generated JSON</h2>
              <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
                {JSON.stringify(mindMap, null, 2)}
              </pre>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold">React Flow Mind Map</h2>
              <div className="mt-4">
                <MindMapFlow mindMap={mindMap} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}