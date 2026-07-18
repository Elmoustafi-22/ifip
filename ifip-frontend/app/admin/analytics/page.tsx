"use client";

import { useState, useEffect } from "react";
import {
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineGlobeAlt,
  HiOutlineCommandLine,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";

export default function AdminAnalyticsPage() {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [tempShareUrl, setTempShareUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "setup">("dashboard");
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // 1. Get from process.env or fallback to localStorage override
    const envUrl = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL || "";
    const localOverride = localStorage.getItem("adminUmamiShareUrlOverride") || "";
    const activeUrl = localOverride || envUrl;

    setShareUrl(activeUrl);
    setTempShareUrl(activeUrl);

    // If no URL is set, direct user to the setup guide automatically
    if (!activeUrl) {
      setActiveTab("setup");
    }
  }, []);

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaveSuccess(false);

    try {
      const trimmed = tempShareUrl.trim();
      if (trimmed && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
      }

      if (trimmed) {
        localStorage.setItem("adminUmamiShareUrlOverride", trimmed);
        setShareUrl(trimmed);
      } else {
        localStorage.removeItem("adminUmamiShareUrlOverride");
        setShareUrl(process.env.NEXT_PUBLIC_UMAMI_SHARE_URL || "");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIframeLoading(true);
      setActiveTab("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to validate URL.");
    }
  };

  const handleClearOverride = () => {
    localStorage.removeItem("adminUmamiShareUrlOverride");
    const envUrl = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL || "";
    setShareUrl(envUrl);
    setTempShareUrl(envUrl);
    setIframeLoading(true);
    if (!envUrl) {
      setActiveTab("setup");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2 flex items-center gap-2.5">
            <HiOutlineChartBar className="w-8 h-8 text-[#0E1B5D] shrink-0" />
            Website Analytics
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor page views, active visitors, referrers, and device breakdowns in real-time.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/60 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white text-[#000666] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "setup"
                ? "bg-white text-[#000666] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Integration Guide
          </button>
        </div>
      </div>

      {activeTab === "dashboard" ? (
        shareUrl ? (
          <div className="flex flex-col gap-4">
            {/* Top Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-[#000666]">Umami Analytics Connected</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setIframeLoading(true);
                    const iframe = document.getElementById("analytics-iframe") as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Reload analytics dashboard"
                >
                  <HiOutlineArrowPath className={`w-3.5 h-3.5 ${iframeLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setActiveTab("setup")}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <HiOutlineCog6Tooth className="w-3.5 h-3.5" />
                  Settings
                </button>
              </div>
            </div>

            {/* Dashboard Iframe Card */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden relative min-h-[700px] flex flex-col">
              {iframeLoading && (
                <div className="absolute inset-0 bg-[#FDFBF7]/80 flex flex-col items-center justify-center gap-3 z-10">
                  <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs text-slate-400 font-bold">Loading dashboard live stream...</p>
                </div>
              )}
              <iframe
                id="analytics-iframe"
                src={shareUrl}
                className="w-full min-h-[700px] border-none flex-1"
                onLoad={() => setIframeLoading(false)}
                allow="fullscreen"
              ></iframe>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center flex flex-col items-center max-w-2xl mx-auto gap-6 mt-10">
            <div className="p-4 bg-[#000666]/5 rounded-full text-[#000666]">
              <HiOutlineChartBar className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#000666] mb-2 font-display">No Analytics Dashboard Configured</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Connect a self-hosted or cloud-hosted Umami dashboard to view analytics insights directly within the admin workspace.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("setup")}
              className="bg-impact-orange hover:bg-impact-orange/95 text-white font-bold text-sm px-6 py-3 rounded-lg hover-lift transition-all cursor-pointer font-sans"
            >
              Get Integration Instructions
            </button>
          </div>
        )
      ) : (
        /* SETUP / INTEGRATION GUIDE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main instructions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-7 h-7 bg-[#000666]/10 text-[#000666] rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Create a Website in Umami</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Umami is a privacy-focused alternative to Google Analytics. You can create a free account at{" "}
                <a
                  href="https://umami.is"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-vibrant-blue font-semibold hover:underline"
                >
                  umami.is
                </a>
                . Once logged in, go to your dashboard, click <strong>Add website</strong>, and enter:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1 text-slate-700">
                <div>Name: IFIP Website</div>
                <div>Domain: ifip.nextif.org</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-7 h-7 bg-[#000666]/10 text-[#000666] rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Embed script in the project</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Add the Umami script to your root layout [layout.tsx](file:///c:/Users/abdul/Desktop/IFIP-Folder/IFIP/ifip-frontend/app/layout.tsx) under the <code>&lt;head&gt;</code> tag so it tracks page visits.
              </p>
              <div className="bg-slate-900 text-white rounded-lg p-4 font-mono text-xs overflow-x-auto relative group">
                <pre>{`<script
  defer
  src="https://cloud.umami.is/script.js"
  data-website-id="YOUR-WEBSITE-ID-HERE"
/>`}</pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-7 h-7 bg-[#000666]/10 text-[#000666] rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Enable Share URL</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                In Umami dashboard, go to <strong>Website Settings &rarr; Share URL</strong>. Click **Generate share URL**.
                This makes the dashboard viewable inside the admin panel iframe. Copy that link (it starts with <code>https://cloud.umami.is/share/...</code>).
              </p>
            </div>
          </div>

          {/* Sidebar configuration panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col gap-6 sticky top-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="text-[#0E1B5D]">
                  <HiOutlineGlobeAlt className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#000666] font-display">Configuration</h3>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 font-semibold">
                  <HiOutlineCheck className="w-4 h-4 shrink-0" />
                  Settings saved locally!
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 font-semibold">
                  <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveOverride} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Umami Share URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://cloud.umami.is/share/..."
                    value={tempShareUrl}
                    onChange={(e) => setTempShareUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-[6px] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0E1B5D] bg-slate-50/20"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Pasting your Share URL here saves it to your browser's local storage for instant previewing.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs py-2.5 rounded-[6px] shadow-sm transition-all cursor-pointer text-center"
                  >
                    Save to Preview
                  </button>
                  {localStorage.getItem("adminUmamiShareUrlOverride") && (
                    <button
                      type="button"
                      onClick={handleClearOverride}
                      className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-2.5 rounded-[6px] transition-all cursor-pointer text-center"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </form>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Production Setup</h4>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  To persist this dashboard permanently for all administrators, define this environment variable in your Vercel deployment settings:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mt-2 text-[10px] font-mono break-all text-slate-600 selection:bg-slate-200">
                  NEXT_PUBLIC_UMAMI_SHARE_URL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
