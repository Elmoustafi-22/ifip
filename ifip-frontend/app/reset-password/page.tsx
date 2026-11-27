"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import RegistrationSupportFooter from "@/components/RegistrationSupportFooter";
import { useSearchParams } from "next/navigation";
import {
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiCheckCircle,
  HiArrowRightOnRectangle,
  HiArrowLeft,
} from "react-icons/hi2";
import { resetPassword as resetPasswordApi } from "@/lib/api/auth";

// ── Password requirement checker ──────────────────────────────────────
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

// ── Inner component (uses useSearchParams — must be inside Suspense) ──
function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);

  const reqs = checkRequirements(password);
  const allReqsMet = Object.values(reqs).every(Boolean);
  const passwordsMatch = password === confirm && confirm.length > 0;

  // Client-side token pre-check (UX only — server re-validates on submit)
  useEffect(() => {
    if (!token) {
      setTokenError("No token found in this link. Please use the link from your reset email.");
      setTokenChecked(true);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.purpose !== "reset-password") throw new Error("wrong purpose");
      if (payload.exp < Date.now() / 1000) throw new Error("expired");
    } catch {
      setTokenError("This reset link is invalid or has expired. Please request a new one.");
    } finally {
      setTokenChecked(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!allReqsMet) { setSubmitError("Your password does not meet all security requirements."); return; }
    if (!passwordsMatch) { setSubmitError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const result = await resetPasswordApi(token, password);
      setSignInRequired(result.signInRequired === true);
      setSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (success) {
    return (
      <div className="w-full max-w-[460px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
          <HiCheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl">Your password was reset</h1>
        <Link href={signInRequired ? "/login" : "/dashboard"} className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[9px] bg-[#101f3f] px-5 text-sm font-semibold text-white hover:bg-[#24395f]">{signInRequired ? "Continue to sign in" : "Continue"}</Link>
      </div>
    );
  }

  // ── Token error state ──
  if (tokenChecked && tokenError) {
    return (
      <div className="w-full max-w-[460px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <HiLockClosed className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl">This link is unavailable</h1>
        <p className="text-sm text-on-surface-variant max-w-sm">{tokenError}</p>
        <Link href="/forgot-password" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-vibrant-blue hover:text-primary">
          Request a new reset link →
        </Link>
        <Link href="/login" className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5">
          <HiArrowLeft className="w-4 h-4" />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] overflow-hidden">

      <div className="p-5 sm:p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/icons/icon-full-color.png"
            alt="IFIP Logo"
            width={80}
            height={80}
            className="w-16 h-16 object-contain mb-4"
          />
          <h1 className="font-display text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl text-center">Choose a new password</h1>
          <p className="text-sm text-on-surface-variant text-center mt-1">
            Create a password for your account.
          </p>
        </div>

        {/* Token checking skeleton */}
        {!tokenChecked && (
          <div className="space-y-3 mb-6">
            <div className="h-4 bg-slate-100 rounded motion-safe:animate-pulse w-1/2" />
            <div className="h-12 bg-slate-100 rounded-lg motion-safe:animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg motion-safe:animate-pulse" />
          </div>
        )}

        {tokenChecked && !tokenError && (
          <>
            {submitError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* New Password */}
              <div>
                <label htmlFor="rp-password" className="block text-sm font-semibold text-primary mb-2">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    id="rp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full min-h-[50px] pr-12 pl-4 py-3 border border-[#7185a0] rounded-[9px] text-base bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="rp-confirm" className="block text-sm font-semibold text-primary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="rp-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={`w-full min-h-[50px] pr-12 pl-4 py-3 border rounded-[9px] text-base bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e] ${
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
                id="reset-password-submit"
                type="submit"
                disabled={loading || !allReqsMet || !passwordsMatch}
                className="w-full min-h-[50px] rounded-[9px] bg-[#101f3f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#24395f] disabled:opacity-60 motion-safe:transition-colors flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting…
                  </>
                ) : (
                  <>
                    Reset &amp; Login
                    <HiArrowRightOnRectangle className="w-4 h-4" />
                  </>
                )}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                <HiArrowLeft className="w-4 h-4" />
                Sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] font-sans text-on-surface flex flex-col">
      {/* Minimal header */}
      <header className="py-3 px-5 flex items-center justify-center border-b border-outline-variant/20 bg-white">
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

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <Suspense fallback={
          <div className="w-full max-w-[460px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] p-5 sm:p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-6 w-48 bg-slate-100 rounded motion-safe:animate-pulse" />
            <div className="h-4 w-64 max-w-full bg-slate-100 rounded motion-safe:animate-pulse" />
          </div>
        }>
          <ResetPasswordInner />
        </Suspense>
      </div>

      <RegistrationSupportFooter />
    </div>
  );
}
