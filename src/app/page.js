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

const gradients = [
  "from-cyan-500/20 to-blue-500/20",
  "from-fuchsia-500/20 to-violet-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-pink-500/20 to-rose-500/20",
];

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
        const classDocs = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Untitled Class",
            professor: data.professor || "No professor",
            color: gradients[index % gradients.length],
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
        setClasses(classDocs.map((c, i) => ({ ...c, lectures: lectureSnapshots[i].size })));
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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-7xl flex-col px-6 py-10 lg:px-10">

        <header className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                Cognitra Dashboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Turn every lecture into a smarter way to study.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Organize your classes, record live lectures, and generate summaries, flashcards, quizzes, and mind maps.
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
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Your Classes</h2>
              <p className="mt-1 text-sm text-slate-400">
                Each class stores its own lectures, summaries, flashcards, quizzes, and mind maps.
              </p>
            </div>

            {loadingAuth || loadingClasses ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-400">
                Loading...
              </div>
            ) : !user ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
                <p className="text-slate-300">Sign in to view and manage your classes.</p>
                <p className="mt-2 text-sm text-slate-500">Use the Sign In button in the top right.</p>
              </div>
            ) : classesError ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-300">
                {classesError}
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
                <p className="text-slate-300">No classes yet.</p>
                <p className="mt-2 text-sm text-slate-500">Create your first class using the panel on the right.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {classes.map((course) => (
                  <div
                    key={course.id}
                    className={`rounded-3xl border border-white/10 bg-gradient-to-r ${course.color} p-[1px] transition hover:border-white/20`}
                  >
                    <div className="rounded-[calc(1.5rem-1px)] bg-slate-950/90 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{course.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">{course.professor}</p>
                        </div>
                        <span className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                          {course.lectures} lectures
                        </span>
                      </div>

                      <div className="mt-4">
                        <Link
                          href={`/classes/${course.id}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                        >
                          Open Class
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            {user ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="text-2xl font-semibold">New Class</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Add a course to start organizing its lectures and study materials.
                </p>

                <div className="mt-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Class name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  />
                  <input
                    type="text"
                    placeholder="Professor"
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                  />
                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass || !className.trim() || !professor.trim()}
                    className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingClass ? "Creating..." : "Create Class"}
                  </button>
                  {classError && (
                    <p className="text-sm text-red-300">{classError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="text-2xl font-semibold">Get Started</h2>
                <p className="mt-3 text-sm text-slate-400">
                  Sign in to create classes and start turning lectures into study materials.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">What you get</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Summaries", "Short and detailed overviews of each lecture."],
                  ["Flashcards", "Quick review cards generated from the content."],
                  ["Quizzes", "Practice questions with answers and explanations."],
                  ["Mind Maps", "Visual concept structures for better understanding."],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
