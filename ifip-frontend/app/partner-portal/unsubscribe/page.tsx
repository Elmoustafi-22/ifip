"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineBellSlash,
  HiOutlineArrowLeft,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";
import { unsubscribePartner } from "@/lib/api/partner";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage("No unsubscribe token provided. Please click the link directly from your email notification.");
      return;
    }

    let isMounted = true;

    const performUnsubscribe = async () => {
      try {
        const res = await unsubscribePartner(token);
        if (isMounted) {
          setSuccess(res.success);
          setAlreadyUnsubscribed(Boolean(res.alreadyUnsubscribed));
          setMessage(res.message);
        }
      } catch (err: any) {
        if (isMounted) {
          setSuccess(false);
          setMessage(err?.message || "Failed to process unsubscribe request. The link may have expired or is invalid.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    performUnsubscribe();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-8 text-center space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
          <Image
            src="/icon.png"
            alt="IFIP Logo"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Islamic Finance Internship Program
        </p>
      </div>

      {/* Dynamic Status Display */}
      {loading ? (
        <div className="py-8 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#000666] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            Updating your notification preferences...
          </p>
        </div>
      ) : success ? (
        <div className="space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
            <HiOutlineBellSlash className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">
              {alreadyUnsubscribed ? "Already Unsubscribed" : "Unsubscribed Successfully"}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Email notifications for your partner organisation have been turned off. You will no longer receive emails for job opening updates, application digests, or placement matching.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 text-left space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>In-app notifications remain active</span>
            </div>
            <p className="text-slate-500 leading-normal pl-6">
              You will still see all real-time alerts in your Partner Portal notifications bell. You can re-enable emails anytime from Settings.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/partner-portal/settings"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#000666] text-white text-sm font-medium hover:bg-[#000666]/90 transition-colors shadow-sm"
            >
              <HiOutlineCog6Tooth className="w-4 h-4" />
              <span>Notification Settings</span>
            </Link>
            <Link
              href="/partner-portal"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <span>Partner Dashboard</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-3xl">
            <HiOutlineExclamationCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Unable to Unsubscribe</h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {message}
            </p>
          </div>

          <p className="text-xs text-slate-500">
            If you want to manage your email preferences manually, log in to your portal and visit <strong>Settings → Notification Preferences</strong>.
          </p>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#000666] text-white text-sm font-medium hover:bg-[#000666]/90 transition-colors shadow-sm"
            >
              <HiOutlineArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} Islamic Finance Internship Program. All rights reserved.
      </div>
    </div>
  );
}

export default function PartnerUnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#000666] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
