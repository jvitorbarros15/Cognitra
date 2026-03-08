import "./globals.css";

export const metadata = {
  title: "Cognitra",
  description: "Turn lectures into summaries, flashcards, quizzes, and mental maps.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute right-[-100px] top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex min-h-screen flex-col">
            <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950 shadow-lg">
                    C
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight">Cognitra</p>
                    <p className="text-xs text-slate-400">
                      AI study workspace
                    </p>
                  </div>
                </div>

                <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
                  <a href="/" className="transition hover:text-white">
                    Home
                  </a>
                  <a href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </a>
                  <a href="/upload" className="transition hover:text-white">
                    Upload
                  </a>
                </nav>
              </div>
            </header>

            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}