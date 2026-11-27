"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAxiosError } from "axios";
import { TbArrowLeft, TbArrowRight, TbBrandWhatsapp, TbEye, TbEyeOff, TbLock, TbMail } from "react-icons/tb";
import { login as loginApi, getAccessToken, loginMfaVerify, verifyAdminMfaEmail, forgotPassword as forgotPasswordApi } from "@/lib/api/auth";
import { isCvRequestPath } from "@/lib/cv-request-link";
import styles from "./login.module.css";

const supportEmail = "mailto:ifip.program@gmail.com";

function participantDestination(role: string) {
  const next = new URLSearchParams(window.location.search).get("next");
  return role === "participant" && isCvRequestPath(next) ? next : "/dashboard";
}

function authErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function LoginPage() {
  const [viewMode, setViewMode] = useState<"login" | "forgot-password">("login");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaStage, setMfaStage] = useState<"email-code" | "setup" | "code" | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [authenticator, setAuthenticator] = useState<{ secret: string; qrCode: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [sessionMsg, setSessionMsg] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "admin" || payload.role === "superadmin") {
          window.location.href = "/admin";
        } else {
          window.location.href = participantDestination(payload.role);
        }
      } catch {
        window.location.href = "/dashboard";
      }
      return;
    }
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const session = params.get("session");
      const view = params.get("view");
      if (view === "forgot-password") {
        setViewMode("forgot-password");
      }
      if (session === "expired") {
        setSessionMsg("Your session expired. Sign in again to continue.");
      } else if (session === "idle") {
        setSessionMsg("You were signed out due to inactivity. Sign in again to continue.");
      } else if (session === "password-changed") {
        setSessionMsg("Your password was changed. Sign in with your new password and authenticator.");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const [error, setError] = useState("");

  const handlePostLoginRedirect = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "admin" || payload.role === "superadmin") {
        window.location.href = "/admin";
        return;
      }
      if (payload.role === "partner") {
        window.location.href = "/partner-portal";
        return;
      }
      window.location.href = participantDestination(payload.role);
      return;
    } catch (tokenErr) {
      console.error("Token parse failed:", tokenErr);
    }
    window.location.href = "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(cleanEmail, password, rememberMe);
      if (res.mfaRequired && res.mfaToken) {
        setMfaStage(res.mfaEnrollmentRequired ? "email-code" : "code");
        setMfaToken(res.mfaToken);
        setPassword("");
        setLoading(false);
        return;
      }
      if (res.accessToken) {
        handlePostLoginRedirect(res.accessToken);
      }
    } catch (error: unknown) {
      setError(authErrorMessage(error, "Incorrect credentials."));
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address to request a password reset.");
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordApi(cleanEmail);
      setForgotSubmitted(true);
    } catch {
      setForgotSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const codeLength = mfaStage === "email-code" ? 8 : 6;
    if (otpCode.length !== codeLength) {
      setError(`Enter the ${codeLength}-digit verification code.`);
      return;
    }
    setLoading(true);
    try {
      if (mfaStage === "email-code") {
        setAuthenticator(await verifyAdminMfaEmail(mfaToken, otpCode));
        setOtpCode("");
        setMfaStage("setup");
        return;
      }
      const res = await loginMfaVerify(mfaToken, otpCode, rememberMe, mfaStage === "setup");
      if (res.accessToken) {
        handlePostLoginRedirect(res.accessToken);
      }
    } catch (error: unknown) {
      setError(authErrorMessage(error, "Invalid verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const view = mfaStage ?? (viewMode === "login" ? "signin" : forgotSubmitted ? "sent" : "recovery");
  const headings = {
    signin: "Sign in to IFIP",
    code: "Enter your security code",
    "email-code": "Verify your admin email",
    setup: "Set up your authenticator",
    recovery: "Forgot your password?",
    sent: "Check your email",
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);

  useEffect(() => {
    if (previousView.current !== view) heading.current?.focus();
    previousView.current = view;
  }, [view]);

  function backToSignIn() {
    setMfaStage(null);
    setMfaToken("");
    setAuthenticator(null);
    setOtpCode("");
    setViewMode("login");
    setForgotSubmitted(false);
    setError("");
  }

  const errorAttributes = {
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? "login-error-alert" : undefined,
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link href="/" aria-label="IFIP homepage">
            <Image src="/images/logos/logo-full-color.png" alt="" width={160} height={44} priority className={styles.logo} />
          </Link>
          <Link href="/" className={styles.backLink} aria-label="Back to homepage" title="Back to homepage"><TbArrowLeft aria-hidden="true" /></Link>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.brand}>
          <p className={styles.eyebrow}>Islamic Finance Internship Program</p>
          <p className={styles.welcome}>Your IFIP journey continues here.</p>
        </aside>

        <section className={styles.formArea} aria-labelledby="login-title">
          <div key={view} className={styles.panel} data-view={view}>
            <h1 id="login-title" ref={heading} tabIndex={-1}>{headings[view]}</h1>
            {view === "recovery" && <p className={styles.intro}>We’ll send a reset link to your account email.</p>}
            {view === "code" && <p className={styles.intro}>Enter the six-digit verification code from your authenticator app.</p>}
            {view === "email-code" && <p className={styles.intro}>Enter the eight-digit setup code sent to your admin email.</p>}
            {view === "setup" && <p className={styles.intro}>Scan the QR code in your authenticator app or enter the setup key, then enter the six-digit code it generates.</p>}

            {view === "signin" && sessionMsg && !error && <p role="status" className={styles.notice}>{sessionMsg}</p>}
            {error && <p role="alert" id="login-error-alert" className={styles.error}>{error}</p>}

            {view === "signin" && (
              <>
                <form onSubmit={handleSubmit} noValidate>
                  <div className={styles.field}>
                    <label htmlFor="login-email">Email address</label>
                    <div className={styles.control}>
                      <TbMail aria-hidden="true" />
                      <input id="login-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} {...errorAttributes} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <div className={styles.fieldHeader}>
                      <label htmlFor="login-password">Password</label>
                      <button type="button" className={styles.textButton} disabled={loading} onClick={() => {
                        setViewMode("forgot-password");
                        setError("");
                      }}>Forgot password?</button>
                    </div>
                    <div className={styles.control}>
                      <TbLock aria-hidden="true" />
                      <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} {...errorAttributes} />
                      <button type="button" className={styles.textButton} aria-controls="login-password" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <TbEyeOff aria-hidden="true" /> : <TbEye aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <label className={styles.remember}>
                    <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                    Remember me
                  </label>
                  <button id="login-submit" className={styles.primary} type="submit" disabled={loading}>
                    {loading ? "Signing in…" : <>Sign in <TbArrowRight aria-hidden="true" /></>}
                  </button>
                </form>
                <p className={styles.secondary}>New to IFIP? <Link href="/apply">Apply to IFIP <TbArrowRight aria-hidden="true" /></Link></p>
              </>
            )}

            {mfaStage && (
              <form onSubmit={handleMfaSubmit} noValidate>
                {view === "setup" && authenticator && (
                  <div className={styles.field}>
                    <Image src={authenticator.qrCode} alt="Authenticator setup QR code" width={160} height={160} unoptimized />
                    <p>Setup key <code className="break-all">{authenticator.secret}</code></p>
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="mfa-code">Verification code</label>
                  <div className={styles.control}>
                    <TbLock aria-hidden="true" />
                    <input id="mfa-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={view === "email-code" ? 8 : 6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))} {...errorAttributes} />
                  </div>
                </div>
                <button id="mfa-submit" className={styles.primary} type="submit" disabled={loading}>{loading ? "Verifying…" : view === "email-code" ? "Verify email code" : "Verify and sign in"}</button>
                <button type="button" className={styles.backAction} disabled={loading} onClick={backToSignIn}><TbArrowLeft aria-hidden="true" /> Sign in</button>
              </form>
            )}

            {view === "recovery" && (
              <form onSubmit={handleForgotPasswordSubmit} noValidate>
                <div className={styles.field}>
                  <label htmlFor="forgot-email">Email address</label>
                  <div className={styles.control}>
                    <TbMail aria-hidden="true" />
                    <input id="forgot-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} {...errorAttributes} />
                  </div>
                </div>
                <button id="forgot-password-submit" className={styles.primary} type="submit" disabled={loading}>{loading ? "Sending link…" : "Send reset link"}</button>
                <button type="button" className={styles.backAction} disabled={loading} onClick={backToSignIn}><TbArrowLeft aria-hidden="true" /> Sign in</button>
              </form>
            )}

            {view === "sent" && (
              <>
                <p className={styles.intro}>If an account matches that email address, you’ll receive a password reset link. The link expires in one hour.</p>
                <p className={styles.secondary}>If it doesn’t arrive, check your spam folder or contact <a href={supportEmail}>email support</a>.</p>
                <button type="button" className={styles.primary} onClick={backToSignIn}>Sign in <TbArrowRight aria-hidden="true" /></button>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.bar}>
          <a href="https://wa.me/2349060356610" target="_blank" rel="noopener noreferrer"><TbBrandWhatsapp aria-hidden="true" /> WhatsApp support</a>
          <a href={supportEmail}><TbMail aria-hidden="true" /> Email support</a>
        </div>
      </footer>
    </div>
  );
}
