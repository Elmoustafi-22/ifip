"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkPaymentStatus } from "@/lib/api/services";
import { HiShieldCheck, HiXCircle } from "react-icons/hi2";
import { TbLoader2 } from "react-icons/tb";

function VerifyPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment, please wait…");

  useEffect(() => {
    // Paystack appends ?reference= and ?trxref= to the callback URL
    const referenceFromUrl =
      searchParams.get("reference") || searchParams.get("trxref");

    // Retrieve the polling token we saved before redirecting to Paystack
    const pollingToken = localStorage.getItem("paymentPollingToken");
    const storedReference = localStorage.getItem("paymentReference");

    const reference = referenceFromUrl || storedReference;

    if (!reference || !pollingToken) {
      setStatus("failed");
      setMessage("Missing payment reference or session token. Please return to your application and try again.");
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 40 seconds total

    const interval = setInterval(async () => {
      try {
        attempts++;
        const data = await checkPaymentStatus(reference, pollingToken);

        if (data.status === "success") {
          clearInterval(interval);
          // Clean up storage
          localStorage.removeItem("paymentReference");
          localStorage.removeItem("paymentPollingToken");
          setStatus("success");
          setMessage("Payment confirmed! Redirecting you back to complete your application…");
          // Redirect back to /apply — the page will detect paymentVerified via server state
          setTimeout(() => {
            router.replace("/apply?payment=verified");
          }, 2000);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setStatus("failed");
          setMessage("Payment was not successful. Please go back and try again.");
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          setStatus("failed");
          setMessage("Payment verification timed out. If your bank was charged, please contact support. Otherwise, please try again.");
        }
      } catch (err: any) {
        console.error("Verification polling error:", err);
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          setStatus("failed");
          setMessage("Unable to reach our servers. Please check your connection and try again.");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#f9f9fb] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-lg border border-outline-variant/20 p-10 max-w-md w-full text-center flex flex-col items-center gap-6">

        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary/60">IFIP</span>
          <span className="text-lg font-display font-black text-primary">Islamic Finance Internship</span>
        </div>

        {/* Status Icon */}
        {status === "verifying" && (
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
            <TbLoader2 className="w-10 h-10 animate-spin" />
          </div>
        )}
        {status === "success" && (
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 animate-bounce">
            <HiShieldCheck className="w-12 h-12" />
          </div>
        )}
        {status === "failed" && (
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
            <HiXCircle className="w-12 h-12" />
          </div>
        )}

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-display font-bold text-primary">
            {status === "verifying" && "Verifying Payment…"}
            {status === "success" && "Payment Confirmed!"}
            {status === "failed" && "Payment Verification Failed"}
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{message}</p>
        </div>

        {/* Progress dots for verifying state */}
        {status === "verifying" && (
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {/* Retry button on failure */}
        {status === "failed" && (
          <button
            onClick={() => router.replace("/apply")}
            className="bg-primary hover:bg-primary/95 text-white font-bold text-sm px-8 py-3 rounded-[6px] cursor-pointer shadow-md transition-all"
          >
            ← Return to Application
          </button>
        )}

        <p className="text-[10px] text-on-surface-variant/60 font-medium">
          Do not close this window. Your payment is being verified securely.
        </p>
      </div>
    </main>
  );
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f9f9fb] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl shadow-lg border border-outline-variant/20 p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60">IFIP</span>
            <span className="text-lg font-display font-black text-primary">Islamic Finance Internship</span>
          </div>
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
            <TbLoader2 className="w-10 h-10 animate-spin" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-display font-bold text-primary">Verifying Payment…</h1>
            <p className="text-sm text-on-surface-variant leading-relaxed font-medium">Verifying your payment, please wait…</p>
          </div>
        </div>
      </main>
    }>
      <VerifyPaymentContent />
    </Suspense>
  );
}
