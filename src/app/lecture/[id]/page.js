"use client";

import Link from "next/link";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { auth, db } from "@/lib/firebase";
import MindMapFlow from "@/components/MindMapFlow";
import NotebookView from "@/components/NotebookView";

function LecturePageInner({ lectureId }) {
  const { t } = useTranslation();
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
      if (!user?.uid) {
        setPageLoading(false);
        return;
      }
      if (!classId) {
        setPageError(t("lecture.missingClassId"));
        setPageLoading(false);
        return;
      }

      try {
        setPageLoading(true);
        setPageError("");

        const classRef = doc(db, "users", user.uid, "classes", classId);
        const lectureRef = doc(db, "users", user.uid, "classes", classId, "lectures", lectureId);

        const [classSnap, lectureSnap] = await Promise.all([
          getDoc(classRef),
          getDoc(lectureRef),
        ]);

        if (!lectureSnap.exists()) {
          setPageError(t("lecture.notFound"));
          setPageLoading(false);
          return;
        }

        setClassData(classSnap.exists() ? { id: classSnap.id, ...classSnap.data() } : null);
        setLecture({ id: lectureSnap.id, ...lectureSnap.data() });
      } catch (error) {
        console.error(error);
        setPageError(t("lecture.loadError"));
      } finally {
        setPageLoading(false);
      }
    }

    if (!loadingAuth) load();
  }, [user, loadingAuth, classId, lectureId, t]);

  async function generate(type) {
    if (!lecture?.transcript) {
      alert(t("lecture.noTranscriptAlert"));
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
      if (!res.ok) throw new Error(data.error || t("lecture.generateError", { type }));

      const lectureRef = doc(db, "users", user.uid, "classes", classId, "lectures", lectureId);
      let firestoreUpdate = { updatedAt: serverTimestamp() };
      let localUpdate = {};

      if (type === "summary") {
        firestoreUpdate.summary = data;
        localUpdate.summary = data;
      } else if (type === "flashcards") {
        firestoreUpdate.flashcards = data.flashcards;
        localUpdate.flashcards = data.flashcards;
      } else if (type === "quiz") {
        firestoreUpdate.quizQuestions = data.questions;
        localUpdate.quizQuestions = data.questions;
      } else if (type === "mindmap") {
        firestoreUpdate.mindmapData = data;
        localUpdate.mindmapData = data;
      } else if (type === "notebook") {
        firestoreUpdate.notebookData = data;
        localUpdate.notebookData = data;
      }

      await updateDoc(lectureRef, firestoreUpdate);
      setLecture((prev) => ({ ...prev, ...localUpdate }));
      setActiveTab(type);
    } catch (error) {
      console.error(error);
      alert(error.message || t("lecture.generateError", { type }));
    } finally {
      setGenerating(null);
    }
  }

  if (loadingAuth || pageLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <p className="text-slate-400">{t("lecture.loadingLecture")}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold">{t("auth.pleaseLogIn")}</h1>
        <Link href="/" className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
          {t("navigation.backHome")}
        </Link>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold">{t("messages.error")}</h1>
        <p className="mt-3 text-slate-400">{pageError}</p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
          {t("navigation.backHome")}
        </Link>
      </main>
    );
  }

  if (!lecture) return null;

  const hasTranscript = !!lecture.transcript;
  const hasSummary = !!lecture.summary && typeof lecture.summary === "object";
  const hasFlashcards = Array.isArray(lecture.flashcards) && lecture.flashcards.length > 0;
  const hasQuiz = Array.isArray(lecture.quizQuestions) && lecture.quizQuestions.length > 0;
  const hasMindmap = !!lecture.mindmapData?.root;
  const hasNotebook = !!lecture.notebookData?.pages?.length;

  const tabs = [
    { key: "summary", label: t("lecture.tabs.summary"), has: hasSummary },
    { key: "flashcards", label: t("lecture.tabs.flashcards"), has: hasFlashcards },
    { key: "quiz", label: t("lecture.tabs.quiz"), has: hasQuiz },
    { key: "mindmap", label: t("lecture.tabs.mindmap"), has: hasMindmap },
    { key: "notebook", label: t("lecture.tabs.notebook"), has: hasNotebook },
    { key: "transcript", label: t("lecture.tabs.transcript"), has: hasTranscript },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-100px] top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <div className="mb-6 flex items-center gap-3">
          {classId && (
            <Link
              href={`/classes/${classId}`}
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {t("navigation.backToClass")}
            </Link>
          )}
          {classData && (
            <span className="text-sm text-slate-500">{classData.name}</span>
          )}
        </div>

        <header className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {t("lecture.label")}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {lecture.title || t("lecture.untitledLecture")}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {lecture.dateLabel || t("lecture.noDate")} · {lecture.durationLabel || "0 min"}
              </p>
            </div>
            <StatusPill status={lecture.status || "Draft"} label={t(`statuses.${lecture.status || "Draft"}`, { defaultValue: lecture.status || "Draft" })} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ContentBadge label={t("lecture.content.transcript")} active={hasTranscript} />
            <ContentBadge label={t("lecture.content.summary")} active={hasSummary} />
            <ContentBadge label={t("lecture.content.flashcardsCount", { count: lecture.flashcards?.length || 0 })} active={hasFlashcards} />
            <ContentBadge label={t("lecture.content.quizQuestionsCount", { count: lecture.quizQuestions?.length || 0 })} active={hasQuiz} />
            <ContentBadge label={t("lecture.content.mindMap")} active={hasMindmap} />
            <ContentBadge label={t("lecture.content.notebook")} active={hasNotebook} />
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative rounded-2xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-white text-slate-950"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
              {tab.has && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          {activeTab === "summary" && (
            <TabShell
              title={t("lecture.tabs.summary")}
              description={t("lecture.descriptions.summary")}
              hasContent={hasSummary}
              hasTranscript={hasTranscript}
              isGenerating={generating === "summary"}
              onGenerate={() => generate("summary")}
            >
              {hasSummary && <SummaryView data={lecture.summary} />}
            </TabShell>
          )}

          {activeTab === "flashcards" && (
            <TabShell
              title={t("lecture.tabs.flashcards")}
              description={t("lecture.descriptions.flashcards")}
              hasContent={hasFlashcards}
              hasTranscript={hasTranscript}
              isGenerating={generating === "flashcards"}
              onGenerate={() => generate("flashcards")}
            >
              {hasFlashcards && <FlashcardsView cards={lecture.flashcards} />}
            </TabShell>
          )}

          {activeTab === "quiz" && (
            <TabShell
              title={t("lecture.tabs.quiz")}
              description={t("lecture.descriptions.quiz")}
              hasContent={hasQuiz}
              hasTranscript={hasTranscript}
              isGenerating={generating === "quiz"}
              onGenerate={() => generate("quiz")}
            >
              {hasQuiz && <QuizView questions={lecture.quizQuestions} />}
            </TabShell>
          )}

          {activeTab === "mindmap" && (
            <TabShell
              title={t("lecture.tabs.mindmap")}
              description={t("lecture.descriptions.mindmap")}
              hasContent={hasMindmap}
              hasTranscript={hasTranscript}
              isGenerating={generating === "mindmap"}
              onGenerate={() => generate("mindmap")}
            >
              {hasMindmap && (
                <div style={{ height: 600 }} className="rounded-2xl overflow-hidden border border-white/10">
                  <MindMapFlow mindMap={lecture.mindmapData} />
                </div>
              )}
            </TabShell>
          )}

          {activeTab === "notebook" && (
            <TabShell
              title={t("lecture.tabs.notebook")}
              description={t("lecture.descriptions.notebook")}
              hasContent={hasNotebook}
              hasTranscript={hasTranscript}
              isGenerating={generating === "notebook"}
              onGenerate={() => generate("notebook")}
            >
              {hasNotebook && (
                <NotebookView
                  notebookData={lecture.notebookData}
                  lectureId={lectureId}
                  classId={classId}
                  userId={user.uid}
                  initialHighlights={lecture.notebookHighlights || {}}
                  initialNotes={lecture.notebookNotes || []}
                />
              )}
            </TabShell>
          )}

          {activeTab === "transcript" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t("lecture.tabs.transcript")}</h2>
              {hasTranscript ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {lecture.transcript}
                </p>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
                  <p className="text-slate-400">{t("lecture.noTranscript")}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("lecture.noTranscriptDescription")}
                  </p>
                  {classId && (
                    <Link
                      href={`/classes/${classId}`}
                      className="mt-4 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      {t("lecture.goToClassWorkspace")}
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
  const { t } = useTranslation();
  const { id: lectureId } = use(params);
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <p className="text-slate-400">{t("messages.loading")}</p>
      </main>
    }>
      <LecturePageInner lectureId={lectureId} />
    </Suspense>
  );
}

function TabShell({ title, description, hasContent, hasTranscript, isGenerating, onGenerate, children }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !hasTranscript}
          className="shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={!hasTranscript ? t("lecture.transcriptRequiredTitle") : undefined}
        >
          {isGenerating ? t("lecture.generating") : hasContent ? t("lecture.regenerate") : t("lecture.generate")}
        </button>
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-slate-400">{t("lecture.generatingNamed", { title: title.toLowerCase() })}</p>
        </div>
      )}

      {!isGenerating && !hasContent && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-10 text-center">
          <p className="text-slate-400">{t("lecture.noGeneratedYet", { title: title.toLowerCase() })}</p>
          {hasTranscript ? (
            <p className="mt-2 text-sm text-slate-500">{t("lecture.clickGenerate")}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{t("lecture.transcriptRequired")}</p>
          )}
        </div>
      )}

      {!isGenerating && hasContent && children}
    </div>
  );
}

function SummaryView({ data }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-white">{data.title}</h3>
      <p className="leading-7 text-slate-300">{data.overview}</p>
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">
          {t("lecture.summary.keyPoints")}
        </p>
        <ul className="space-y-2">
          {data.keyPoints?.map((point, i) => (
            <li key={i} className="flex gap-3 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
              <span className="leading-7">{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          {t("lecture.summary.conclusion")}
        </p>
        <p className="leading-7 text-slate-300">{data.conclusion}</p>
      </div>
    </div>
  );
}

function FlashcardsView({ cards }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  function goTo(nextIndex) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  if (!cards?.length) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-slate-400">
        {index + 1} / {cards.length}
      </p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center transition hover:bg-slate-900 active:scale-[0.99]"
        style={{ minHeight: 220 }}
      >
        <p className="mb-4 text-xs uppercase tracking-widest text-slate-400">
          {flipped ? t("lecture.flashcards.answer") : t("lecture.flashcards.question")}
        </p>
        <p className="text-xl font-semibold leading-8 text-white">
          {flipped ? cards[index].back : cards[index].front}
        </p>
        <p className="mt-6 text-xs text-slate-500">
          {flipped ? t("lecture.flashcards.clickSeeQuestion") : t("lecture.flashcards.clickRevealAnswer")}
        </p>
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          {t("buttons.previous")}
        </button>
        <button
          onClick={() => goTo(Math.min(cards.length - 1, index + 1))}
          disabled={index === cards.length - 1}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          {t("buttons.next")}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "bg-cyan-400" : "bg-slate-600 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function QuizView({ questions }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState({});
  const [revealed, setRevealed] = useState({});

  if (!questions?.length) return null;

  const score = Object.keys(revealed).filter(
    (i) => selected[i] === questions[i].answer
  ).length;
  const total = Object.keys(revealed).length;

  return (
    <div className="space-y-6">
      {total > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center">
          <p className="text-sm text-slate-400">
            {t("lecture.quiz.scoreSoFar")}{" "}
            <span className="font-semibold text-white">
              {score} / {total}
            </span>{" "}
            {t("lecture.quiz.revealed")}
          </p>
        </div>
      )}

      {questions.map((q, i) => {
        const isRevealed = !!revealed[i];
        return (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
          >
            <p className="mb-4 font-semibold text-white">
              {i + 1}. {q.question}
            </p>

            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const isSelected = selected[i] === opt;
                const isCorrect = opt === q.answer;
                let cls =
                  "w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ";
                if (isRevealed) {
                  if (isCorrect)
                    cls +=
                      "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 font-medium";
                  else if (isSelected)
                    cls +=
                      "border-rose-400/30 bg-rose-400/10 text-rose-300 line-through";
                  else cls += "border-white/10 bg-white/5 text-slate-500";
                } else {
                  cls += isSelected
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10";
                }
                return (
                  <button
                    key={j}
                    onClick={() =>
                      !isRevealed &&
                      setSelected((prev) => ({ ...prev, [i]: opt }))
                    }
                    className={cls}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {!isRevealed ? (
              <button
                onClick={() =>
                  setRevealed((prev) => ({ ...prev, [i]: true }))
                }
                disabled={!selected[i]}
                className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("lecture.quiz.checkAnswer")}
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="mb-1 text-xs text-slate-400">{t("lecture.quiz.explanation")}</p>
                <p className="text-sm leading-6 text-slate-300">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status, label = status }) {
  const styles =
    status === "Processed"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : status === "Processing"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-white/5 text-slate-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function ContentBadge({ label, active }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-white/10 bg-white/5 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}
