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
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <section className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-7xl flex-col px-6 py-10 lg:px-10">

        <header className="mb-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                Cognitra Dashboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                Turn every lecture into a smarter way to study.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
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
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-stone-900">Your Classes</h2>
              <p className="mt-1 text-sm text-stone-500">
                Each class stores its own lectures, summaries, flashcards, quizzes, and mind maps.
              </p>
            </div>

            {loadingAuth || loadingClasses ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-stone-500">
                Loading...
              </div>
            ) : !user ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-stone-700">Sign in to view and manage your classes.</p>
                <p className="mt-2 text-sm text-stone-500">Use the Sign In button in the top right.</p>
              </div>
            ) : classesError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
                {classesError}
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-stone-700">No classes yet.</p>
                <p className="mt-2 text-sm text-stone-500">Create your first class using the panel on the right.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {classes.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{course.name}</h3>
                        <p className="mt-0.5 text-sm text-stone-500">{course.professor}</p>
                      </div>
                      <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                        {course.lectures} lectures
                      </span>
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/classes/${course.id}`}
                        className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                      >
                        Open Class
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            {user ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-stone-900">New Class</h2>
                <p className="mt-2 text-sm text-stone-500">
                  Add a course to start organizing its lectures and study materials.
                </p>

                <div className="mt-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Class name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                  <input
                    type="text"
                    placeholder="Professor"
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass || !className.trim() || !professor.trim()}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingClass ? "Creating..." : "Create Class"}
                  </button>
                  {classError && (
                    <p className="text-sm text-red-600">{classError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-stone-900">Get Started</h2>
                <p className="mt-3 text-sm text-stone-500">
                  Sign in to create classes and start turning lectures into study materials.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-stone-900">What you get</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Summaries", "Short and detailed overviews of each lecture."],
                  ["Flashcards", "Quick review cards generated from the content."],
                  ["Quizzes", "Practice questions with answers and explanations."],
                  ["Mind Maps", "Visual concept structures for better understanding."],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="font-semibold text-stone-900">{title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-stone-500">{description}</p>
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
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}
