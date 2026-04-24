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
import { useTranslation } from "react-i18next";
import { auth, googleProvider } from "@/lib/firebase";
import LanguageSwitcher from "./LanguageSwitcher";

export default function NavBar() {
  const { t } = useTranslation();
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

  const displayName = user?.displayName || user?.email?.split("@")[0] || t("auth.user");
  const initial = displayName[0].toUpperCase();

  return (
    <>
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-lg font-bold text-slate-950 shadow-lg">
              C
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Cognitra</p>
              <p className="text-xs text-slate-400">{t("navigation.tagline")}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
              {t("navigation.home")}
            </Link>
            <LanguageSwitcher />
            {loadingAuth ? (
              <div className="h-8 w-20 animate-pulse rounded-2xl bg-white/10" />
            ) : user ? (
              <>
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-slate-950">
                    {initial}
                  </div>
                  <span className="max-w-[140px] truncate text-sm text-slate-300">
                    {displayName}
                  </span>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {t("auth.logout")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openModal("login")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {t("auth.signIn")}
                </button>
                <button
                  onClick={() => openModal("signup")}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                >
                  {t("auth.signUp")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {authMode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1">
              {["login", "signup"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setAuthMode(mode); setAuthError(""); }}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                    authMode === mode
                      ? "bg-white text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              />
              <input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "..." : authMode === "login" ? t("auth.signIn") : t("auth.createAccount")}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t border-white/10" />
              <span className="text-xs text-slate-500">{t("auth.or")}</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {t("auth.continueWithGoogle")}
            </button>

            {authError && (
              <p className="mt-4 text-sm text-red-300">{authError}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
