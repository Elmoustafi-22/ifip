"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { submitPartnerApplication, uploadLogo } from "@/lib/api/services";

const SECTOR_OPTIONS = [
  "Islamic Banking",
  "Takaful (Islamic Insurance)",
  "Sukuk & Capital Markets",
  "Islamic Asset Management",
  "Waqf & Endowments",
  "Zakat & Philanthropy",
  "Islamic FinTech",
  "Shariah Advisory & Consulting",
  "Halal Finance",
  "Accounting & Audit",
  "Law & Compliance",
  "Other",
];

export default function PartnerApplyPage() {
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
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
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#000666] hover:underline"
          >
            ← Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]" style={{ fontFamily: "'Sora', 'Segoe UI', Arial, sans-serif" }}>
      {/* Hero Header */}
      <div className="bg-[#000666] text-white py-16 px-4 text-center">
        <Link href="/" className="inline-block mb-8">
          <Image
            src="https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863951/logo-white-wordmark_bkpjzz.png"
            alt="IFIP Logo"
            width={140}
            height={40}
            className="h-10 w-auto mx-auto"
          />
        </Link>
        <h1
          className="text-3xl sm:text-4xl font-black mb-3 max-w-2xl mx-auto"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Become an IFIP Partner
        </h1>
        <p className="text-[#80D8FF] text-base max-w-xl mx-auto leading-relaxed">
          Join our growing network of Islamic finance firms shaping the next generation of industry professionals.
          Fill in the form below and our team will be in touch.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden">
          {/* Section: Organization Info */}
          <div className="border-b border-[#E7E2D8] px-8 py-5 bg-[#FDFBF7]">
            <h2 className="font-black text-[#000666] text-lg">Organization Information</h2>
            <p className="text-sm text-slate-500 mt-0.5">Tell us about the company applying for partnership.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 flex flex-col gap-6">
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
                placeholder="e.g. Al-Noor Capital Advisory"
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
                placeholder="e.g. https://alnoor-capital.com"
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
                {SECTOR_OPTIONS.map((sector) => {
                  const active = selectedSectors.includes(sector);
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => toggleSector(sector)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? "bg-[#000666] text-white border-[#000666]"
                          : "bg-white text-slate-600 border-[#E7E2D8] hover:border-[#000666]/40 hover:text-[#000666]"
                      }`}
                    >
                      {sector}
                    </button>
                  );
                })}
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

            {/* Divider: Contact Details */}
            <div className="-mx-8 border-t border-[#E7E2D8] pt-6 px-8">
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
                    placeholder="e.g. Ibrahim Al-Hassan"
                    className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contact Email */}
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
                      placeholder="e.g. ibrahim@alnoor.com"
                      className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] transition-colors"
                    />
                  </div>

                  {/* Contact Phone */}
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
                      placeholder="e.g. +234 801 234 5678"
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
    </div>
  );
}
