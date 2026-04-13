"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const HIGHLIGHT_BG = {
  yellow: "bg-yellow-200",
  green: "bg-green-200",
  pink: "bg-pink-200",
};

const HIGHLIGHT_COLORS = ["yellow", "green", "pink"];

const NOTE_BG = {
  yellow: "#fef9c3",
  green: "#dcfce7",
  pink: "#fce7f3",
};

// Given the plain text of a block and the highlights array for that block,
// return an array of segments: { text, hlId, color } where hlId is null for unhighlighted spans.
function segmentText(text, blockHighlights) {
  if (!blockHighlights || blockHighlights.length === 0) {
    return [{ text, hlId: null, color: null }];
  }

  // Build a per-character color map (last applied wins for overlapping ranges)
  const chars = new Array(text.length).fill(null); // null = no highlight
  const sorted = [...blockHighlights].sort((a, b) => a.start - b.start);
  for (const hl of sorted) {
    for (let i = hl.start; i < hl.end && i < text.length; i++) {
      chars[i] = { hlId: hl.id, color: hl.color };
    }
  }

  // Collapse into contiguous segments
  const segments = [];
  let i = 0;
  while (i < text.length) {
    const cur = chars[i];
    let j = i + 1;
    while (j < text.length && JSON.stringify(chars[j]) === JSON.stringify(cur)) {
      j++;
    }
    segments.push({
      text: text.slice(i, j),
      hlId: cur?.hlId ?? null,
      color: cur?.color ?? null,
    });
    i = j;
  }
  return segments;
}

function HighlightedText({ text, blockHighlights, blockId, onRemove }) {
  const segments = segmentText(text, blockHighlights);
  return (
    <>
      {segments.map((seg, i) =>
        seg.hlId ? (
          <mark
            key={i}
            className={`${HIGHLIGHT_BG[seg.color]} cursor-pointer rounded-sm px-0.5`}
            title="Click to remove highlight"
            onClick={() => onRemove(blockId, seg.hlId)}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

function NoteCard({ note, isActive, onActivate, onTextChange, onBlur, onDelete }) {
  return (
    <div
      className="notebook-note absolute z-10 w-44 rounded shadow-lg"
      style={{
        left: `${note.x}%`,
        top: `${note.y}%`,
        backgroundColor: NOTE_BG[note.color] || NOTE_BG.yellow,
        fontFamily: "'Caveat', cursive",
        fontSize: "15px",
        border: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="select-none text-xs text-slate-500">✏️ Note</span>
        <button
          onClick={onDelete}
          className="text-slate-400 hover:text-red-500 transition text-sm leading-none"
        >
          ×
        </button>
      </div>
      {isActive ? (
        <textarea
          autoFocus
          value={note.text}
          onChange={(e) => onTextChange(note.id, e.target.value)}
          onBlur={onBlur}
          className="w-full resize-none bg-transparent px-2 pb-2 text-slate-800 outline-none"
          rows={3}
          style={{ fontFamily: "'Caveat', cursive", fontSize: "15px" }}
        />
      ) : (
        <p
          onClick={onActivate}
          className="min-h-[52px] cursor-text whitespace-pre-wrap px-2 pb-2 text-slate-800"
        >
          {note.text || (
            <span className="italic text-slate-400">Click to write...</span>
          )}
        </p>
      )}
    </div>
  );
}

export default function NotebookView({
  notebookData,
  lectureId,
  classId,
  userId,
  initialHighlights,
  initialNotes,
}) {
  const [highlights, setHighlights] = useState(initialHighlights || {});
  const [notes, setNotes] = useState(initialNotes || []);
  const [mode, setMode] = useState("highlight");
  const [highlightPicker, setHighlightPicker] = useState(null);
  const [activeNote, setActiveNote] = useState(null);

  function getLectureRef() {
    return doc(db, "users", userId, "classes", classId, "lectures", lectureId);
  }

  // ── Highlighting ─────────────────────────────────────────────────────────

  function handleMouseUp() {
    if (mode !== "highlight") return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setHighlightPicker(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const blockSpan = range.startContainer.parentElement?.closest("[data-block-id]");
    if (!blockSpan) {
      setHighlightPicker(null);
      return;
    }

    const blockId = blockSpan.dataset.blockId;

    // Compute character offsets within the block span's text content
    const preRange = range.cloneRange();
    preRange.selectNodeContents(blockSpan);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + range.toString().length;

    if (start === end) {
      setHighlightPicker(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setHighlightPicker({
      blockId,
      start,
      end,
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 48,
    });

    selection.removeAllRanges();
  }

  async function applyHighlight(color) {
    if (!highlightPicker) return;
    const { blockId, start, end } = highlightPicker;
    const newHl = { id: `hl-${Date.now()}`, start, end, color };
    const updated = {
      ...highlights,
      [blockId]: [...(highlights[blockId] || []), newHl],
    };
    setHighlights(updated);
    setHighlightPicker(null);
    await updateDoc(getLectureRef(), { notebookHighlights: updated });
  }

  async function removeHighlight(blockId, hlId) {
    const updated = {
      ...highlights,
      [blockId]: (highlights[blockId] || []).filter((h) => h.id !== hlId),
    };
    setHighlights(updated);
    await updateDoc(getLectureRef(), { notebookHighlights: updated });
  }

  // ── Pencil notes ──────────────────────────────────────────────────────────

  function handlePageClick(e, pageNumber) {
    if (mode !== "pencil") return;
    if (e.target.closest(".notebook-note")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newNote = {
      id: `note-${Date.now()}`,
      pageNumber,
      x,
      y,
      text: "",
      color: "yellow",
    };
    const updated = [...notes, newNote];
    setNotes(updated);
    setActiveNote(newNote.id);
  }

  function updateNoteText(id, text) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  async function saveNotes(updatedNotes) {
    await updateDoc(getLectureRef(), { notebookNotes: updatedNotes });
  }

  async function handleNoteBlur() {
    setActiveNote(null);
    await saveNotes(notes);
  }

  async function deleteNote(id) {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    await saveNotes(updated);
  }

  // ── Content rendering ─────────────────────────────────────────────────────

  function renderSection(section, idx) {
    const blockHls = highlights[section.blockId] || [];

    if (section.type === "heading") {
      if (section.level === 1) {
        return (
          <h2
            key={idx}
            className="mt-6 mb-1 font-serif text-lg font-bold leading-8 text-slate-800"
          >
            {section.text}
          </h2>
        );
      }
      return (
        <h3
          key={idx}
          className="mt-4 mb-1 font-serif text-base font-semibold leading-8 text-slate-700"
        >
          {section.text}
        </h3>
      );
    }

    if (section.type === "paragraph") {
      return (
        <p key={idx} className="mb-0 font-serif text-sm leading-8 text-slate-800">
          <span data-block-id={section.blockId}>
            <HighlightedText
              text={section.text}
              blockHighlights={blockHls}
              blockId={section.blockId}
              onRemove={removeHighlight}
            />
          </span>
        </p>
      );
    }

    if (section.type === "bullets") {
      // For offset computation, items are joined by "\n" — must match blockSpan.textContent
      const joinedText = section.items.join("\n");
      const segments = segmentText(joinedText, blockHls);

      // Reconstruct per-item segments by splitting on "\n" boundaries
      const itemSegments = [];
      let remaining = segments.slice();
      let charPos = 0;

      for (let i = 0; i < section.items.length; i++) {
        const itemLen = section.items[i].length;
        const itemEnd = charPos + itemLen;
        const segsForItem = [];
        let offset = charPos;

        for (const seg of remaining) {
          if (offset >= itemEnd) break;
          const take = Math.min(seg.text.length, itemEnd - offset);
          segsForItem.push({ ...seg, text: seg.text.slice(0, take) });
          offset += take;
        }
        itemSegments.push(segsForItem);
        charPos = itemEnd + 1; // +1 for the "\n"
      }

      return (
        <ul key={idx} className="mb-0 font-serif text-sm leading-8 text-slate-800">
          <span data-block-id={section.blockId} className="contents">
            {section.items.map((item, iIdx) => (
              <li key={iIdx} className="flex gap-2 before:mt-[14px] before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-slate-500">
                {itemSegments[iIdx]?.map((seg, sIdx) =>
                  seg.hlId ? (
                    <mark
                      key={sIdx}
                      className={`${HIGHLIGHT_BG[seg.color]} cursor-pointer rounded-sm px-0.5`}
                      title="Click to remove highlight"
                      onClick={() => removeHighlight(section.blockId, seg.hlId)}
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={sIdx}>{seg.text}</span>
                  )
                ) ?? item}
              </li>
            ))}
          </span>
        </ul>
      );
    }

    if (section.type === "definition") {
      const fullText = `${section.term} — ${section.definition}`;
      return (
        <p key={idx} className="mb-0 font-serif text-sm leading-8 text-slate-800">
          <span data-block-id={section.blockId}>
            <HighlightedText
              text={fullText}
              blockHighlights={blockHls}
              blockId={section.blockId}
              onRemove={removeHighlight}
            />
          </span>
        </p>
      );
    }

    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex overflow-hidden rounded-xl border border-white/10">
          <button
            onClick={() => setMode("highlight")}
            className={`px-4 py-2 text-sm font-medium transition ${
              mode === "highlight"
                ? "bg-white text-slate-900"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🖊 Highlight
          </button>
          <button
            onClick={() => setMode("pencil")}
            className={`px-4 py-2 text-sm font-medium transition ${
              mode === "pencil"
                ? "bg-white text-slate-900"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            ✏️ Pencil Note
          </button>
        </div>
        <span className="text-sm text-slate-400">
          {mode === "highlight"
            ? "Select text on the page to highlight it"
            : "Click anywhere on the page to add a note"}
        </span>
        <span className="ml-auto text-sm text-slate-500">
          {notebookData.pages.length} page{notebookData.pages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Pages */}
      {notebookData.pages.map((page) => (
        <div key={page.pageNumber} className="mb-10">
          <p className="mb-2 text-center text-xs text-slate-500">
            — Page {page.pageNumber} —
          </p>

          {/* Paper */}
          <div
            tabIndex={0}
            className="relative mx-auto max-w-2xl rounded-sm outline-none"
            style={{
              backgroundColor: "#fafaf5",
              backgroundImage:
                "repeating-linear-gradient(transparent, transparent 31px, #c8d0e0 31px, #c8d0e0 32px)",
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.15), 0 10px 40px -5px rgba(0,0,0,0.18), 4px 0 8px -2px rgba(0,0,0,0.06)",
              paddingTop: "40px",
              paddingBottom: "40px",
              paddingRight: "32px",
              cursor: mode === "pencil" ? "crosshair" : "text",
            }}
            onMouseUp={handleMouseUp}
            onClick={(e) => handlePageClick(e, page.pageNumber)}
          >
            {/* Red margin line */}
            <div className="pointer-events-none absolute left-14 top-0 h-full w-px bg-red-300 opacity-50" />

            {/* Content */}
            <div className="pl-16">
              {page.sections.map((section, idx) => renderSection(section, idx))}
            </div>

            {/* Pencil notes for this page */}
            {notes
              .filter((n) => n.pageNumber === page.pageNumber)
              .map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isActive={activeNote === note.id}
                  onActivate={() => setActiveNote(note.id)}
                  onTextChange={updateNoteText}
                  onBlur={handleNoteBlur}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
          </div>
        </div>
      ))}

      {/* Highlight color picker (fixed position, floats over page) */}
      {highlightPicker && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-full border border-white/20 bg-slate-800 px-2 py-1.5 shadow-xl"
          style={{ left: highlightPicker.x - 56, top: highlightPicker.y }}
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              title={color}
              onClick={() => applyHighlight(color)}
              className={`h-6 w-6 rounded-full border-2 border-white/30 transition hover:scale-110 ${HIGHLIGHT_BG[color]}`}
            />
          ))}
          <button
            onClick={() => setHighlightPicker(null)}
            className="ml-1 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
