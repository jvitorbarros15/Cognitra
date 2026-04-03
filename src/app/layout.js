import "./globals.css";
import NavBar from "@/components/NavBar";

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
            <NavBar />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}