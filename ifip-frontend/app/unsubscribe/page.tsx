"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { unsubscribeMarketing } from "@/lib/api/services";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const unsubscribe = async () => {
    setState("saving"); setError("");
    try { await unsubscribeMarketing(token); setState("done"); }
    catch (reason) { setState("error"); setError(reason instanceof Error ? reason.message : "Unable to update your email preference."); }
  };
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f7f5ef] px-4 py-12 text-[#101f3f]">
      <section aria-labelledby="unsubscribe-title" className="w-full max-w-lg rounded-2xl border border-[#d8e0e8] bg-white p-6 text-center shadow-sm sm:p-9">
        <h1 id="unsubscribe-title" className="font-display text-2xl font-bold">{state === "done" ? "You’re unsubscribed" : "Unsubscribe from IFIP marketing emails"}</h1>
        {state === "done" ? <p className="mt-3 text-sm leading-relaxed text-[#465a74]">You won’t receive further IFIP campaign emails. Essential application and account messages are not affected.</p> : <>
          <p className="mt-3 text-sm leading-relaxed text-[#465a74]">Confirm to stop future campaign emails. Essential application and account messages are not affected.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {!token && <p role="alert" className="mt-3 text-sm text-red-700">This unsubscribe link is missing its token. Open the complete link from your email.</p>}
          <button type="button" disabled={!token || state === "saving"} onClick={() => void unsubscribe()} className="mt-5 min-h-11 rounded-lg bg-[#101f3f] px-5 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]">
            {state === "saving" ? "Updating…" : "Unsubscribe"}
          </button>
        </>}
        <p className="mt-5"><Link href="/" className="text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]">Return to IFIP</Link></p>
      </section>
    </main>
  );
}

export default function UnsubscribePage() {
  return <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm">Loading unsubscribe page…</main>}><UnsubscribeContent /></Suspense>;
}
