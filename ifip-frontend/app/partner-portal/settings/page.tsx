"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  HiOutlineCog6Tooth,
  HiOutlineBuildingOffice2,
  HiOutlineUser,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi2";
import { getPartnerMe, updatePartnerSettings } from "@/lib/api/partner";

export default function PartnerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [sectorTagsInput, setSectorTagsInput] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await getPartnerMe();
        const org = res.org;
        setContactPerson(org.contactPerson || "");
        setContactPhone(org.contactPhone || "");
        setContactEmail(org.contactEmail || "");
        setWebsite(org.website || "");
        setDescription(org.description || "");
        setSectorTagsInput((org.sectorTags || []).join(", "));
        setLogoUrl(org.logoUrl || "");
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    const sectorTags = sectorTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updatePartnerSettings({
        contactPerson,
        contactPhone,
        contactEmail,
        website,
        description,
        sectorTags,
        logoUrl,
      });
      setSuccessMsg("Organisation settings updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-slate-200/70 rounded-lg" />
        <div className="h-64 bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000666] tracking-tight">
            Organisation Settings &amp; Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Update primary contact information, organisation description, and branding.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center space-x-2 font-medium">
          <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center space-x-2 font-medium">
          <HiOutlineExclamationCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Contact Representative */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <HiOutlineUser className="w-4 h-4 text-[#000666]" />
            <span>Primary Contact Person</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email Address</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Organisation Branding & Details */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <HiOutlineBuildingOffice2 className="w-4 h-4 text-[#000666]" />
            <span>Organisation Details &amp; Branding</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Image URL</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
              {logoUrl && (
                <div className="mt-2 flex items-center space-x-3 p-2 bg-slate-50 rounded-xl border border-slate-200 w-fit">
                  <div className="relative w-8 h-8 rounded overflow-hidden bg-white border border-slate-200">
                    <Image src={logoUrl} alt="Logo Preview" fill className="object-contain p-0.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">Logo Preview</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sector Tags (Comma Separated)</label>
              <input
                type="text"
                placeholder="Islamic Banking, Takaful, Sukuk, FinTech"
                value={sectorTagsInput}
                onChange={(e) => setSectorTagsInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organisation Description</label>
              <textarea
                rows={4}
                placeholder=""
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-lg bg-[#000666] hover:bg-[#000666]/90 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
