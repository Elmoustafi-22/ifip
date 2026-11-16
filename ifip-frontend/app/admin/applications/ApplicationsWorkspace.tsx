"use client";

import Link from "next/link";
import { useContext } from "react";
import { AdminCohortContext } from "../layout";
import PaidApplications from "./PaidApplications";
import PendingApplications from "./PendingApplications";

const views = [
  { id: "paid", label: "Paid applications", href: "/admin/applications" },
  { id: "pending", label: "Pending applicants", href: "/admin/applications?view=pending" },
] as const;

export default function ApplicationsWorkspace({ view }: { view: "paid" | "pending" }) {
  const { selectedCohortId } = useContext(AdminCohortContext);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 font-sans sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Applications</h1>
      <nav aria-label="Application views" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {views.map(({ id, label, href }) => (
          <Link
            key={id}
            href={href}
            aria-current={view === id ? "page" : undefined}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[current=page]:bg-primary aria-[current=page]:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === "pending"
        ? <PendingApplications key={selectedCohortId} />
        : <PaidApplications key={selectedCohortId} />}
    </div>
  );
}
