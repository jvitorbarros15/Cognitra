import Link from "next/link";

export default function HomePage() {
  const classes = [
    {
      id: 1,
      name: "CMPSC 442",
      professor: "Prof. Smith",
      lectures: 12,
      color: "from-cyan-500/20 to-blue-500/20",
    },
    {
      id: 2,
      name: "STAT 318",
      professor: "Dr. Chen",
      lectures: 8,
      color: "from-fuchsia-500/20 to-violet-500/20",
    },
    {
      id: 3,
      name: "MATH 220",
      professor: "Prof. Rivera",
      lectures: 5,
      color: "from-emerald-500/20 to-teal-500/20",
    },
  ];

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
              <p className="mt-2 text-2xl font-semibold">3</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lectures</p>
              <p className="mt-2 text-2xl font-semibold">25</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Flashcards</p>
              <p className="mt-2 text-2xl font-semibold">180</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mind Maps</p>
              <p className="mt-2 text-2xl font-semibold">14</p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Your Classes</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Each class stores its own lectures, summaries, flashcards, quizzes, and mental maps.
                </p>
              </div>
              <button className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
                + Create Class
              </button>
            </div>

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
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Add a New Lecture</h2>
              <p className="mt-2 text-sm text-slate-400">
                Record audio live during class or upload an existing voice recording. The app will extract the lecture and generate study tools automatically.
              </p>

              <div className="mt-6 grid gap-4">
                <button className="group rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-5 text-left transition hover:scale-[1.01] hover:border-cyan-300/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">Record Live Lecture</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Start recording your professor in real time and process the lecture when class ends.
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
                      <p className="text-lg font-semibold text-white">Upload Voice Recording</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Upload an audio file and generate transcript, summary, quiz, flashcards, and mental maps.
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
