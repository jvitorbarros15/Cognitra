"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  function openModal(mode = "login") {
    setAuthMode(mode);
    setAuthError("");
    setEmail("");
    setPassword("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setAuthError("");
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      closeModal();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setAuthError("");
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      closeModal();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName[0].toUpperCase();

  return (
    <>
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
              C
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-zinc-50">Cognitra</p>
              <p className="text-xs text-zinc-500">AI study workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">Home</Link>
            {loadingAuth ? (
              <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800" />
            ) : user ? (
              <>
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {initial}
                  </div>
                  <span className="max-w-[140px] truncate text-sm text-zinc-400">
                    {displayName}
                  </span>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openModal("login")}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openModal("signup")}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-50">
                {authMode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 flex rounded-xl border border-zinc-700 bg-zinc-950 p-1">
              {["login", "signup"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setAuthMode(mode); setAuthError(""); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    authMode === mode
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {mode === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {submitting ? "..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t border-zinc-800" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-60"
            >
              Continue with Google
            </button>

            {authError && (
              <p className="mt-4 text-sm text-red-400">{authError}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
