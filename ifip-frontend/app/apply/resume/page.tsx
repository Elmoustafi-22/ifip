"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResumeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      router.replace(`/apply?token=${token}`);
    } else {
      router.replace("/apply");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-[#000666] border-t-transparent animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Redirecting to your application...</p>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense fallback={null}>
      <ResumeRedirect />
    </Suspense>
  );
}
