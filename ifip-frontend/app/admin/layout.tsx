"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMyApplication, getCohorts, Cohort } from "@/lib/api/services";

export interface AdminCohortContextType {
  selectedCohortId: string;
  setSelectedCohortId: (id: string) => void;
  cohorts: Cohort[];
}

export const AdminCohortContext = createContext<AdminCohortContextType>({
  selectedCohortId: "",
  setSelectedCohortId: () => {},
  cohorts: []
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const [profile, cohortsList] = await Promise.all([
          getMyApplication(),
          getCohorts()
        ]);
        if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
          setAuthorized(true);
          setCohorts(cohortsList);

          // Restore selection from localStorage
          const saved = localStorage.getItem("adminSelectedCohortId");
          if (saved) {
            setSelectedCohortId(saved);
          } else if (cohortsList.length > 0) {
            // Find active/ongoing cohort, fallback to upcoming, fallback to first in list
            const activeCohort = cohortsList.find(c => c.status === "active");
            const upcomingCohort = cohortsList.find(c => c.status === "upcoming");
            const defaultId = activeCohort?._id || upcomingCohort?._id || cohortsList[0]._id;
            
            setSelectedCohortId(defaultId);
            localStorage.setItem("adminSelectedCohortId", defaultId);
          }
        } else {
          router.push("/dashboard?error=unauthorized");
        }
      } catch {
        router.push("/login?session=expired");
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  const handleSetCohort = (id: string) => {
    setSelectedCohortId(id);
    localStorage.setItem("adminSelectedCohortId", id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7]">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Authenticating admin session...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <AdminCohortContext.Provider value={{ selectedCohortId, setSelectedCohortId: handleSetCohort, cohorts }}>
      <div className="min-h-screen bg-[#FDFBF7] font-sans">
        {/* Global Scoped Header */}
        <header className="bg-white border-b border-[#E7E2D8] py-3.5 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm select-none">
          <div className="flex items-center gap-6">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={90}
              height={25}
              priority
              className="h-6 w-auto object-contain shrink-0"
            />
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#000666] tracking-wider">Cohort Scope</span>
              <select
              value={selectedCohortId}
              onChange={(e) => handleSetCohort(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none bg-slate-50/50 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="">All Cohorts (Global View)</option>
              <option value="unassigned">Awaiting Cohort Assignment</option>
              {cohorts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="bg-orange-100 text-[#FF9800] text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-orange-200">
            Admin Portal
          </span>
        </header>
        {children}
      </div>
    </AdminCohortContext.Provider>
  );
}
