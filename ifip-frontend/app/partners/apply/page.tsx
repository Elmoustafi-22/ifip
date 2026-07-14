"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { submitPartnerApplication, uploadLogo } from "@/lib/api/services";
import { getAccessToken } from "@/lib/api/auth";

import { useFormOptions } from "@/lib/hooks/useFormOptions";
import { motion } from "framer-motion";


export default function PartnerApplyPage() {
  const { options: sectorOptions, loading: loadingSectors } = useFormOptions("sector_tags");

  // Nav state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [activeSlots, setActiveSlots] = useState<number | "">("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !contactPerson.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl: string | undefined;

      if (logoFile) {
        try {
          const uploadRes = await uploadLogo(logoFile);
          logoUrl = uploadRes.url;
        } catch {
          setError("Logo upload failed. Please try again or skip the logo.");
          setSubmitting(false);
          return;
        }
      }

      await submitPartnerApplication({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        activeSlots: activeSlots !== "" ? Number(activeSlots) : undefined,
        sectorTags: selectedSectors.length > 0 ? selectedSectors : undefined,
        logoUrl,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "An error occurred while submitting your application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared nav + bottom nav wrapper for success screen ─────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col pb-16 md:pb-0">
      {/* ── Sticky Navbar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-3 md:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <Link href="/#curriculum" className="text-on-surface/80 hover:text-primary transition-colors">Curriculum</Link>
            <Link href="/#process" className="text-on-surface/80 hover:text-primary transition-colors">Process</Link>
            <Link href="/#partners" className="text-on-surface/80 hover:text-primary transition-colors">Partners</Link>
            <Link href="/#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</Link>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
              Login
            </Link>
            <Link
              href="/apply"
              className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm transition-all"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile hamburger */}
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

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-45 bg-background md:hidden flex flex-col px-6 py-8 border-t border-outline-variant/30 gap-6">
          <Link href="/#curriculum" onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Curriculum</Link>
          <Link href="/#process"    onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Process</Link>
          <Link href="/#partners"   onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">Partners</Link>
          <Link href="/#faq"        onClick={() => setMobileMenuOpen(false)} className="text-lg font-semibold border-b border-outline-variant/20 pb-2">FAQ</Link>
          <div className="flex flex-col gap-4 mt-6">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center font-semibold border border-primary/20 py-3 rounded-[4px] hover:bg-primary/5 transition-colors">
              Login
            </Link>
            <Link href="/apply" onClick={() => setMobileMenuOpen(false)} className="text-center bg-impact-orange text-white font-semibold py-3 rounded-[4px]">
              Apply Now
            </Link>
          </div>
        </div>
      )}

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-outline-variant/30 px-6 py-2 flex items-center justify-between shadow-lg font-sans">
        {/* Home */}
        <Link href="/" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>

        {/* Apply (candidate) / Dashboard (logged in) */}
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

        {/* Partner (active — highlighted) */}
        <span className="flex flex-col items-center gap-1 text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Partner</span>
        </span>

        {/* Login / Profile */}
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

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-black text-3xl text-[#000666] mb-3" style={{ fontFamily: "Georgia, serif" }}>
              Application Received!
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              Thank you, <strong>{contactPerson}</strong>. We have received the partnership application for{" "}
              <strong>{companyName}</strong>. Our team will review it and reach out to you at{" "}
              <strong>{contactEmail}</strong> within <strong>3–5 business days</strong>.
            </p>
            <div className="bg-[#000666]/5 border border-[#000666]/10 rounded-2xl p-5 mb-8 text-left">
              <p className="text-xs font-bold text-[#000666] mb-2 uppercase tracking-wider">What happens next?</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">1.</span>
                  <span>Our admissions team reviews your application.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">2.</span>
                  <span>You receive an email with our decision and next steps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">3.</span>
                  <span>If approved, your organization is listed and eligible for intern placements.</span>
                </li>
              </ul>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#000666] hover:underline">
              ← Return to Homepage
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Shell>
      {/* Hero Banner */}
      <div className="bg-[#000666] text-white py-10 sm:py-14 px-4 text-center">
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 max-w-2xl mx-auto"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Become an IFIP Partner
        </h1>
        <p className="text-[#80D8FF] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Join our growing network of Islamic finance firms shaping the next generation of industry professionals.
          Fill in the form below and our team will be in touch.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto py-8 sm:py-12 px-3 sm:px-6" style={{ fontFamily: "'Sora', 'Segoe UI', Arial, sans-serif" }}>
        <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="border-b border-[#E7E2D8] px-4 sm:px-8 py-5 bg-[#FDFBF7]">
            <h2 className="font-black text-[#000666] text-lg">Organization Information</h2>
            <p className="text-sm text-slate-500 mt-0.5">Tell us about the company applying for partnership.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-4 sm:px-8 py-6 sm:py-7 flex flex-col gap-6">
            {/* Company Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="partner-company-name"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Your Company Name"
                className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
              />
            </div>

            {/* Website */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Website URL</label>
              <input
                id="partner-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://yourcompany.com"
                className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">About the Organization</label>
              <textarea
                id="partner-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your organization, its focus, and why you're interested in partnering with IFIP…"
                rows={4}
                className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors resize-none"
              />
            </div>

            {/* Sector Tags */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Sector / Area of Focus</label>
              <p className="text-xs text-slate-400">Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {loadingSectors ? (
                  <span className="text-xs text-slate-400 animate-pulse font-medium">Loading sectors...</span>
                ) : (
                  sectorOptions.map((sector) => {
                    const active = selectedSectors.includes(sector.label);
                    return (
                      <button
                        key={sector.value}
                        type="button"
                        onClick={() => toggleSector(sector.label)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#000666] text-white border-[#000666]"
                            : "bg-white text-slate-600 border-[#E7E2D8] hover:border-[#000666]/40 hover:text-[#000666]"
                        }`}
                      >
                        {sector.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Available Slots */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">
                Number of Intern Slots Available{" "}
                <span className="font-normal text-slate-400">(approximate)</span>
              </label>
              <input
                id="partner-active-slots"
                type="number"
                min={0}
                value={activeSlots}
                onChange={(e) => setActiveSlots(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 3"
                className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
              />
            </div>

            {/* Logo Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Company Logo</label>
              <div
                className="border-2 border-dashed border-[#E7E2D8] rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-[#000666]/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="relative w-24 h-24">
                    <Image src={logoPreview} alt="Logo preview" fill className="object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-600">
                    {logoPreview ? "Click to change logo" : "Click to upload logo"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, SVG — max 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="-mx-4 sm:-mx-8 border-t border-[#E7E2D8] pt-6 px-4 sm:px-8">
              <h2 className="font-black text-[#000666] text-lg mb-1">Primary Contact</h2>
              <p className="text-sm text-slate-500 mb-5">
                Who should we reach out to regarding this application?
              </p>

              <div className="flex flex-col gap-5">
                {/* Contact Person */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="partner-contact-person"
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Your Full Name"
                    className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="partner-contact-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. contact@yourcompany.com"
                      className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="partner-contact-phone"
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. +000 800 000 0000"
                      className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Declaration */}
            <div className="bg-[#000666]/5 border border-[#000666]/10 rounded-xl px-5 py-4 text-xs text-slate-500 leading-relaxed">
              By submitting this form, you confirm that the information provided is accurate and that your organization
              is interested in hosting Islamic finance interns as part of the IFIP program. Your application will be
              reviewed by our admissions team and you will be notified by email.
            </div>

            {/* Submit */}
            <button
              id="partner-apply-submit"
              type="submit"
              disabled={submitting}
              className="w-full bg-[#000666] hover:bg-[#000555] text-white font-black text-sm py-4 rounded-xl transition-colors disabled:bg-slate-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting Application…
                </>
              ) : (
                "Submit Partnership Application"
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Already a partner or have questions?{" "}
              <Link href="/" className="text-[#000666] font-bold hover:underline">
                Return to Homepage
              </Link>
            </p>
          </form>
        </div>
      </div>
    </Shell>
  );
}
