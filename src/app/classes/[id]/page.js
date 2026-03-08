import Link from "next/link";

export default function ClassPage({ params }) {
  const classId = params.id;

  const classData = {
    1: {
      id: 1,
      name: "CMPSC 442",
      professor: "Prof. Smith",
      semester: "Spring 2026",
      theme: "from-cyan-500/20 to-blue-500/20",
      lectures: [
        {
          id: "lec-101",
          title: "Introduction to Neural Networks",
          date: "Mar 4, 2026",
          duration: "52 min",
          status: "Processed",
        },
        {
          id: "lec-102",
          title: "Activation Functions and Perceptrons",
          date: "Mar 6, 2026",
          duration: "48 min",
          status: "Processed",
        },
      ],
    },
    2: {
      id: 2,
      name: "STAT 318",
      professor: "Dr. Chen",
      semester: "Spring 2026",
      theme: "from-fuchsia-500/20 to-violet-500/20",
      lectures: [
        {
          id: "lec-201",
          title: "Probability Foundations",
          date: "Mar 3, 2026",
          duration: "44 min",
          status: "Processed",
        },
        {
          id: "lec-202",
          title: "Random Variables",
          date: "Mar 7, 2026",
          duration: "50 min",
          status: "Processing",
        },
      ],
    },
    3: {
      id: 3,
      name: "MATH 220",
      professor: "Prof. Rivera",
      semester: "Spring 2026",
      theme: "from-emerald-500/20 to-teal-500/20",
      lectures: [
        {
          id: "lec-301",
          title: "Matrix Operations",
          date: "Mar 2, 2026",
          duration: "46 min",
          status: "Processed",
        },
      ],
    },
  };

  const currentClass = classData[classId];

  if (!currentClass) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Class not found</h1>
          <p className="mt-3 text-slate-400">
            This class does not exist yet.
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
          className={`mb-8 rounded-3xl border border-white/10 bg-gradient-to-r ${currentClass.theme} p-[1px] shadow-2xl`}
        >
          <div className="rounded-[calc(1.5rem-1px)] bg-slate-950/90 p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                  Class Workspace
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {currentClass.name}
                </h1>
                <p className="mt-3 text-base text-slate-300">
                  {currentClass.professor} · {currentClass.semester}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Store every lecture for this class in one place, then generate transcripts, summaries, flashcards, quizzes, and mental maps automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Lectures
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {currentClass.lectures.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Summaries
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {currentClass.lectures.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Mind Maps
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {currentClass.lectures.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Lectures</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Open a lecture to view transcript, summary, flashcards, quiz, and mental map.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {currentClass.lectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 transition hover:bg-slate-900/90"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {lecture.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {lecture.date} · {lecture.duration}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          lecture.status === "Processed"
                            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border border-amber-400/20 bg-amber-400/10 text-amber-200"
                        }`}
                      >
                        {lecture.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/lecture/${lecture.id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Open Lecture
                    </Link>

                    <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                      View Summary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Add a New Lecture</h2>
              <p className="mt-2 text-sm text-slate-400">
                Create a new lecture inside {currentClass.name} by recording live or uploading an existing audio file.
              </p>

              <div className="mt-6 grid gap-4">
                <button className="group rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5 text-left transition hover:scale-[1.01] hover:border-cyan-300/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        Record Live Lecture
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Start capturing the lecture audio in real time for this class.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-cyan-400/15 px-3 py-2 text-cyan-200">
                      🎙️
                    </div>
                  </div>
                </button>

                <button className="group rounded-3xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 p-5 text-left transition hover:scale-[1.01] hover:border-fuchsia-300/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        Upload Voice Recording
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Upload an audio file and turn it into study material for this class.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-fuchsia-400/15 px-3 py-2 text-fuchsia-200">
                      ⬆️
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Class Output</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Transcripts", "Clean text extracted from each lecture recording."],
                  ["Summaries", "Fast review and detailed understanding of every lecture."],
                  ["Flashcards", "Study cards generated from the most important concepts."],
                  ["Mental Maps", "Visual breakdowns of key topics and relationships."],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {description}
                    </p>
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