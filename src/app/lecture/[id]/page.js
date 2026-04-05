"use client";

import Link from "next/link";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import MindMapFlow from "@/components/MindMapFlow";

function LecturePageInner({ lectureId }) {
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [lecture, setLecture] = useState(null);
  const [classData, setClassData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [activeTab, setActiveTab] = useState("summary");
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function load() {
      if (!user?.uid) { setPageLoading(false); return; }
      if (!classId) {
        setPageError("Missing class ID. Please open this lecture from the class workspace.");
        setPageLoading(false);
        return;
      }
      try {
        setPageLoading(true);
        setPageError("");
        const classRef = doc(db, "users", user.uid, "classes", classId);
        const lectureRef = doc(db, "users", user.uid, "classes", classId, "lectures", lectureId);
        const [classSnap, lectureSnap] = await Promise.all([getDoc(classRef), getDoc(lectureRef)]);
        if (!lectureSnap.exists()) { setPageError("Lecture not found."); setPageLoading(false); return; }
        setClassData(classSnap.exists() ? { id: classSnap.id, ...classSnap.data() } : null);
        setLecture({ id: lectureSnap.id, ...lectureSnap.data() });
      } catch (error) {
        console.error(error);
        setPageError("Failed to load lecture.");
      } finally {
        setPageLoading(false);
      }
    }
    if (!loadingAuth) load();
  }, [user, loadingAuth, classId, lectureId]);

  async function generate(type) {
    if (!lecture?.transcript) {
      alert("This lecture has no transcript yet. Please record or upload audio in the class workspace first.");
      return;
    }
    setGenerating(type);
    try {
      const res = await fetch(`/api/generate/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: lecture.transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to generate ${type}`);

      const lectureRef = doc(db, "users", user.uid, "classes", classId, "lectures", lectureId);
      let firestoreUpdate = { updatedAt: serverTimestamp() };
      let localUpdate = {};

      if (type === "summary") { firestoreUpdate.summary = data; localUpdate.summary = data; }
      else if (type === "flashcards") { firestoreUpdate.flashcards = data.flashcards; localUpdate.flashcards = data.flashcards; }
      else if (type === "quiz") { firestoreUpdate.quizQuestions = data.questions; localUpdate.quizQuestions = data.questions; }
      else if (type === "mindmap") { firestoreUpdate.mindmapData = data; localUpdate.mindmapData = data; }

      await updateDoc(lectureRef, firestoreUpdate);
      setLecture((prev) => ({ ...prev, ...localUpdate }));
      setActiveTab(type);
    } catch (error) {
      console.error(error);
      alert(error.message || `Failed to generate ${type}`);
    } finally {
      setGenerating(null);
    }
  }

  if (loadingAuth || pageLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <p className="text-zinc-500">Loading lecture...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <h1 className="text-3xl font-bold">Please log in</h1>
        <Link href="/" className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Back Home</Link>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <h1 className="text-3xl font-bold">Error</h1>
        <p className="mt-3 text-zinc-400">{pageError}</p>
        <Link href="/" className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Back Home</Link>
      </main>
    );
  }

  if (!lecture) return null;

  const hasTranscript = !!lecture.transcript;
  const hasSummary = !!lecture.summary && typeof lecture.summary === "object";
  const hasFlashcards = Array.isArray(lecture.flashcards) && lecture.flashcards.length > 0;
  const hasQuiz = Array.isArray(lecture.quizQuestions) && lecture.quizQuestions.length > 0;
  const hasMindmap = !!lecture.mindmapData?.root;

  const tabs = [
    { key: "summary", label: "Summary", has: hasSummary },
    { key: "flashcards", label: "Flashcards", has: hasFlashcards },
    { key: "quiz", label: "Quiz", has: hasQuiz },
    { key: "mindmap", label: "Mind Map", has: hasMindmap },
    { key: "transcript", label: "Transcript", has: hasTranscript },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <div className="mb-6 flex items-center gap-3">
          {classId && (
            <Link
              href={`/classes/${classId}`}
              className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              ← Back to Class
            </Link>
          )}
          {classData && <span className="text-sm text-zinc-500">{classData.name}</span>}
        </div>

        <header className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                Lecture
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
                {lecture.title || "Untitled Lecture"}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                {lecture.dateLabel || "No date"} · {lecture.durationLabel || "0 min"}
              </p>
            </div>
            <StatusPill status={lecture.status || "Draft"} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <ContentBadge label="Transcript" active={hasTranscript} />
            <ContentBadge label="Summary" active={hasSummary} />
            <ContentBadge label={`${lecture.flashcards?.length || 0} Flashcards`} active={hasFlashcards} />
            <ContentBadge label={`${lecture.quizQuestions?.length || 0} Quiz Questions`} active={hasQuiz} />
            <ContentBadge label="Mind Map" active={hasMindmap} />
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {tab.label}
              {tab.has && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          {activeTab === "summary" && (
            <TabShell title="Summary" description="A structured overview of the lecture with key points and conclusion." hasContent={hasSummary} hasTranscript={hasTranscript} isGenerating={generating === "summary"} onGenerate={() => generate("summary")}>
              {hasSummary && <SummaryView data={lecture.summary} />}
            </TabShell>
          )}
          {activeTab === "flashcards" && (
            <TabShell title="Flashcards" description="Study core concepts with generated flip cards." hasContent={hasFlashcards} hasTranscript={hasTranscript} isGenerating={generating === "flashcards"} onGenerate={() => generate("flashcards")}>
              {hasFlashcards && <FlashcardsView cards={lecture.flashcards} />}
            </TabShell>
          )}
          {activeTab === "quiz" && (
            <TabShell title="Quiz" description="Multiple-choice questions to test your understanding." hasContent={hasQuiz} hasTranscript={hasTranscript} isGenerating={generating === "quiz"} onGenerate={() => generate("quiz")}>
              {hasQuiz && <QuizView questions={lecture.quizQuestions} />}
            </TabShell>
          )}
          {activeTab === "mindmap" && (
            <TabShell title="Mind Map" description="Visual representation of the lecture structure." hasContent={hasMindmap} hasTranscript={hasTranscript} isGenerating={generating === "mindmap"} onGenerate={() => generate("mindmap")}>
              {hasMindmap && (
                <div style={{ height: 600 }} className="overflow-hidden rounded-xl border border-zinc-700">
                  <MindMapFlow mindMap={lecture.mindmapData} />
                </div>
              )}
            </TabShell>
          )}
          {activeTab === "transcript" && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-zinc-50">Transcript</h2>
              {hasTranscript ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{lecture.transcript}</p>
              ) : (
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-8 text-center">
                  <p className="text-zinc-400">No transcript yet.</p>
                  <p className="mt-2 text-sm text-zinc-500">Record or upload audio in the class workspace to generate a transcript.</p>
                  {classId && (
                    <Link href={`/classes/${classId}`} className="mt-4 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                      Go to Class Workspace
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LecturePage({ params }) {
  const { id: lectureId } = use(params);
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <p className="text-zinc-500">Loading...</p>
      </main>
    }>
      <LecturePageInner lectureId={lectureId} />
    </Suspense>
  );
}

function TabShell({ title, description, hasContent, hasTranscript, isGenerating, onGenerate, children }) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        {hasContent && (
          <button
            onClick={onGenerate}
            disabled={isGenerating || !hasTranscript}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Regenerating..." : "Regenerate"}
          </button>
        )}
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <p className="text-zinc-400">Generating {title.toLowerCase()}...</p>
        </div>
      )}

      {!isGenerating && !hasContent && (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 px-8 py-6">
            <p className="font-medium text-zinc-200">No {title.toLowerCase()} yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              {hasTranscript
                ? "Ready to generate from your transcript."
                : "Add a transcript first — record or upload audio in the class workspace."}
            </p>
            {hasTranscript && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="mt-4 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                Generate {title}
              </button>
            )}
          </div>
        </div>
      )}

      {!isGenerating && hasContent && children}
    </div>
  );
}

function SummaryView({ data }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-zinc-50">{data.title}</h3>
      <p className="leading-7 text-zinc-300">{data.overview}</p>
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Key Points</p>
        <ul className="space-y-2">
          {data.keyPoints?.map((point, i) => (
            <li key={i} className="flex gap-3 text-zinc-300">
              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
              <span className="leading-7">{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">Conclusion</p>
        <p className="leading-7 text-zinc-300">{data.conclusion}</p>
      </div>
    </div>
  );
}

function FlashcardsView({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  function goTo(nextIndex) { setIndex(nextIndex); setFlipped(false); }
  if (!cards?.length) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-zinc-500">{index + 1} / {cards.length}</p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-800 p-10 text-center transition hover:border-zinc-600 active:scale-[0.99]"
        style={{ minHeight: 220 }}
      >
        <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{flipped ? "Answer" : "Question"}</p>
        <p className="text-xl font-semibold leading-8 text-zinc-50">{flipped ? cards[index].back : cards[index].front}</p>
        <p className="mt-6 text-xs text-zinc-600">Click to {flipped ? "see question" : "reveal answer"}</p>
      </button>

      <div className="flex gap-3">
        <button onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40">Previous</button>
        <button onClick={() => goTo(Math.min(cards.length - 1, index + 1))} disabled={index === cards.length - 1} className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40">Next</button>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {cards.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`h-2 w-2 rounded-full transition ${i === index ? "bg-violet-400" : "bg-zinc-600 hover:bg-zinc-500"}`} />
        ))}
      </div>
    </div>
  );
}

function QuizView({ questions }) {
  const [selected, setSelected] = useState({});
  const [revealed, setRevealed] = useState({});
  if (!questions?.length) return null;

  const score = Object.keys(revealed).filter((i) => selected[i] === questions[i].answer).length;
  const total = Object.keys(revealed).length;

  return (
    <div className="space-y-6">
      {total > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-center">
          <p className="text-sm text-zinc-400">Score so far: <span className="font-semibold text-zinc-50">{score} / {total}</span> revealed</p>
        </div>
      )}

      {questions.map((q, i) => {
        const isRevealed = !!revealed[i];
        return (
          <div key={i} className="rounded-xl border border-zinc-700 bg-zinc-800 p-5">
            <p className="mb-4 font-semibold text-zinc-50">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const isSelected = selected[i] === opt;
                const isCorrect = opt === q.answer;
                let cls = "w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ";
                if (isRevealed) {
                  if (isCorrect) cls += "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-medium";
                  else if (isSelected) cls += "border-red-500/20 bg-red-500/10 text-red-400 line-through";
                  else cls += "border-zinc-700 bg-zinc-900 text-zinc-500";
                } else {
                  cls += isSelected
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-700";
                }
                return (
                  <button key={j} onClick={() => !isRevealed && setSelected((prev) => ({ ...prev, [i]: opt }))} className={cls}>{opt}</button>
                );
              })}
            </div>

            {!isRevealed ? (
              <button
                onClick={() => setRevealed((prev) => ({ ...prev, [i]: true }))}
                disabled={!selected[i]}
                className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check Answer
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <p className="mb-1 text-xs text-zinc-500">Explanation</p>
                <p className="text-sm leading-6 text-zinc-300">{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }) {
  const styles =
    status === "Processed"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "Processing"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
      : "border-zinc-600 bg-zinc-700 text-zinc-400";
  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>;
}

function ContentBadge({ label, active }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>
      {label}
    </span>
  );
}
