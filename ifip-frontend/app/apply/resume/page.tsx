"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResumeLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#eef4fa] p-4 font-sans">
      <p role="status" className="rounded-2xl border border-[#cbd8e8] bg-white px-6 py-5 text-base text-[#101f3f]">
        Opening your application…
      </p>
    </div>
  );
}

function ResumeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      router.replace(`/apply?${new URLSearchParams({ token })}`);
    } else {
      router.replace("/apply");
    }
  }, [router, searchParams]);

  return <ResumeLoading />;
}

export default function ResumePage() {
  return (
    <Suspense fallback={<ResumeLoading />}>
      <ResumeRedirect />
    </Suspense>
  );
}
