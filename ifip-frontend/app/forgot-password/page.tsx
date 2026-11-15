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
    <div className="min-h-screen bg-[#eef4fa] font-sans text-on-surface flex flex-col">

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
          <div className="w-full max-w-[440px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <HiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl leading-tight tracking-tight text-[#101f3f] sm:text-3xl font-semibold font-sans">Check your email</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset link. It expires in <strong>1 hour</strong>.
            </p>
            <div className="w-full bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3 text-left">
              <HiInformationCircle className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                If you do not receive an email within 5 minutes, please check your spam folder or contact{" "}
                <a href="mailto:ifip.program@gmail.com" className="text-vibrant-blue hover:underline font-semibold">ifip.program@gmail.com</a>.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="w-full max-w-[440px] bg-[#ffffff] rounded-[18px] border border-[#cbd8e8] p-5 sm:p-8">

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
              <h1 className="text-2xl leading-tight tracking-tight text-[#101f3f] sm:text-3xl text-center font-semibold font-sans">Forgot your password?</h1>
              <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">
                Enter the email address associated with your IFIP account and we&apos;ll send you a link to reset your password.
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
                <label htmlFor="forgot-email" className="block text-xs font-bold uppercase text-primary mb-2 tracking-wide">
                  Email Address
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
                    className="w-full pl-10 pr-4 py-3 border border-outline-variant/40 rounded-[6px] text-sm bg-slate-50/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
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
                    Send Reset Link
                    <HiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
              >
                <HiArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </form>
          </div>
        )}
      </div>

      <RegistrationSupportFooter />
    </div>
  );
}
