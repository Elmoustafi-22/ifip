"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import RegistrationSupportFooter from "@/components/RegistrationSupportFooter";
import {
  HiEnvelope,
  HiArrowRight,
  HiArrowLeft,
  HiCheckCircle,
  HiInformationCircle,
} from "react-icons/hi2";
import { forgotPassword as forgotPasswordApi } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Please enter your email address."); return; }

    setLoading(true);
    try {
      // Always show success — server response is timing-safe regardless of email existence
      await forgotPasswordApi(cleanEmail);
      setSubmitted(true);
    } catch {
      // Also show success to prevent user enumeration through error messages
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ef] font-sans text-on-surface flex flex-col">

      {/* Minimal header — logo only (secure flow) */}
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

        {submitted ? (
          /* ── Success state ── */
          <div className="w-full max-w-[440px] bg-white rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8 flex flex-col items-center gap-5 text-center shadow-[0_20px_50px_-42px_#131b4880]">
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <HiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-display text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl">Check your email</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset link. It expires in <strong>1 hour</strong>.
            </p>
            <div className="w-full bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 text-left">
              <HiInformationCircle className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                No email after 5 minutes? Check spam or contact{" "}
                <a href="mailto:ifip.program@gmail.com" className="text-vibrant-blue hover:text-primary font-semibold">email support</a>.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="w-full max-w-[440px] bg-white rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8 shadow-[0_20px_50px_-42px_#131b4880]">

            {/* Logo + heading */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-5 shadow-sm">
                <Image
                  src="/images/icons/icon-full-color.png"
                  alt="IFIP"
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="font-display text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl text-center">Reset your password</h1>
              <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">
                Enter your account email for a reset link.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-primary mb-2">
                  Email address
                </label>
                <div className="relative">
                  <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@institution.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[50px] pl-10 pr-4 py-3 border border-[#7185a0] rounded-[9px] text-base bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]"
                  />
                </div>
              </div>

              <button
                id="forgot-password-submit"
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] rounded-[9px] bg-[#101f3f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#24395f] disabled:opacity-60 motion-safe:transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <HiArrowRight className="w-4 h-4" />
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
          </div>
        )}
      </div>

      <RegistrationSupportFooter />
    </div>
  );
}
