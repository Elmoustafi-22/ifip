"use client";

import { createContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineClipboardDocumentList,
  HiOutlineAcademicCap,
  HiOutlineArrowsRightLeft,
  HiOutlineBuildingOffice2,
  HiOutlineBriefcase,
  HiOutlineListBullet,
  HiOutlineMegaphone,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCog6Tooth,
  HiOutlineChartBar,
  HiOutlineCreditCard,
} from "react-icons/hi2";
import { getMyApplication, getCohorts, Cohort } from "@/lib/api/services";
import { clearAuth, startSilentRefresh, stopSilentRefresh } from "@/lib/api/auth";
import NotificationBell from "@/components/NotificationBell";

export interface AdminCohortContextType {
  selectedCohortId: string;
  setSelectedCohortId: (id: string) => void;
  cohorts: Cohort[];
  adminRole: string;
}

export const AdminCohortContext = createContext<AdminCohortContextType>({
  selectedCohortId: "",
  setSelectedCohortId: () => {},
  cohorts: [],
  adminRole: "admin",
});

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/admin",       label: "Overview",      icon: HiOutlineSquares2X2 },
      { href: "/admin/users", label: "Platform Users", icon: HiOutlineUsers },
    ],
  },
  {
    label: "Participants",
    items: [
      { href: "/admin/applications", label: "Applications",  icon: HiOutlineClipboardDocumentList },
      { href: "/admin/placements",   label: "Matching Desk", icon: HiOutlineArrowsRightLeft },
    ],
  },
  {
    label: "Program",
    items: [
      { href: "/admin/modules", label: "LMS Modules", icon: HiOutlineAcademicCap },
      { href: "/admin/assessments", label: "Assessments", icon: HiOutlineClipboardDocumentList },
    ],
  },
  {
    label: "Placements",
    items: [
      { href: "/admin/partners",      label: "Partners",      icon: HiOutlineBuildingOffice2 },
      { href: "/admin/opportunities", label: "Opportunities", icon: HiOutlineBriefcase },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/form-options", label: "Form Options",    icon: HiOutlineListBullet },
      { href: "/admin/openings",     label: "Active Openings", icon: HiOutlineMegaphone },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/payments", label: "Payment Records", icon: HiOutlineCreditCard },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/admin/settings", label: "Settings", icon: HiOutlineCog6Tooth },
      { href: "/admin/analytics", label: "Analytics", icon: HiOutlineChartBar },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: HiOutlineClipboardDocumentList, roles: ["superadmin"] },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [cohorts, setCohorts]           = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [adminRole, setAdminRole]       = useState("admin");
  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [hovered, setHovered]           = useState(false);
  const isExpanded = !collapsed || hovered;

  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("adminSidebarCollapsed", String(next));
  };

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    (async () => {
      try {
        const [profile, cohortsList] = await Promise.all([
          getMyApplication(),
          getCohorts(),
        ]);
        if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
          setAuthorized(true);
          setAdminRole(profile.role);
          setCohorts(cohortsList);
          const saved = localStorage.getItem("adminSelectedCohortId");
          if (saved) {
            setSelectedCohortId(saved);
          } else if (cohortsList.length > 0) {
            const active   = cohortsList.find((c: Cohort) => c.status === "active");
            const upcoming = cohortsList.find((c: Cohort) => c.status === "upcoming");
            const id = active?._id || upcoming?._id || cohortsList[0]._id;
            setSelectedCohortId(id);
            localStorage.setItem("adminSelectedCohortId", id);
          }
        } else {
          router.push("/dashboard?error=unauthorized");
        }
      } catch {
        router.push("/login?session=expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [authorized, router]);

  // Proactive silent token refresh — renews the access token 2 min before it
  // expires so the admin never experiences a 401 mid-session.
  useEffect(() => {
    if (!authorized) return;
    startSilentRefresh();
    return () => stopSilentRefresh();
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;

    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const handleLogout = () => {
      stopSilentRefresh();
      clearAuth();
      router.push("/login?session=idle");
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
    };

    const activityEvents = [
      "mousemove",
      "keydown",
      "mousedown",
      "scroll",
      "click",
      "touchstart",
    ];

    resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [authorized, router]);

  const handleSetCohort = (id: string) => {
    setSelectedCohortId(id);
    localStorage.setItem("adminSelectedCohortId", id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Authenticating admin session...</p>
      </div>
    );
  }

  if (!authorized) return null;

  const NavItem = ({
    item,
    isCollapsed = false,
    onClick,
  }: {
    item: typeof NAV_GROUPS[0]["items"][0];
    isCollapsed?: boolean;
    onClick?: () => void;
  }) => {
    const isActive =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <li className="relative group/tip">
        <Link
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-3 rounded-xl font-semibold transition-all duration-150
            ${isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"}
            ${isActive
              ? "bg-white/15 text-white"
              : "text-white/55 hover:text-white hover:bg-white/10"
            }`}
        >
          <Icon className={`shrink-0 ${isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]"} ${isActive ? "text-[#38BDF8]" : ""}`} />
          {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
          {!isCollapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#38BDF8] shrink-0" />}
        </Link>

        {isCollapsed && (
          <span className="
            pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60]
            bg-slate-900 text-white text-xs font-semibold
            px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl
            opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
          ">
            {item.label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
          </span>
        )}
      </li>
    );
  };

  return (
    <AdminCohortContext.Provider
      value={{ selectedCohortId, setSelectedCohortId: handleSetCohort, cohorts, adminRole }}
    >
      <div className="min-h-screen bg-[#F4F6FB] font-sans flex">

        {/* DESKTOP SIDEBAR */}
        <aside 
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`
            hidden lg:flex flex-col bg-[#000666] shrink-0
            transition-[width] duration-200 ease-in-out overflow-hidden
            ${isExpanded ? "w-60" : "w-[68px]"}
          `}
        >

          {/* Logo */}
          <div className={`flex items-center border-b border-white/10 shrink-0 h-[60px]
            ${!isExpanded ? "justify-center px-3" : "px-5 justify-start"}`}
          >
            {!isExpanded ? (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-[11px] tracking-tight">IF</span>
              </div>
            ) : (
              <>
                <Image
                  src="/images/logos/logo-white-wordmark.png"
                  alt="IFIP Logo"
                  width={110}
                  height={30}
                  priority
                  className="h-7 w-auto object-contain"
                />
              </>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-4 px-2">
            {NAV_GROUPS.map((group) => {
              const filteredItems = group.items.filter(item => !(item as any).roles || (item as any).roles.includes(adminRole));
              if (filteredItems.length === 0) return null;
              return (
                <div key={group.label}>
                  {!isExpanded
                    ? <div className="h-px bg-white/10 mx-1 mb-3" />
                    : <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5 truncate">{group.label}</p>
                  }
                  <ul className="space-y-0.5">
                    {filteredItems.map((item) => (
                      <NavItem key={item.href} item={item} isCollapsed={!isExpanded} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 shrink-0 py-3 px-2 space-y-0.5">
            <div className="relative group/tip">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-xl text-sm font-semibold text-white/40 hover:text-white hover:bg-white/10 transition-all
                  ${!isExpanded ? "justify-center p-2.5" : "px-3 py-2.5"}`}
              >
                <HiOutlineArrowTopRightOnSquare className="w-[18px] h-[18px] shrink-0" />
                {isExpanded && <span>View Public Site</span>}
              </a>
              {!isExpanded && (
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity">
                  View Public Site
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
                </span>
              )}
            </div>

            <button
              onClick={toggleCollapsed}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold text-white/35 hover:text-white hover:bg-white/10 transition-all
                ${!isExpanded ? "justify-center p-2.5" : "px-3 py-2.5"}`}
              aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={isExpanded}
            >
              {!isExpanded
                ? <HiOutlineChevronRight className="w-4 h-4 shrink-0" />
                : <><HiOutlineChevronLeft className="w-4 h-4 shrink-0" /><span>Collapse sidebar</span></>
              }
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-200
            ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        />

        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#000666] flex flex-col lg:hidden
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="h-[60px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
            <Image
              src="/images/logos/logo-white-wordmark.png"
              alt="IFIP Logo"
              width={110}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close navigation"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>


          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {NAV_GROUPS.map((group) => {
              const filteredItems = group.items.filter(item => !(item as any).roles || (item as any).roles.includes(adminRole));
              if (filteredItems.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {filteredItems.map((item) => (
                      <NavItem key={item.href} item={item} isCollapsed={false} onClick={() => setMobileOpen(false)} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-white/10 shrink-0">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <HiOutlineArrowTopRightOnSquare className="w-4 h-4 shrink-0" />
              View Public Site
            </a>
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">

          <header className="h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
              >
                <HiOutlineBars3 className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider hidden sm:block">
                  Cohort
                </span>
                <div className="relative">
                  <select
                    value={selectedCohortId}
                    onChange={(e) => handleSetCohort(e.target.value)}
                    aria-label="Select active cohort"
                    className="appearance-none pl-3 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#000666]/30 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors max-w-[110px] min-[380px]:max-w-[160px] sm:max-w-none truncate"
                  >
                    <option value="">All Cohorts</option>
                    <option value="unassigned">Awaiting Assignment</option>
                    {cohorts.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminCohortContext.Provider>
  );
}
