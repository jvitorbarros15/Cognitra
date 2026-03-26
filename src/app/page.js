"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

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

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [className, setClassName] = useState("");
  const [professor, setProfessor] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [classError, setClassError] = useState("");

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
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
    if (!user) {
      setClasses([]);
      return;
    }

    setLoadingClasses(true);

    const q = query(
      collection(db, "users", user.uid, "classes"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc, index) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name || "Untitled Class",
            professor: data.professor || "Professor not added",
            lectures: data.lectures || 0,
            color: gradients[index % gradients.length],
          };
        });

        setClasses(items);
        setLoadingClasses(false);
      },
      () => {
        setLoadingClasses(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthError("");

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleGoogleLogin() {
    setAuthError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  async function handleCreateClass() {
    if (!user) {
      setClassError("You need to log in first.");
      return;
    }

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

    async function sendAudioToBackend(file) {
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

      setTranscript(data.text || "");
    } catch (error) {
      setAudioError(error.message || "Something went wrong while processing audio.");
    } finally {
      setIsProcessingAudio(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
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
    } catch (error) {
      setAudioError("Could not access microphone.");
    }
  }

  const totalLectures = classes.reduce((sum, item) => sum + (item.lectures || 0), 0);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ADDED: state for recording, processing, errors, and transcript result
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  // ADDED: helper to send uploaded or recorded audio to backend route
  async function sendAudioToBackend(file) {
    try {
      setError("");
      setTranscript("");
      setIsProcessing(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe audio");
      }

      setTranscript(data.text || "");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }

  // opens hidden file picker when upload button is clicked
  function handleUploadClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // handles selected file from upload button
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    await sendAudioToBackend(file);

    //  reset input so the same file can be selected again later
    e.target.value = "";
  }

  async function handleRecordClick() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      setError("");
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
    } catch (err) {
      setError("Could not access microphone.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-100px] top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10">
        <header className="mb-10 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              Cognitra Dashboard
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Turn every lecture into a smarter way to study.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Organize your classes, record live lectures, upload audio files, and generate summaries, flashcards, quizzes, and mental maps for each course.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Classes</p>
              <p className="mt-2 text-2xl font-semibold">{classes.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lectures</p>
              <p className="mt-2 text-2xl font-semibold">{totalLectures}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Flashcards</p>
              <p className="mt-2 text-2xl font-semibold">0</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mind Maps</p>
              <p className="mt-2 text-2xl font-semibold">0</p>
            </div>
          </div>
        </header>

        {!loadingAuth && !user && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex gap-3">
              <button
                onClick={() => setAuthMode("login")}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  authMode === "login"
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode("signup")}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  authMode === "signup"
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 bg-white/5 text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="grid gap-4 md:grid-cols-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                {authMode === "signup" ? "Create Account" : "Login"}
              </button>
            </form>

            <button
              onClick={handleGoogleLogin}
              className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
            >
              Continue with Google
            </button>

            {authError && (
              <p className="mt-4 text-sm text-red-300">{authError}</p>
            )}
          </section>
        )}

        {!loadingAuth && user && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-slate-300">
                  Logged in as <span className="font-semibold text-white">{user.email}</span>
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white"
              >
                Logout
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="Class name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none"
              />
              <input
                type="text"
                placeholder="Professor"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none"
              />
              <button
                onClick={handleCreateClass}
                disabled={creatingClass}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {creatingClass ? "Creating..." : "+ Create Class"}
              </button>
            </div>

            {classError && (
              <p className="mt-4 text-sm text-red-300">{classError}</p>
            )}
          </section>
        )}

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Your Classes</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Each class stores its own lectures, summaries, flashcards, quizzes, and mental maps.
                </p>
              </div>
            </div>

            {!user ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
                Please log in to view and create your classes.
              </div>
            ) : loadingClasses ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
                Loading classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
                No classes yet. Create your first class above.
              </div>
            ) : (
              <div className="grid gap-4">
                {classes.map((course) => (
                  <div
                    key={course.id}
                    className={`group rounded-3xl border border-white/10 bg-gradient-to-r ${course.color} p-[1px] transition hover:border-white/20`}
                  >
                    <div className="rounded-[calc(1.5rem-1px)] bg-slate-950/90 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{course.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">{course.professor}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                            {course.lectures} lectures
                          </span>
                          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
                            Summaries
                          </span>
                          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
                            Flashcards
                          </span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                            Mind Maps
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link href={`/classes/${course.id}`}>
                          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                            Open Class
                          </button>
                        </Link>

                        <Link href={`/classes/${course.id}`}>
                          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                            View Lectures
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Add a New Lecture</h2>
              <p className="mt-2 text-sm text-slate-400">
                Record audio live during class or upload an existing voice recording. The app will extract the lecture and generate study tools automatically.
              </p>

              <div className="mt-6 grid gap-4">
                <button 
                  className="group rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5 text-left transition hover:scale-[1.01] hover:border-cyan-300/30"
                  onClick={handleRecordClick}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {isRecording ? "Stop Recording" : "Record Live Lecture"} 
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {isRecording
                          ? "Recording now. Click again when class ends."
                          : "Start recording your professor in real time and process the lecture when class ends."} 
                      </p>
                    </div>
                    <div className="rounded-2xl bg-cyan-400/15 px-3 py-2 text-cyan-200">
                      🎙️
                    </div>
                  </div>
                </button>

                <button 
                  onClick={handleUploadClick}
                  className="group rounded-3xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-5 text-left transition hover:scale-[1.01] hover:border-fuchsia-300/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        Upload Voice Recording
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Upload an audio file and generate transcript, summary, quiz, flashcards, and mental maps.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-fuchsia-400/15 px-3 py-2 text-fuchsia-200">
                      ⬆️
                    </div>
                  </div>
                </button>

                {/* HIDDEN FILE INPUT */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* FEEDBACK UI */}
                {isProcessingAudio && (
                  <p className="text-sm text-cyan-300">Processing audio...</p>
                )}

                {audioError && (
                  <p className="text-sm text-red-400">{audioError}</p>
                )}

                {transcript && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm font-semibold text-white">Transcript</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {transcript}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isProcessing && (
              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="text-xl font-semibold text-yellow-200">Processing Audio</h2>
                <p className="mt-2 text-sm text-yellow-100/80">
                  Uploading your audio and generating transcript...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="text-xl font-semibold text-red-200">Something went wrong</h2>
                <p className="mt-2 text-sm text-red-100/80">{error}</p>
              </div>
            )}

            {transcript && (
              <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <h2 className="text-2xl font-semibold">Transcript</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {transcript}
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">What each class gets</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Smart Summaries", "Short and detailed overviews of each lecture."],
                  ["Flashcards", "Quick review cards generated from the class content."],
                  ["Quizzes", "Practice questions with answers and explanations."],
                  ["Mental Maps", "Visual concept structures for better understanding."],
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
