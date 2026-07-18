"use client";

import { useState, useEffect } from "react";
import {
  HiOutlineChartBar,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";

export default function AdminAnalyticsPage() {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);

  useEffect(() => {
    // Read the configured Share URL from environment variables
    const envUrl = process.env.NEXT_PUBLIC_UMAMI_SHARE_URL || "";
    setShareUrl(envUrl);
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] flex flex-col gap-6 min-h-[calc(100vh-5rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2.5">
            <HiOutlineChartBar className="w-8 h-8 text-[#0E1B5D] shrink-0" />
            Website Analytics
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor real-time page views, visitor demographics, referrers, and device tracking.
          </p>
        </div>

        {shareUrl && (
          <button
            onClick={() => {
              setIframeLoading(true);
              const iframe = document.getElementById("analytics-iframe") as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }}
            className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${iframeLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        )}
      </div>

      {shareUrl ? (
        /* Live Dashboard Iframe Container */
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden relative flex-1 min-h-[750px] flex flex-col">
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
            className="w-full min-h-[750px] border-none flex-1"
            onLoad={() => setIframeLoading(false)}
            allow="fullscreen"
          ></iframe>
        </div>
      ) : (
        /* Setup / Warning State */
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center flex flex-col items-center max-w-2xl mx-auto gap-6 mt-12">
          <div className="p-4 bg-amber-50 rounded-full text-amber-500 border border-amber-100">
            <HiOutlineExclamationTriangle className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#000666] mb-2 font-display">
              Analytics URL Config Required
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md">
              To display real-time charts here, please define the <code>NEXT_PUBLIC_UMAMI_SHARE_URL</code> environment variable in your Vercel project settings or local <code>.env</code> configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
