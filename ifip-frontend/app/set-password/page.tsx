"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  HiEye,
  HiEyeSlash,
  HiEnvelope,
  HiLockClosed,
  HiCheckCircle,
  HiArrowRightOnRectangle,
} from "react-icons/hi2";
import { setPassword as setPasswordApi, getTokenInfo } from "@/lib/api/auth";

// ── Password strength checker ──────────────────────────────────────────
function checkRequirements(pw: string) {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  };
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-600" : "text-on-surface-variant/60"}`}>
      <HiCheckCircle className={`w-4 h-4 shrink-0 transition-colors ${met ? "text-green-500" : "text-outline-variant/50"}`} />
      {label}
    </li>
  );
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ───
function SetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const reqs = checkRequirements(password);
  const allReqsMet = Object.values(reqs).every(Boolean);
  const passwordsMatch = password === confirm && confirm.length > 0;

  // Decode the token client-side to extract the email for display (UX only — never trusted server-side)
  useEffect(() => {
    if (!token) {
      setTokenError("No token found in this link. Please use the link from your confirmation email.");
      setTokenLoading(false);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.purpose !== "set-password") throw new Error("wrong purpose");
      if (payload.exp < Date.now() / 1000) throw new Error("expired");

      if (payload.email) {
        setEmail(payload.email);
        setTokenLoading(false);
      } else {
        // Fallback for older tokens: fetch user email from backend
        getTokenInfo(token)
          .then((data) => {
            setEmail(data.email);
          })
          .catch(() => {
            setEmail("Your Registered Email");
          })
          .finally(() => {
            setTokenLoading(false);
          });
      }
    } catch {
      setTokenError("This link is invalid or has expired. Please request a new one from your confirmation email or contact support.");
      setTokenLoading(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!allReqsMet) { setSubmitError("Your password does not meet all security requirements."); return; }
    if (!passwordsMatch) { setSubmitError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await setPasswordApi(token, password);
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1800);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (success) {
    return (
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-level1 border border-outline-variant/20 p-8 md:p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
          <HiCheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-headline-md text-primary">Password Set!</h2>
        <p className="text-sm text-on-surface-variant">Your account is secured. Redirecting you to your dashboard…</p>
        <svg className="animate-spin w-5 h-5 text-primary/50 mt-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // ── Token error state ──
  if (!tokenLoading && tokenError) {
    return (
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-level1 border border-outline-variant/20 p-8 md:p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <HiLockClosed className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-headline-md text-primary">Link Expired or Invalid</h2>
        <p className="text-sm text-on-surface-variant max-w-sm">{tokenError}</p>
        <Link href="/forgot-password" className="mt-2 text-sm font-semibold text-vibrant-blue hover:underline">
          Request a new password link →
        </Link>
        <Link href="/login" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
          ← Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-level1 border border-outline-variant/20 overflow-hidden">
      {/* Card top accent */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-vibrant-blue to-secondary" />

      <div className="p-8 md:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/icons/icon-full-color.png"
            alt="IFIP Logo"
            width={80}
            height={80}
            className="w-16 h-16 object-contain mb-4"
          />
          <h1 className="text-headline-md text-primary text-center">Secure Your Account</h1>
          <p className="text-sm text-on-surface-variant text-center mt-1">
            Welcome to IFIP Batch 2026. Set a strong password to access your participant dashboard.
          </p>
        </div>

        {/* Loading skeleton */}
        {tokenLoading && (
          <div className="space-y-3 mb-6">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        )}

        {!tokenLoading && (
          <>
            {/* Submission error */}
            {submitError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Participant Email (read-only display) */}
              <div>
                <label className="block text-xs font-bold uppercase text-primary mb-2 tracking-wide">
                  Participant Email
                </label>
                <div className="relative">
                  <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    placeholder="Loading email…"
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant/30 rounded-[6px] text-sm bg-slate-100/80 text-on-surface-variant cursor-default focus:outline-none"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="sp-password" className="block text-xs font-bold uppercase text-primary mb-2 tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="sp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pr-12 pl-4 py-3 border border-outline-variant/40 rounded-[6px] text-sm bg-slate-50/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="sp-confirm" className="block text-xs font-bold uppercase text-primary mb-2 tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="sp-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={`w-full pr-12 pl-4 py-3 border rounded-[6px] text-sm bg-slate-50/50 focus:outline-none transition-colors ${
                      confirm.length > 0
                        ? passwordsMatch
                          ? "border-green-400 focus:border-green-500"
                          : "border-red-300 focus:border-red-400"
                        : "border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors" aria-label="Toggle confirm visibility">
                    {showConfirm ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Security Requirements */}
              <div className="bg-primary/3 border border-primary/10 rounded-xl p-4">
                <p className="text-xs font-bold uppercase text-primary tracking-widest mb-3">Security Requirements</p>
                <ul className="flex flex-col gap-2">
                  <RequirementRow met={reqs.length} label="At least 8 characters" />
                  <RequirementRow met={reqs.uppercase} label="One uppercase letter" />
                  <RequirementRow met={reqs.number} label="One number" />
                  <RequirementRow met={reqs.special} label="One special character (!@#$…)" />
                </ul>
              </div>

              {/* Submit */}
              <button
                id="set-password-submit"
                type="submit"
                disabled={loading || !allReqsMet || !passwordsMatch}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-6 rounded-[6px] flex items-center justify-center gap-2 shadow-sm hover-lift transition-all mt-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting password…
                  </>
                ) : (
                  <>
                    Set Password &amp; Login
                    <HiArrowRightOnRectangle className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-on-surface-variant/60 mt-5">
              By setting a password, you agree to our{" "}
              <a href="#" className="text-vibrant-blue hover:underline">Security Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page export (Suspense boundary required for useSearchParams) ───────
export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-academic-cream font-sans text-on-surface flex flex-col">
      {/* Minimal top header — logo only (no full nav, this is a secure link) */}
      <header className="py-5 px-6 flex items-center justify-center border-b border-outline-variant/20 bg-white/60 backdrop-blur-sm">
        <Link href="/">
          <Image
            src="/images/logos/logo-full-color.png"
            alt="IFIP Logo"
            width={130}
            height={36}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-level1 border border-outline-variant/20 p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
        }>
          <SetPasswordInner />
        </Suspense>

        <p className="mt-6 text-xs text-on-surface-variant/60 flex items-center gap-1.5">
          <HiLockClosed className="w-3.5 h-3.5" />
          Secure Institutional Gateway
        </p>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 px-4 border-t border-outline-variant/20 bg-academic-cream">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <span>© {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Program FAQs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
