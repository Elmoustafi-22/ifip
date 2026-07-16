"use client";

import { useState, useEffect } from "react";
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineCheck,
  HiOutlineExclamationTriangle
} from "react-icons/hi2";
import { getMyApplication } from "@/lib/api/services";
import {
  changePassword,
  mfaSetup,
  mfaEnable,
  mfaDisable,
  updateProfile
} from "@/lib/api/auth";

export default function AdminSettingsPage() {
  // Profile Info States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");

  // Change Password States
  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // MFA States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");

  // Global Page States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const data = await getMyApplication();
        if (data) {
          setFullName(data.fullName || "Admin User");
          setEmail(data.email || "");
          setTitle(data.title || "");
          setRole(data.role || "admin");
          setMfaEnabled(data.mfaEnabled || false);
        }
      } catch (err: any) {
        console.error("Failed to load settings profile:", err);
        setErrorMsg("Failed to retrieve profile details.");
      } finally {
        setLoading(false);
      }
    };
    fetchAdminProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await updateProfile(fullName.trim(), title.trim() || undefined);
      setSuccessMsg("Profile settings updated successfully!");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChangeSubmit = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMfaSetupStart = async () => {
    setMfaLoading(true);
    setMfaError("");
    setMfaSuccess("");
    try {
      const data = await mfaSetup();
      setMfaSecret(data.secret);
      setMfaQrCode(data.qrCode);
      setShowMfaSetup(true);
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || err.message || "Failed to initiate MFA setup.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaEnableSubmit = async () => {
    if (!mfaSetupCode) {
      setMfaError("Please enter the verification code.");
      return;
    }
    setMfaLoading(true);
    setMfaError("");
    try {
      await mfaEnable(mfaSecret, mfaSetupCode);
      setMfaEnabled(true);
      setShowMfaSetup(false);
      setMfaSuccess("MFA has been successfully enabled on your account.");
      setMfaSetupCode("");
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || err.message || "Failed to enable MFA.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisableSubmit = async () => {
    const code = prompt("Please enter the 6-digit verification code from your authenticator app to disable MFA:");
    if (!code) return;
    setMfaLoading(true);
    setMfaError("");
    setMfaSuccess("");
    try {
      await mfaDisable(code);
      setMfaEnabled(false);
      setMfaSuccess("MFA has been successfully disabled.");
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || err.message || "Failed to disable MFA. Incorrect code.");
    } finally {
      setMfaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-slate-400 font-semibold">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Account Settings</h1>
        <p className="text-slate-500 text-sm">Update your administrative profile details and secure your access credentials.</p>
      </div>

      {successMsg && (
        <div role="status" aria-live="polite" className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-semibold">
          <HiOutlineCheck className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-semibold">
          <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="space-y-8">
        
        {/* SECTION 1: PROFILE INFORMATION */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="text-[#0E1B5D]">
              <HiOutlineUser className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#000666] font-display">Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-fullname" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Full Name
              </label>
              <input
                id="admin-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm bg-slate-100/50 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-title" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Startup Position / Title
              </label>
              <input
                id="admin-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Program Director"
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                System Role (Read-only)
              </label>
              <input
                type="text"
                disabled
                value={role === "superadmin" ? "Super Administrator" : "Administrator"}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm bg-slate-100/50 text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: ACCOUNT SECURITY */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="text-[#0E1B5D]">
              <HiOutlineLockClosed className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#000666] font-display">Account Security</h3>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 text-left">
                <h4 className="text-xs font-bold text-slate-800">Change Account Password</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Ensure your account remains secure with a strong password.
                </p>
              </div>
              {!showSecurity && (
                <button
                  type="button"
                  onClick={() => setShowSecurity(true)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 rounded-[6px] shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Change Password
                </button>
              )}
            </div>

            {/* Slide-down Password change form */}
            {showSecurity && (
              <div className="border-t border-slate-100 pt-6 mt-2 flex flex-col gap-5 animate-slideDown max-w-md w-full">
                {passwordError && (
                  <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div role="status" aria-live="polite" className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-semibold">
                    {passwordSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label htmlFor="curr-pass" className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Current Password</label>
                  <input
                    id="curr-pass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new-pass" className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">New Password</label>
                  <input
                    id="new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="conf-pass" className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Confirm New Password</label>
                  <input
                    id="conf-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handlePasswordChangeSubmit}
                    disabled={passwordLoading}
                    className="flex-1 bg-[#0E1B5D] hover:bg-[#0E1B5D]/95 text-white font-bold text-xs py-3 rounded-[6px] transition-colors cursor-pointer text-center"
                  >
                    {passwordLoading ? "Saving..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecurity(false);
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-[6px] transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-100/80 my-2" />

            {/* MFA Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 text-left">
                <h4 className="text-xs font-bold text-slate-800">Two-Factor Authentication (MFA)</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Add an extra layer of security to your account using an authenticator app.
                </p>
              </div>
              <div className="flex gap-2">
                {mfaEnabled ? (
                  <button
                    type="button"
                    onClick={handleMfaDisableSubmit}
                    disabled={mfaLoading}
                    className="border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs px-5 py-3 rounded-[6px] shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    Disable MFA
                  </button>
                ) : (
                  !showMfaSetup && (
                    <button
                      type="button"
                      onClick={handleMfaSetupStart}
                      disabled={mfaLoading}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 rounded-[6px] shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Set Up Authenticator
                    </button>
                  )
                )}
              </div>
            </div>

            {mfaError && (
              <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold text-left">
                {mfaError}
              </div>
            )}
            {mfaSuccess && (
              <div role="status" aria-live="polite" className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-semibold text-left">
                {mfaSuccess}
              </div>
            )}

            {/* MFA Setup QR & Verification Code Input Form */}
            {showMfaSetup && (
              <div className="border-t border-slate-100 pt-6 mt-2 flex flex-col sm:flex-row gap-6 animate-slideDown">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-center shrink-0">
                  {mfaQrCode ? (
                    <img src={mfaQrCode} alt="MFA QR Code" className="w-40 h-40 object-contain" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400 font-medium animate-pulse">
                      Generating QR...
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-4 max-w-sm text-left">
                  <h5 className="text-xs font-bold text-slate-800">Scan QR Code</h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    1. Scan the QR code with your authenticator app (Google Authenticator, Duo, or Microsoft Authenticator).<br/>
                    2. Or enter the manual key: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono break-all">{mfaSecret}</code>
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="mfa-verify-code" className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                      Enter Verification Code
                    </label>
                    <input
                      id="mfa-verify-code"
                      type="text"
                      maxLength={6}
                      value={mfaSetupCode}
                      onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20 tracking-[0.2em] font-bold"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleMfaEnableSubmit}
                      disabled={mfaLoading}
                      className="flex-1 bg-[#0E1B5D] hover:bg-[#0E1B5D]/95 text-white font-bold text-xs py-3 rounded-[6px] transition-colors cursor-pointer text-center"
                    >
                      {mfaLoading ? "Verifying..." : "Verify & Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMfaSetup(false);
                        setMfaError("");
                        setMfaSuccess("");
                      }}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-[6px] transition-colors cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SAVE BUTTON */}
        <div className="flex items-center justify-end gap-6 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#0E1B5D] hover:bg-[#0E1B5D]/90 text-white font-bold text-xs px-8 py-3.5 rounded-[6px] shadow-md hover-lift transition-all disabled:bg-slate-300 cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
