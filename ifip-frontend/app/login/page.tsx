"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HiBars3,
  HiXMark,
  HiArrowRight,
  HiEye,
  HiEyeSlash,
  HiEnvelope,
  HiLockClosed,
  HiShare,
  HiGlobeAlt,
} from "react-icons/hi2";
import { login as loginApi, getAccessToken } from "@/lib/api/auth";
import { useEffect } from "react";

export default function LoginPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(email, password, rememberMe);
      try {
        const payload = JSON.parse(atob(res.accessToken.split(".")[1]));
        if (payload.role === "admin" || payload.role === "superadmin") {
          window.location.href = "/admin";
          return;
        }
      } catch (tokenErr) {
        console.error("Token parse failed:", tokenErr);
      }
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col pb-16 md:pb-0">

      {/* Navigation Header — same as landing page */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo (Mobile & Desktop) */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-8 md:h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <a href="/#curriculum" className="text-on-surface/80 hover:text-primary transition-colors">Curriculum</a>
            <a href="/#process" className="text-on-surface/80 hover:text-primary transition-colors">Process</a>
            <a href="/#partners" className="text-on-surface/80 hover:text-primary transition-colors">Partners</a>
            <a href="/#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-primary border-b border-primary/40 pb-0.5">
              Login
            </Link>
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile-only Right: Hamburger menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:text-primary"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <HiXMark className="w-6 h-6" /> : <HiBars3 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-background md:hidden flex flex-col px-6 py-8 border-t border-outline-variant/30 gap-6">
          <a href="/#curriculum" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Curriculum</a>
          <a href="/#process" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Process</a>
          <a href="/#partners" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Partners</a>
          <a href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">FAQ</a>
          <div className="flex flex-col gap-4 mt-6">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center font-semibold border border-primary/20 py-3 rounded-[4px] hover:bg-primary/5 transition-colors text-primary">Login</Link>
            <Link href="/apply" onClick={() => setMobileMenuOpen(false)} className="text-center bg-impact-orange text-white font-semibold py-3 rounded-[4px]">Apply Now</Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Login Card */}
        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-level1 border border-outline-variant/20 p-8 md:p-10">

          {/* Logo — IFIP logo replacing the bank icon from the design */}
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
            <h1 className="text-headline-md text-primary text-center">Program Portal</h1>
            <p className="text-sm text-on-surface-variant text-center mt-1">Islamic Finance Prep &amp; Placement</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase text-primary mb-2 tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-outline-variant/40 rounded-[6px] text-sm bg-slate-50/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="text-xs font-bold uppercase text-primary tracking-wide">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-vibrant-blue font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-outline-variant/40 rounded-[6px] text-sm bg-slate-50/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant/40 text-primary accent-primary"
              />
              <span className="text-sm text-on-surface-variant">Remember me</span>
            </label>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold text-sm py-3.5 px-6 rounded-[6px] flex items-center justify-center gap-2 shadow-sm hover-lift transition-all mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Login to Dashboard
                  <HiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 border-t border-outline-variant/20" />

          {/* Apply CTA */}
          <div className="text-center">
            <p className="text-sm text-on-surface-variant mb-1">Not applied yet?</p>
            <Link
              href="/apply"
              className="text-sm font-bold text-impact-orange uppercase tracking-wide hover:underline"
            >
              Start Your Application Here
            </Link>
          </div>
        </div>

        {/* Secure badge */}
        <p className="mt-6 text-xs text-on-surface-variant/60 flex items-center gap-1.5">
          <HiLockClosed className="w-3.5 h-3.5" />
          Secure Institutional Gateway
        </p>
      </main>

      {/* Footer — same as landing page */}
      <footer id="contact" className="bg-academic-cream border-t border-outline-variant/30 py-16 mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand Col */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              className="h-10 w-auto object-contain self-start"
            />
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed mt-2">
              The Islamic Finance Internship Program (IFIP) develops industry-ready talent through professional training, practical simulations, and structured internship placement across the ethical finance ecosystem.
            </p>
            <div className="flex items-center gap-3 mt-4 text-on-surface-variant">
              <a href="#" className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors" aria-label="Social Share">
                <HiShare className="w-4 h-4" />
              </a>
              <a href="https://ifip.ng" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors" aria-label="Website">
                <HiGlobeAlt className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="md:col-span-3">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Program</h4>
            <ul className="flex flex-col gap-3 text-sm text-on-surface-variant">
              <li><a href="/#curriculum" className="hover:text-primary transition-colors">Curriculum</a></li>
              <li><a href="/#partners" className="hover:text-primary transition-colors">Placement Partners</a></li>
              <li><a href="/#faq" className="hover:text-primary transition-colors">Program FAQs</a></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="md:col-span-4">
            <h4 className="text-xs uppercase font-bold text-primary tracking-widest mb-4">Legal &amp; Inquiries</h4>
            <ul className="flex flex-col gap-3 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Shariah Compliance</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 border-t border-outline-variant/30 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div>© {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.</div>
          <div>Headquarters: Financial District, Lagos</div>
        </div>
      </footer>

      {/* Sticky Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-outline-variant/30 px-6 py-2 flex items-center justify-between shadow-lg font-sans">
        <Link href="/" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        {isLoggedIn ? (
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Workspace</span>
          </Link>
        ) : (
          <Link href="/apply" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Apply</span>
          </Link>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/modules" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Modules</span>
          </Link>
        ) : (
          <a href="/#faq" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">FAQ</span>
          </a>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Profile</span>
          </Link>
        ) : (
          <Link href="/login" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
}
