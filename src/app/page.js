"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState("");
  const [totals, setTotals] = useState({ lectures: 0, flashcards: 0, mindMaps: 0 });

  const [className, setClassName] = useState("");
  const [professor, setProfessor] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [classError, setClassError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setClasses([]);
      return;
    }

    setLoadingClasses(true);
    setClassesError("");

    const q = query(
      collection(db, "users", user.uid, "classes"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const classDocs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Untitled Class",
            professor: data.professor || "No professor",
          };
        });

        const lectureSnapshots = await Promise.all(
          classDocs.map((c) =>
            getDocs(collection(db, "users", user.uid, "classes", c.id, "lectures"))
          )
        );

        let totalFlashcards = 0;
        let totalMindMaps = 0;
        lectureSnapshots.forEach((snap) => {
          snap.docs.forEach((d) => {
            const data = d.data();
            totalFlashcards += Array.isArray(data.flashcards) ? data.flashcards.length : 0;
            totalMindMaps += data.mindmapData?.root ? 1 : 0;
          });
        });

        setTotals({
          lectures: lectureSnapshots.reduce((s, snap) => s + snap.size, 0),
          flashcards: totalFlashcards,
          mindMaps: totalMindMaps,
        });

        setClasses(
          classDocs.map((c, i) => {
            const snap = lectureSnapshots[i];
            const withTranscript = snap.docs.filter((d) => !!d.data().transcript).length;
            const withMaterials = snap.docs.filter((d) => {
              const data = d.data();
              return (
                data.summary ||
                (Array.isArray(data.flashcards) && data.flashcards.length > 0) ||
                (Array.isArray(data.quizQuestions) && data.quizQuestions.length > 0) ||
                data.mindmapData?.root
              );
            }).length;
            return { ...c, lectures: snap.size, withTranscript, withMaterials };
          })
        );
        setLoadingClasses(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setClassesError("Failed to load classes. Please refresh.");
        setLoadingClasses(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  async function handleCreateClass() {
    if (!user) return;
    if (!className.trim() || !professor.trim()) {
      setClassError("Please enter both class name and professor.");
      return;
    }

    setCreatingClass(true);
    setClassError("");

    try {
      await addDoc(collection(db, "users", user.uid, "classes"), {
        name: className.trim(),
        professor: professor.trim(),
        lectures: 0,
        createdAt: serverTimestamp(),
      });
      setClassName("");
      setProfessor("");
    } catch (error) {
      setClassError(error.message);
    } finally {
      setCreatingClass(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <section className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-7xl flex-col px-6 py-10 lg:px-10">

        <header className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                Cognitra Dashboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                Turn every lecture into a smarter way to study.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Record or upload lectures, then generate summaries, flashcards, quizzes, and mind maps.
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3">
              <StatCard label="Classes" value={classes.length} />
              <StatCard label="Lectures" value={totals.lectures} />
              <StatCard label="Flashcards" value={totals.flashcards} />
              <StatCard label="Mind Maps" value={totals.mindMaps} />
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-zinc-50">Your Classes</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Track progress across all your courses — from raw recordings to full study materials.
              </p>
            </div>

            {loadingAuth || loadingClasses ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-zinc-500">
                Loading...
              </div>
            ) : !user ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-8 text-center">
                <p className="text-zinc-300">Sign in to view and manage your classes.</p>
                <p className="mt-2 text-sm text-zinc-500">Use the Sign In button in the top right.</p>
              </div>
            ) : classesError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
                {classesError}
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-8 text-center">
                <p className="text-zinc-300">No classes yet.</p>
                <p className="mt-2 text-sm text-zinc-500">Create your first class using the panel on the right.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {classes.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-semibold text-zinc-50">{course.name}</h3>
                        <p className="mt-0.5 text-sm text-zinc-400">{course.professor}</p>
                      </div>
                      <Link
                        href={`/classes/${course.id}`}
                        className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
                      >
                        Open →
                      </Link>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span>
                        <span className="font-semibold text-zinc-200">{course.lectures}</span> lectures
                      </span>
                      <span>
                        <span className="font-semibold text-zinc-200">{course.withTranscript}</span> transcribed
                      </span>
                      <span>
                        <span className="font-semibold text-zinc-200">{course.withMaterials}</span> with materials
                      </span>
                    </div>

                    {course.lectures > 0 && (
                      <div className="mt-3">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-700">
                          <div
                            className="h-1 rounded-full bg-violet-500 transition-all"
                            style={{ width: `${Math.round((course.withMaterials / course.lectures) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-right text-xs text-zinc-600">
                          {Math.round((course.withMaterials / course.lectures) * 100)}% have materials
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            {user ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-zinc-50">New Class</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Add a course to start organizing its lectures and study materials.
                </p>

                <div className="mt-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Class name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  />
                  <input
                    type="text"
                    placeholder="Professor"
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                  />
                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass || !className.trim() || !professor.trim()}
                    className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingClass ? "Creating..." : "Create Class"}
                  </button>
                  {classError && (
                    <p className="text-sm text-red-400">{classError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-zinc-50">Get Started</h2>
                <p className="mt-3 text-sm text-zinc-400">
                  Sign in to create classes and start turning lectures into study materials.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-50">Study pipeline</h2>
              <p className="mt-1 text-sm text-zinc-500">Every lecture follows the same path.</p>
              <ol className="mt-5 space-y-3">
                {[
                  ["Record or upload", "Capture your lecture audio directly or import a file."],
                  ["Auto-transcribe", "Cognitra turns audio into a searchable transcript."],
                  ["Generate materials", "Summary, flashcards, quiz, and mind map — one click each."],
                  ["Study smarter", "Review and practice from materials built for your content."],
                ].map(([title, desc], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-semibold text-violet-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
    </div>
  );
}
