"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerJobOpeningsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/partner-portal/openings");
  }, [router]);

  return (
    <div className="p-12 text-center text-sm text-slate-500">
      Redirecting to Job Openings...
    </div>
  );
}
