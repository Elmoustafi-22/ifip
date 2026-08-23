"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowsRightLeft,
  HiOutlineBriefcase,
  HiOutlineCog6Tooth,
  HiOutlineBell,
  HiArrowLeftOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineBuildingOffice2,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";
import { getAccessToken, clearAuth } from "@/lib/api/auth";
import { getPartnerMe, PartnerMeResponse } from "@/lib/api/partner";
import NotificationBell from "@/components/NotificationBell";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/partner-portal", label: "Overview", icon: HiOutlineSquares2X2 },
      { href: "/partner-portal/notifications", label: "Notifications", icon: HiOutlineBell },
    ],
  },
  {
    label: "Talent & Matching",
    items: [
      { href: "/partner-portal/interns", label: "Intern Pool", icon: HiOutlineUsers },
      { href: "/partner-portal/requests", label: "My Requests", icon: HiOutlineClipboardDocumentList },
      { href: "/partner-portal/placements", label: "My Placements", icon: HiOutlineArrowsRightLeft },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/partner-portal/openings", label: "Openings", icon: HiOutlineBriefcase },
      { href: "/partner-portal/settings", label: "Settings", icon: HiOutlineCog6Tooth },
    ],
  },
];

export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerMeResponse | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isExpanded = !collapsed || hovered;

  useEffect(() => {
    const saved = localStorage.getItem("partnerSidebarCollapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("partnerSidebarCollapsed", String(next));
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const initPartnerPortal = async () => {
      const token = getAccessToken();
      if (!token) {
        clearAuth();
        router.push("/login?session=expired");
        return;
      }

      try {
        const data = await getPartnerMe();
        setPartnerData(data);
      } catch (err: any) {
        console.error("Partner portal auth check failed:", err);
        if (err.status === 403 || err.status === 401) {
          clearAuth();
          router.push("/login?session=unauthorized");
        }
      } finally {
        setLoading(false);
      }
    };

    initPartnerPortal();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 font-sans text-slate-600">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Authenticating Partner Portal...</p>
      </div>
    );
  }

  const org = partnerData?.org;

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
      item.href === "/partner-portal"
        ? pathname === "/partner-portal"
        : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <li className="relative group/tip">
        <Link
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-3 rounded-xl font-semibold transition-all duration-150
            ${isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"}
            ${
              isActive
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
    <div className="min-h-screen bg-[#F4F6FB] font-sans flex">
      {/* DESKTOP SIDEBAR */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          hidden lg:flex flex-col bg-[#000666] shrink-0
          transition-[width] duration-200 ease-in-out overflow-hidden h-screen sticky top-0 z-40
          ${isExpanded ? "w-60" : "w-[68px]"}
        `}
      >
        {/* Logo Branding */}
        <div className={`flex items-center border-b border-white/10 shrink-0 h-[60px]
          ${!isExpanded ? "justify-center px-3" : "px-5 justify-start"}`}
        >
          {!isExpanded ? (
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[11px] tracking-tight">IF</span>
            </div>
          ) : (
            <Image
              src="/images/logos/logo-white-wordmark.png"
              alt="IFIP Partner Portal Logo"
              width={110}
              height={30}
              priority
              className="h-7 w-auto object-contain"
            />
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-4 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!isExpanded ? (
                <div className="h-px bg-white/10 mx-1 mb-3" />
              ) : (
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5 truncate">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.href} item={item} isCollapsed={!isExpanded} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
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
          >
            {!isExpanded ? (
              <HiOutlineChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <HiOutlineChevronLeft className="w-4 h-4 shrink-0" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-200
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#000666] flex flex-col lg:hidden
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
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
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.href} item={item} isCollapsed={false} onClick={() => setMobileOpen(false)} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/40 transition-colors"
          >
            <HiArrowLeftOnRectangle className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* STICKY TOP HEADER */}
        <header className="h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <HiOutlineBars3 className="w-5 h-5" />
            </button>

            {/* Partner Organization Chip */}
            <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              {org?.logoUrl ? (
                <div className="relative w-6 h-6 rounded bg-white overflow-hidden border border-slate-200 shrink-0">
                  <Image src={org.logoUrl} alt={org.name} fill className="object-contain p-0.5" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {org?.name?.charAt(0) || "P"}
                </div>
              )}
              <div className="flex items-center max-w-[160px] sm:max-w-xs truncate">
                <span className="text-xs font-bold text-slate-800 truncate">{org?.name || "Partner Organization"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 rounded-full border border-slate-200 bg-[#000666]/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[#000666]/30 transition-all shrink-0 cursor-pointer focus:outline-none"
                title="Account Options"
              >
                <div className="w-full h-full bg-[#000666] text-white font-bold text-xs flex items-center justify-center">
                  {org?.contactPerson?.charAt(0) || org?.name?.charAt(0) || "P"}
                </div>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 divide-y divide-slate-100 text-xs">
                    <div className="px-4 py-2.5">
                      <p className="font-bold text-slate-900 truncate">{org?.contactPerson || "Partner Representative"}</p>
                      <p className="text-slate-500 truncate text-[11px] mt-0.5">{org?.contactEmail}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/partner-portal/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <HiOutlineCog6Tooth className="w-4 h-4 text-slate-400" />
                        <span>Organization Settings</span>
                      </Link>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium text-left"
                      >
                        <HiArrowLeftOnRectangle className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
