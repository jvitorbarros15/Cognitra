"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";


export default function ClassPage({ params }) {
  const { id: classId } = use(params);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [currentClass, setCurrentClass] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [activeView, setActiveView] = useState("lectures");
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingLectureTitle, setRecordingLectureTitle] = useState("");
  const [creatingLecture, setCreatingLecture] = useState(false);

  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadClassData() {
      if (!user?.uid) {
        setCurrentClass(null);
        setLectures([]);
        setPageLoading(false);
        return;
      }

      try {
        setPageLoading(true);
        setPageError("");

        const classRef = doc(db, "users", user.uid, "classes", classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
          setCurrentClass(null);
          setLectures([]);
          setPageLoading(false);
          return;
        }

        const classData = { id: classSnap.id, ...classSnap.data() };

        const lecturesRef = collection(db, "users", user.uid, "classes", classId, "lectures");
        const lecturesQuery = query(lecturesRef, orderBy("createdAt", "desc"));
        const lecturesSnap = await getDocs(lecturesQuery);

        const lecturesData = lecturesSnap.docs.map((lectureDoc) => {
          const data = lectureDoc.data();
          return {
            id: lectureDoc.id,
            title: data.title || "Untitled Lecture",
            date: data.dateLabel || "No date",
            duration: data.durationLabel || "0 min",
            status: data.status || "Draft",
            transcript: !!data.transcript,
            summary: !!data.summary,
            flashcards: Array.isArray(data.flashcards) ? data.flashcards.length : 0,
            quizzes: Array.isArray(data.quizQuestions) ? data.quizQuestions.length : 0,
            mindMaps: data.mindmap?.nodes?.length ? 1 : 0,
            hasRecording: !!data.audioFileUrl,
            raw: data,
          };
        });

        setCurrentClass(classData);
        setLectures(lecturesData);
      } catch (error) {
        console.error(error);
        setPageError("Failed to load this class.");
      } finally {
        setPageLoading(false);
      }
    }

    if (!loadingAuth) loadClassData();
  }, [user, loadingAuth, classId]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const totals = useMemo(() => {
    return lectures.reduce(
      (acc, lecture) => {
        acc.lectures += 1;
        acc.transcripts += lecture.transcript ? 1 : 0;
        acc.summaries += lecture.summary ? 1 : 0;
        acc.flashcards += lecture.flashcards || 0;
        acc.quizzes += lecture.quizzes || 0;
        acc.mindMaps += lecture.mindMaps || 0;
        return acc;
      },
      { lectures: 0, transcripts: 0, summaries: 0, flashcards: 0, quizzes: 0, mindMaps: 0 }
    );
  }, [lectures]);

  const filteredLectures = useMemo(() => {
    if (activeView === "lectures") return lectures;
    if (activeView === "mindmaps") return lectures.filter((l) => l.mindMaps > 0);
    if (activeView === "summaries") return lectures.filter((l) => l.summary);
    if (activeView === "flashcards") return lectures.filter((l) => l.flashcards > 0);
    if (activeView === "quizzes") return lectures.filter((l) => l.quizzes > 0);
    return lectures;
  }, [activeView, lectures]);

  const selectedLecture = lectures.find((l) => l.id === selectedLectureId) || null;
  const triggerUpload = () => fileInputRef.current?.click();

  async function sendAudioToBackend(file) {
    if (!selectedLectureId) {
      alert("Select a lecture first before adding audio.");
      return;
    }
    try {
      setAudioError("");
      setTranscript("");
      setIsProcessingAudio(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transcribe audio.");

      const transcriptText = data.text || "";
      setTranscript(transcriptText);

      const lectureRef = doc(db, "users", user.uid, "classes", classId, "lectures", selectedLectureId);
      await updateDoc(lectureRef, { transcript: transcriptText, status: "Processed", updatedAt: serverTimestamp() });

      setLectures((prev) =>
        prev.map((l) =>
          l.id === selectedLectureId
            ? { ...l, transcript: true, status: "Processed", raw: { ...l.raw, transcript: transcriptText } }
            : l
        )
      );
    } catch (error) {
      setAudioError(error.message || "Something went wrong while processing audio.");
    } finally {
      setIsProcessingAudio(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendAudioToBackend(file);
    e.target.value = "";
  }

  async function handleRecordClick() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      setAudioError("");
      setTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "lecture-recording.webm", { type: "audio/webm" });
        await sendAudioToBackend(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setAudioError("Could not access microphone.");
    }
  }

  async function createLecture() {
    if (!user?.uid) return;
    const title = recordingLectureTitle.trim();
    if (!title) { alert("Please enter a lecture title first."); return; }

    try {
      setCreatingLecture(true);
      const lecturesRef = collection(db, "users", user.uid, "classes", classId, "lectures");
      const newLecture = {
        title, status: "Draft", transcript: "", summary: "", flashcards: [], quizQuestions: [],
        mindmap: { nodes: [], edges: [] }, audioFileUrl: "", durationLabel: "0 min",
        dateLabel: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      const lectureRef = await addDoc(lecturesRef, newLecture);
      await updateDoc(doc(db, "users", user.uid, "classes", classId), { lectures: increment(1) });
      setLectures((prev) => [{ id: lectureRef.id, title, date: newLecture.dateLabel, duration: newLecture.durationLabel, status: newLecture.status, transcript: false, summary: false, flashcards: 0, quizzes: 0, mindMaps: 0, hasRecording: false, raw: newLecture }, ...prev]);
      setRecordingLectureTitle("");
      setSelectedLectureId(lectureRef.id);
    } catch (error) {
      console.error(error);
      alert("Failed to create lecture.");
    } finally {
      setCreatingLecture(false);
    }
  }

  if (loadingAuth || pageLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-7xl">
          <p className="text-zinc-500">Loading class...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Please log in</h1>
          <p className="mt-3 text-zinc-400">You need to sign in before viewing your classes.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800">Back Home</Link>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-zinc-400">{pageError}</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800">Back Home</Link>
        </div>
      </main>
    );
  }

  if (!currentClass) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Class not found</h1>
          <p className="mt-3 text-zinc-400">This class does not exist for your account.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800">Back Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10">
        <div className="mb-6">
          <Link href="/" className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100">
            ← Back to Classes
          </Link>
        </div>

        <header className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-sm">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                Class Workspace
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                {currentClass.name || "Untitled Class"}
              </h1>
              <p className="mt-3 text-base text-zinc-400">
                {currentClass.professor || "No professor"} · {currentClass.semester || "No semester"}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Manage lecture recordings, update audio, and access every transcript, summary, flashcard set, quiz, and mind map for this class in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Lectures" value={totals.lectures} />
              <StatCard label="Summaries" value={totals.summaries} />
              <StatCard label="Mind Maps" value={totals.mindMaps} />
              <StatCard label="Flashcards" value={totals.flashcards} />
              <StatCard label="Quizzes" value={totals.quizzes} />
              <StatCard label="Transcripts" value={totals.transcripts} />
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">Class Library</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Switch between lectures, mental maps, summaries, flashcards, and quizzes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["lectures", "Lectures"],
                  ["mindmaps", "Mind Maps"],
                  ["summaries", "Summaries"],
                  ["flashcards", "Flashcards"],
                  ["quizzes", "Quizzes"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveView(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      activeView === key
                        ? "bg-zinc-100 text-zinc-900"
                        : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredLectures.length === 0 ? (
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
                  <p className="text-lg font-semibold text-zinc-50">No lectures yet</p>
                  <p className="mt-2 text-sm text-zinc-400">Create your first lecture for this class on the right panel.</p>
                </div>
              ) : (
                filteredLectures.map((lecture) => (
                  <div key={lecture.id} className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition hover:border-zinc-600">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-zinc-50">{lecture.title}</h3>
                          <StatusPill status={lecture.status} />
                        </div>
                        <p className="mt-1.5 text-sm text-zinc-400">{lecture.date} · {lecture.duration}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <MiniBadge label={`${lecture.transcript ? 1 : 0} Transcript`} />
                          <MiniBadge label={`${lecture.summary ? 1 : 0} Summary`} />
                          <MiniBadge label={`${lecture.flashcards} Flashcards`} />
                          <MiniBadge label={`${lecture.quizzes} Quizzes`} />
                          <MiniBadge label={`${lecture.mindMaps} Mind Map`} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/lecture/${lecture.id}?classId=${classId}`}
                          className="rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-600"
                        >
                          Open Lecture
                        </Link>
                        <button
                          onClick={() => setSelectedLectureId(lecture.id)}
                          className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-400 transition hover:bg-violet-500/20"
                        >
                          Add Audio
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <FeatureCard title="Summary" text="Open the lecture summary and review the main takeaways." />
                      <FeatureCard title="Flashcards" text="Study core concepts with generated cards." />
                      <FeatureCard title="Quiz" text="Test yourself with questions and explanations." />
                      <FeatureCard title="Mind Map" text="Visualize the lecture structure and edit connections." />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-zinc-50">New Lecture</h2>
              <p className="mt-2 text-sm text-zinc-400">Create a lecture, then add audio to generate its transcript.</p>

              <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-5">
                <label className="text-sm font-medium text-zinc-300">Lecture title</label>
                <input
                  value={recordingLectureTitle}
                  onChange={(e) => setRecordingLectureTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createLecture()}
                  placeholder="Ex: Backpropagation and Training"
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                />
                <button
                  onClick={createLecture}
                  disabled={creatingLecture || !recordingLectureTitle.trim()}
                  className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingLecture ? "Creating..." : "Create Lecture"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-50">Add Audio</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {selectedLecture
                      ? `Attaching audio to: ${selectedLecture.title}`
                      : "Select a lecture from the list to add audio."}
                  </p>
                </div>
                {isRecording && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                    Recording
                  </span>
                )}
              </div>

              {selectedLecture ? (
                <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleRecordClick}
                      disabled={isProcessingAudio}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isRecording
                          ? "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-violet-600 text-white hover:bg-violet-700"
                      }`}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                    <button
                      onClick={triggerUpload}
                      disabled={isRecording || isProcessingAudio}
                      className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Audio File
                    </button>
                  </div>

                  <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />

                  {isProcessingAudio && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <p className="text-sm font-semibold text-amber-400">Transcribing audio...</p>
                      <p className="mt-1 text-xs text-amber-400/70">This may take a moment depending on length.</p>
                    </div>
                  )}
                  {audioError && (
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-400">Error</p>
                      <p className="mt-1 text-xs text-red-400/70">{audioError}</p>
                    </div>
                  )}
                  {transcript && (
                    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-sm font-semibold text-emerald-400">Transcript saved</p>
                      <p className="mt-2 line-clamp-4 text-xs leading-5 text-zinc-300">{transcript}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-950 p-5 text-center">
                  <p className="text-sm text-zinc-500">
                    Click <span className="font-medium text-zinc-300">Add Audio</span> on any lecture in the list to select it here.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-zinc-50">Everything in this Class</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <OutputTile title="All Lectures" value={totals.lectures} description="Every recording stored for this course." />
                <OutputTile title="All Summaries" value={totals.summaries} description="Quick understanding for each lecture." />
                <OutputTile title="All Flashcards" value={totals.flashcards} description="Review cards built from the most important concepts." />
                <OutputTile title="All Quizzes" value={totals.quizzes} description="Practice questions with answers and feedback." />
                <OutputTile title="All Mind Maps" value={totals.mindMaps} description="Editable concept maps for visual learning." />
                <OutputTile title="All Transcripts" value={totals.transcripts} description="Text extracted from lecture recordings." />
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
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
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
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
  );
}

function MiniBadge({ label }) {
  return (
    <span className="rounded-full border border-zinc-600 bg-zinc-700 px-3 py-1 text-xs text-zinc-300">{label}</span>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <p className="font-semibold text-zinc-50">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function OutputTile({ title, value, description }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-zinc-50">{title}</p>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <div className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-lg font-semibold text-zinc-50">{value}</div>
      </div>
    </div>
  );
}
