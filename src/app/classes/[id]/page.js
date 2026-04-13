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
  const recordingTimerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [currentClass, setCurrentClass] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [activeView, setActiveView] = useState("lectures");
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
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

        const classData = {
          id: classSnap.id,
          ...classSnap.data(),
        };

        const lecturesRef = collection(
          db,
          "users",
          user.uid,
          "classes",
          classId,
          "lectures"
        );

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

    if (!loadingAuth) {
      loadClassData();
    }
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
      {
        lectures: 0,
        transcripts: 0,
        summaries: 0,
        flashcards: 0,
        quizzes: 0,
        mindMaps: 0,
      }
    );
  }, [lectures]);

  const filteredLectures = useMemo(() => {
    if (activeView === "lectures") return lectures;
    if (activeView === "mindmaps") {
      return lectures.filter((lecture) => lecture.mindMaps > 0);
    }
    if (activeView === "summaries") {
      return lectures.filter((lecture) => lecture.summary);
    }
    if (activeView === "flashcards") {
      return lectures.filter((lecture) => lecture.flashcards > 0);
    }
    if (activeView === "quizzes") {
      return lectures.filter((lecture) => lecture.quizzes > 0);
    }
    return lectures;
  }, [activeView, lectures]);

  const selectedLecture =
    lectures.find((lecture) => lecture.id === selectedLectureId) || null;

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

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

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe audio.");
      }

      const transcriptText = data.text || "";

      if (!transcriptText.trim()) {
        throw new Error("No speech detected in the recording. Make sure your microphone is working and try speaking clearly.");
      }

      setTranscript(transcriptText);

      const lectureRef = doc(
        db,
        "users",
        user.uid,
        "classes",
        classId,
        "lectures",
        selectedLectureId
      );
      await updateDoc(lectureRef, {
        transcript: transcriptText,
        status: "Processed",
        updatedAt: serverTimestamp(),
      });

      setLectures((prev) =>
        prev.map((l) =>
          l.id === selectedLectureId
            ? {
                ...l,
                transcript: true,
                status: "Processed",
                raw: { ...l.raw, transcript: transcriptText },
              }
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
 

  function formatRecordingTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function handleRecordClick() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
      return;
    }
 
    try {
      setAudioError("");
      setTranscript("");
 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
 
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
 
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
 
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "lecture-recording.webm", {
          type: "audio/webm",
        });
 
        await sendAudioToBackend(audioFile);
 
        stream.getTracks().forEach((track) => track.stop());
      };
 
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      setAudioError("Could not access microphone.");
    }
  }

  async function createLecture() {
    if (!user?.uid) return;

    const title = recordingLectureTitle.trim();
    if (!title) {
      alert("Please enter a lecture title first.");
      return;
    }

    try {
      setCreatingLecture(true);

      const lecturesRef = collection(
        db,
        "users",
        user.uid,
        "classes",
        classId,
        "lectures"
      );

      const newLecture = {
        title,
        status: "Draft",
        transcript: "",
        summary: "",
        flashcards: [],
        quizQuestions: [],
        mindmap: {
          nodes: [],
          edges: [],
        },
        audioFileUrl: "",
        durationLabel: "0 min",
        dateLabel: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const lectureRef = await addDoc(lecturesRef, newLecture);

      await updateDoc(doc(db, "users", user.uid, "classes", classId), {
        lectures: increment(1),
      });

      const lectureForUi = {
        id: lectureRef.id,
        title,
        date: newLecture.dateLabel,
        duration: newLecture.durationLabel,
        status: newLecture.status,
        transcript: false,
        summary: false,
        flashcards: 0,
        quizzes: 0,
        mindMaps: 0,
        hasRecording: false,
        raw: newLecture,
      };

      setLectures((prev) => [lectureForUi, ...prev]);
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
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-300">Loading class...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Please log in</h1>
          <p className="mt-3 text-slate-400">
            You need to sign in before viewing your classes.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-slate-400">{pageError}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  if (!currentClass) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Class not found</h1>
          <p className="mt-3 text-slate-400">
            This class does not exist for your account.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  const theme = currentClass.theme || "from-cyan-500/20 to-blue-500/20";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-100px] top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Back to Classes
          </Link>
        </div>

        <header
          className={`mb-8 rounded-3xl border border-white/10 bg-gradient-to-r ${theme} p-[1px] shadow-2xl`}
        >
          <div className="rounded-[calc(1.5rem-1px)] bg-slate-950/90 p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  Class Workspace
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {currentClass.name || "Untitled Class"}
                </h1>
                <p className="mt-3 text-base text-slate-300">
                  {currentClass.professor || "No professor"} ·{" "}
                  {currentClass.semester || "No semester"}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Manage lecture recordings, update audio, and access every
                  transcript, summary, flashcard set, quiz, and mind map for
                  this class in one place.
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
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Class Library</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Switch between lectures, mental maps, summaries, flashcards,
                  and quizzes.
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
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      activeView === key
                        ? "bg-white text-slate-950"
                        : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredLectures.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                  <p className="text-lg font-semibold text-white">
                    No lectures yet
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Create your first lecture for this class on the right panel.
                  </p>
                </div>
              ) : (
                filteredLectures.map((lecture) => (
                  <div
                    key={lecture.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-white/20 hover:bg-slate-900/90"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-white">
                            {lecture.title}
                          </h3>
                          <StatusPill status={lecture.status} />
                        </div>

                        <p className="mt-2 text-sm text-slate-400">
                          {lecture.date} · {lecture.duration}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <MiniBadge
                            label={`${lecture.transcript ? 1 : 0} Transcript`}
                          />
                          <MiniBadge
                            label={`${lecture.summary ? 1 : 0} Summary`}
                          />
                          <MiniBadge label={`${lecture.flashcards} Flashcards`} />
                          <MiniBadge label={`${lecture.quizzes} Quizzes`} />
                          <MiniBadge label={`${lecture.mindMaps} Mind Map`} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/lecture/${lecture.id}?classId=${classId}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                        >
                          Open Lecture
                        </Link>

                        <button
                          onClick={() => setSelectedLectureId(lecture.id)}
                          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                        >
                          Add Audio
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <FeatureCard
                        title="Summary"
                        text="Open the lecture summary and review the main takeaways."
                      />
                      <FeatureCard
                        title="Flashcards"
                        text="Study core concepts with generated cards."
                      />
                      <FeatureCard
                        title="Quiz"
                        text="Test yourself with questions and explanations."
                      />
                      <FeatureCard
                        title="Mind Map"
                        text="Visualize the lecture structure and edit connections."
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">New Lecture</h2>
              <p className="mt-2 text-sm text-slate-400">
                Create a lecture, then add audio to generate its transcript.
              </p>

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                <label className="text-sm font-medium text-slate-300">
                  Lecture title
                </label>
                <input
                  value={recordingLectureTitle}
                  onChange={(e) => setRecordingLectureTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createLecture()}
                  placeholder="Ex: Backpropagation and Training"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
                />
                <button
                  onClick={createLecture}
                  disabled={creatingLecture || !recordingLectureTitle.trim()}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingLecture ? "Creating..." : "Create Lecture"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Add Audio</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedLecture
                      ? `Attaching audio to: ${selectedLecture.title}`
                      : "Select a lecture from the list to add audio."}
                  </p>
                </div>
                {isRecording && (
                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-200">
                    Recording · {formatRecordingTime(recordingTime)}
                  </span>
                )}
              </div>

              {selectedLecture ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleRecordClick}
                      disabled={isProcessingAudio}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isRecording
                          ? "border border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
                          : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:opacity-90"
                      }`}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>

                    <button
                      onClick={triggerUpload}
                      disabled={isRecording || isProcessingAudio}
                      className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Audio File
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isProcessingAudio && (
                    <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4">
                      <p className="text-sm font-semibold text-yellow-200">Transcribing audio...</p>
                      <p className="mt-1 text-xs text-yellow-100/80">
                        This may take a moment depending on length.
                      </p>
                    </div>
                  )}

                  {audioError && (
                    <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-200">Error</p>
                      <p className="mt-1 text-xs text-red-100/80">{audioError}</p>
                    </div>
                  )}

                  {transcript && (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-sm font-semibold text-emerald-200">Transcript saved</p>
                      <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-300">
                        {transcript}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center">
                  <p className="text-sm text-slate-500">
                    Click <span className="text-slate-300">Add Audio</span> on any lecture in the list to select it here.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Everything in this Class</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <OutputTile
                  title="All Lectures"
                  value={totals.lectures}
                  description="Every recording stored for this course."
                />
                <OutputTile
                  title="All Summaries"
                  value={totals.summaries}
                  description="Quick understanding for each lecture."
                />
                <OutputTile
                  title="All Flashcards"
                  value={totals.flashcards}
                  description="Review cards built from the most important concepts."
                />
                <OutputTile
                  title="All Quizzes"
                  value={totals.quizzes}
                  description="Practice questions with answers and feedback."
                />
                <OutputTile
                  title="All Mind Maps"
                  value={totals.mindMaps}
                  description="Editable concept maps for visual learning."
                />
                <OutputTile
                  title="All Transcripts"
                  value={totals.transcripts}
                  description="Text extracted from lecture recordings."
                />
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
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const styles =
    status === "Processed"
      ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : status === "Processing"
      ? "border border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border border-white/10 bg-white/5 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function MiniBadge({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
      {label}
    </span>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function OutputTile({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-lg font-semibold text-white">
          {value}
        </div>
      </div>
    </div>
  );
}