"use client";

import { useState, useEffect, useRef } from "react";
import {
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineCheck,
  HiOutlineArrowUpTray,
  HiOutlineExclamationTriangle
} from "react-icons/hi2";
import { getMyApplication, updateMyApplication, uploadCvAuth } from "@/lib/api/services";
import { changePassword } from "@/lib/api/auth";

// Common country list for dial codes & location matching screen-7.png
const POPULAR_COUNTRIES = [
  { code: "NG", dialCode: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "AE", dialCode: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "SA", dialCode: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "GB", dialCode: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", name: "United States" },
  { code: "CA", dialCode: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "MY", dialCode: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "EG", dialCode: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "PK", dialCode: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "QA", dialCode: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "KW", dialCode: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "BH", dialCode: "+973", flag: "🇧🇭", name: "Bahrain" }
];

const STATUS_OPTIONS = [
  "Undergraduate Student",
  "Final Year Undergraduate",
  "Graduate / Seeking Placement",
  "Postgraduate Student",
  "Working Professional",
  "Other"
];

const INTEREST_OPTIONS = [
  "Shariah-Compliant Asset Management",
  "Islamic Banking Operations",
  "Islamic Finance Advisory",
  "Shariah Advisory Support",
  "Investment & Wealth Management",
  "Risk Management (Takaful)",
  "Compliance & Governance",
  "Capital Markets (Sukuk & Structured Finance)",
  "Ethical FinTech",
  "Research & Policy Development",
  "Other"
];

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+234");
  const [country, setCountry] = useState("Nigeria");
  const [stateCity, setStateCity] = useState("");

  // Academic States
  const [academicStatus, setAcademicStatus] = useState("");
  const [institution, setInstitution] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  // Preferences States
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [secondaryInterest, setSecondaryInterest] = useState("");
  const [availability, setAvailability] = useState("Immediate");

  // CV PDF upload States
  const [cvUrl, setCvUrl] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvError, setCvError] = useState("");

  // Change Password States
  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Global Page States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch candidate profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyApplication();
        if (data) {
          setFullName(data.fullName || "");
          setEmail(data.email || "");
          setCountry(data.country || "Nigeria");
          setStateCity(data.stateCity || "");
          setCvUrl(data.cvUrl || "");

          // Phone parsing logic
          if (data.phone) {
            const rawPhone = data.phone.trim();
            const matchedDial = POPULAR_COUNTRIES.find(c => rawPhone.startsWith(c.dialCode));
            if (matchedDial) {
              setDialCode(matchedDial.dialCode);
              setPhone(rawPhone.substring(matchedDial.dialCode.length).trim());
            } else {
              setPhone(rawPhone);
            }
          }

          // Academic parsing logic
          if (data.academicInfo) {
            setAcademicStatus(data.academicInfo.status || "");
            setInstitution(data.academicInfo.institution || "");
            setFieldOfStudy(data.academicInfo.fieldOfStudy || "");
            setGraduationYear(data.academicInfo.gradYear ? String(data.academicInfo.gradYear) : "");
          }

          // Preferences parsing logic
          if (data.programInterest) {
            if (Array.isArray(data.programInterest.primary)) {
              setPrimaryInterest(data.programInterest.primary[0] || "");
            } else {
              setPrimaryInterest(data.programInterest.primary || "");
            }
            setSecondaryInterest(data.programInterest.secondary || "");
          }

          if (data.skills?.availability) {
            setAvailability(data.skills.availability);
          }
        }
      } catch (err) {
        console.error("Failed to load settings profile:", err);
        setErrorMsg("Failed to retrieve profile details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Update country details automatically when location dropdown changes
  const handleLocationChange = (val: string) => {
    setCountry(val);
    // Sync dial code flag automatically for better UX
    const matched = POPULAR_COUNTRIES.find(c => c.name === val);
    if (matched) {
      setDialCode(matched.dialCode);
    }
  };

  // Upload CV PDF Handler
  const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setCvError("Only PDF documents are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError("File size exceeds 5MB limit.");
      return;
    }

    setCvError("");
    setUploadingCv(true);
    try {
      const res = await uploadCvAuth(file);
      setCvUrl(res.cvUrl);
    } catch (err: any) {
      setCvError(err.message || "Failed to upload CV. Please try again.");
    } finally {
      setUploadingCv(false);
    }
  };

  // Profile Form Submit Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      setSaving(false);
      return;
    }

    // Format phone
    const formattedPhone = phone.trim() ? `${dialCode} ${phone.trim()}`.replace(/\s+/g, " ") : "";

    const payload = {
      fullName: fullName.trim(),
      phone: formattedPhone,
      country,
      stateCity: stateCity.trim(),
      academicInfo: {
        status: academicStatus,
        institution: institution.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        gradYear: graduationYear ? Number(graduationYear) : undefined
      },
      programInterest: {
        primary: primaryInterest ? [primaryInterest] : [],
        secondary: secondaryInterest || undefined
      },
      skills: {
        availability
      },
      cvUrl
    };

    try {
      await updateMyApplication(payload);
      setSuccessMsg("Your profile has been successfully saved.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  // Security Form Submit Handler (Change Password)
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Hide section after delay
      setTimeout(() => {
        setShowSecurity(false);
        setPasswordSuccess("");
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password. Double check your current credentials.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDiscard = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-slate-400 font-semibold">Loading profile settings...</p>
      </div>
    );
  }

  // Get file name from URL
  const getCvName = (url: string) => {
    if (!url) return "";
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn font-sans pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200/60 pb-6">
        <h1 className="text-2xl font-display font-black text-[#000666]">Participant Profile</h1>
        <p className="text-sm text-slate-500 font-medium">
          Manage your personal, academic, and professional details for the internship program.
        </p>
      </div>

      {/* Global Message Banners */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-sm font-semibold rounded-xl p-4 flex items-center gap-3">
          <HiOutlineCheck className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-250 text-red-800 text-sm font-semibold rounded-xl p-4 flex items-center gap-3">
          <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-8">
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 md:p-8 flex flex-col gap-6 relative">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="text-[#0E1B5D]">
              <HiOutlineUser className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#000666] font-display">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="fullname" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Full Name</label>
              <input
                id="fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                placeholder="Ahmad Al-Farsi"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none bg-slate-100/60 text-slate-400 font-medium cursor-not-allowed"
                placeholder="ahmad.farsi@university.edu"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500 tracking-wide">WhatsApp Phone</label>
              <div className="flex gap-2 min-w-0">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="shrink-0 w-[110px] border border-slate-200 rounded-[6px] px-2 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 min-w-0 border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                  placeholder="50 123 4567"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="location" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Location</label>
              <select
                id="location"
                value={country}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
              >
                {POPULAR_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: ACADEMIC PROFILE */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="text-[#0E1B5D]">
              <HiOutlineAcademicCap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#000666] font-display">Academic Profile</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="academic-status" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Current Status</label>
              <select
                id="academic-status"
                value={academicStatus}
                onChange={(e) => setAcademicStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
              >
                <option value="">Select Academic Status</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="institution" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Institution</label>
              <input
                id="institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                placeholder="Zayed University"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="field" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Field of Study</label>
              <input
                id="field"
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                placeholder="Islamic Finance & Economics"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="grad-year" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Graduation Year</label>
              <input
                id="grad-year"
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                placeholder="2026"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: INTERNSHIP PREFERENCES & DOCUMENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preferences Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="text-[#0E1B5D]">
                  <HiOutlineBriefcase className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Internship Preferences</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="primary-focus" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Primary Focus</label>
                  <select
                    id="primary-focus"
                    value={primaryInterest}
                    onChange={(e) => setPrimaryInterest(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                  >
                    <option value="">Select Primary Track</option>
                    {INTEREST_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="secondary-focus" className="text-xs font-bold uppercase text-slate-500 tracking-wide">Secondary Focus</label>
                  <select
                    id="secondary-focus"
                    value={secondaryInterest}
                    onChange={(e) => setSecondaryInterest(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                  >
                    <option value="">Select Secondary Track</option>
                    {INTEREST_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Availability</label>
                  <div className="flex items-center gap-6 mt-1 text-sm font-semibold">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                      <input
                        type="radio"
                        value="Immediate"
                        checked={availability === "Immediate"}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="text-[#0E1B5D] focus:ring-[#0E1B5D]"
                      />
                      Immediate
                    </label>
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                      <input
                        type="radio"
                        value="Q3 2026"
                        checked={availability === "Q3 2026"}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="text-[#0E1B5D] focus:ring-[#0E1B5D]"
                      />
                      Q3 2026
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Upload Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 flex flex-col justify-between">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="text-[#0E1B5D]">
                  <HiOutlineDocumentText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Documents</h3>
              </div>

              {cvError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                  {cvError}
                </div>
              )}

              {/* PDF Preview Dashed Area */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center bg-slate-50/40 relative min-h-[140px]">
                {uploadingCv ? (
                  <div className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-500 animate-pulse">
                    <svg className="animate-spin w-6 h-6 text-[#0E1B5D]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading CV PDF...
                  </div>
                ) : cvUrl ? (
                  <div className="flex flex-col items-center gap-2 select-none">
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-500 border border-red-100 mb-1">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800 break-all max-w-[200px]">
                      {getCvName(cvUrl) || "Curriculum_Vitae.pdf"}
                    </span>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#FF9800] hover:underline font-bold mt-0.5"
                    >
                      View Uploaded Document &rarr;
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400 select-none">
                    <HiOutlineArrowUpTray className="w-8 h-8 opacity-60 mb-1" />
                    <span className="text-xs font-bold text-slate-700">No CV Uploaded</span>
                    <span className="text-[10px] leading-relaxed max-w-[180px]">
                      Upload your curriculum vitae to complete admissions tracking parameters.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCvChange}
                accept="application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCv}
                className="w-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs py-3.5 rounded-[6px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HiOutlineArrowUpTray className="w-4 h-4" />
                Update CV (PDF)
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: ACCOUNT SECURITY */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-level1 p-6 md:p-8 flex flex-col gap-6">
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
                  Ensure your candidate portal remains secure with a strong password.
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

            {/* Slide-down form block */}
            {showSecurity && (
              <div className="border-t border-slate-100 pt-6 mt-2 flex flex-col gap-5 animate-slideDown max-w-md w-full">
                {passwordError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-semibold">
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
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-6 border-t border-slate-200/60 pt-6 mt-2">
          <button
            type="button"
            onClick={handleDiscard}
            className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold text-xs px-8 py-3.5 rounded-[6px] shadow-md hover-lift transition-all disabled:bg-slate-300 cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
