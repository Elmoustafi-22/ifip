"use client";

import { useEffect, useRef, useState } from "react";
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
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";
import { getAccessToken, clearAuth } from "@/lib/api/auth";
import { getPartnerMe, type PartnerMeResponse } from "@/lib/api/partner";
import NotificationBell from "@/components/NotificationBell";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";
const onNavy = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white";
const navItem = `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${onNavy}`;

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/partner-portal", label: "Overview", icon: HiOutlineSquares2X2 },
      { href: "/partner-portal/notifications", label: "Notifications", icon: HiOutlineBell },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { href: "/partner-portal/interns", label: "Intern pool", icon: HiOutlineUsers },
      { href: "/partner-portal/requests", label: "My requests", icon: HiOutlineClipboardDocumentList },
      { href: "/partner-portal/placements", label: "My placements", icon: HiOutlineArrowsRightLeft },
      { href: "/partner-portal/openings", label: "Job openings", icon: HiOutlineBriefcase },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/partner-portal/settings", label: "Settings", icon: HiOutlineCog6Tooth },
    ],
  },
];

function PortalBrand({ collapsed = false }: { collapsed?: boolean }) {
  return collapsed ? (
    <span className="grid size-9 place-items-center rounded-lg bg-white/10 text-xs font-bold text-white">IFIP</span>
  ) : (
    <div>
      <Image src="/images/logos/logo-white-wordmark.png" alt="IFIP" width={110} height={30} className="h-7 w-auto object-contain" />
      <p className="mt-1.5 text-xs font-medium text-[#c7dfef]">Partner portal</p>
    </div>
  );
}

function PortalNavigation({ pathname, collapsed = false, onNavigate }: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Partner portal" className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2.5 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && <p className="mb-1 px-3 text-xs font-medium text-[#a9c4dc]">{group.label}</p>}
          <ul className="space-y-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === pathname || (href !== "/partner-portal" && pathname.startsWith(`${href}/`));
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    className={`${navItem} ${collapsed ? "justify-center" : ""} ${active ? "bg-[#e1f1fb] text-[#101f3f] focus-visible:outline-[#12617e]" : "text-[#e0ecfa] hover:bg-white/10 hover:text-white"}`}>
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                    <span className={collapsed ? "sr-only" : ""}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerMeResponse | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const mobileNav = useRef<HTMLDialogElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("partnerSidebarCollapsed") === "true");
    });
    const desktop = window.matchMedia("(min-width: 64rem)");
    function closeMobileNavigation(event: MediaQueryListEvent) {
      if (event.matches) mobileNav.current?.close();
    }
    desktop.addEventListener("change", closeMobileNavigation);
    return () => {
      window.cancelAnimationFrame(frame);
      desktop.removeEventListener("change", closeMobileNavigation);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/partner-portal/unsubscribe") return;

    let current = true;
    async function initPartnerPortal() {
      const token = getAccessToken();
      if (!token) {
        clearAuth();
        router.push("/login?session=expired");
        return;
      }

      try {
        const data = await getPartnerMe();
        if (current) setPartnerData(data);
      } catch (error) {
        if (!current) return;
        const status = error instanceof Error && "status" in error ? error.status : undefined;
        if (status === 403 || status === 401) {
          clearAuth();
          router.push("/login?session=unauthorized");
        }
      } finally {
        if (current) setLoading(false);
      }
    }

    void initPartnerPortal();
    return () => { current = false; };
  }, [router, pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("partnerSidebarCollapsed", String(next));
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  if (pathname === "/partner-portal/unsubscribe") return <>{children}</>;

  if (loading) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center bg-[#eef4fa] px-4 text-sm font-medium text-[#101f3f]">
        Loading partner portal…
      </div>
    );
  }

  const org = partnerData?.org;

  return (
    <div className="flex min-h-dvh bg-[#eef4fa] font-sans">
      <a href="#partner-main" className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-[#101f3f] focus:not-sr-only focus:fixed focus:start-4 focus:top-3">
        Skip to main content
      </a>
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col bg-[#101f3f] lg:flex ${collapsed ? "w-[68px]" : "w-56 xl:w-60"}`}>
        <div className={`flex min-h-[88px] items-center border-b border-white/15 ${collapsed ? "justify-center" : "px-5"}`}>
          <PortalBrand collapsed={collapsed} />
        </div>
        <PortalNavigation pathname={pathname} collapsed={collapsed} />
        <div className="space-y-1 border-t border-white/15 px-2.5 py-3">
          <a href="/" target="_blank" rel="noopener noreferrer" title={collapsed ? "View public site" : undefined}
            className={`${navItem} text-[#e0ecfa] hover:bg-white/10 ${collapsed ? "justify-center" : ""}`}>
            <HiOutlineArrowTopRightOnSquare aria-hidden="true" className="size-[18px] shrink-0" />
            <span className={collapsed ? "sr-only" : ""}>View public site <span className="sr-only">(opens in a new tab)</span></span>
          </a>
          <button type="button" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : undefined}
            className={`${navItem} w-full text-[#e0ecfa] hover:bg-white/10 ${collapsed ? "justify-center" : ""}`}>
            {collapsed ? <HiOutlineChevronRight aria-hidden="true" className="size-4 shrink-0" /> : <HiOutlineChevronLeft aria-hidden="true" className="size-4 shrink-0" />}
            <span className={collapsed ? "sr-only" : ""}>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>

      <dialog id="partner-mobile-navigation" ref={mobileNav} aria-label="Partner navigation"
        onClick={(event) => {
          const edge = event.currentTarget.getBoundingClientRect();
          if (event.target === event.currentTarget && (event.clientX < edge.left || event.clientX > edge.right)) {
            event.currentTarget.close();
          }
        }}
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100%-2rem)] overflow-hidden bg-[#101f3f] text-white backdrop:bg-[#101f3f]/60 open:flex open:flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 px-4 py-4">
          <PortalBrand />
          <button type="button" aria-label="Close navigation" onClick={() => mobileNav.current?.close()}
            className={`grid size-11 place-items-center rounded-lg hover:bg-white/10 ${onNavy}`}>
            <HiOutlineXMark aria-hidden="true" className="size-5" />
          </button>
        </div>
        <PortalNavigation pathname={pathname} onNavigate={() => mobileNav.current?.close()} />
        <div className="shrink-0 border-t border-white/15 px-3 py-3">
          <button type="button" onClick={handleLogout} className={`${navItem} w-full text-[#e0ecfa] hover:bg-white/10`}>
            <HiArrowLeftOnRectangle aria-hidden="true" className="size-[18px]" /> Sign out
          </button>
        </div>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-[#cbd8e8] bg-white px-3 text-[#101f3f] sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button type="button" onClick={() => mobileNav.current?.showModal()} aria-label="Open navigation" aria-haspopup="dialog"
              aria-controls="partner-mobile-navigation" className={`grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[#eef4fa] lg:hidden ${focus}`}>
              <HiOutlineBars3 aria-hidden="true" className="size-5" />
            </button>
            {org?.logoUrl ? (
              <span className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-[#cbd8e8] bg-white">
                <Image src={org.logoUrl} alt="" fill sizes="32px" className="object-contain p-1" />
              </span>
            ) : (
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e1f1fb] text-xs font-bold text-[#12617e]">
                {org?.name?.charAt(0) || "P"}
              </span>
            )}
            <span className="min-w-0 truncate text-sm font-semibold">{org?.name || "Partner portal"}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <NotificationBell />
            <div className="relative" onKeyDown={(event) => {
              if (event.key === "Escape" && dropdownOpen) {
                setDropdownOpen(false);
                accountButton.current?.focus();
              }
            }}>
              <button type="button" ref={accountButton} onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Account options" aria-expanded={dropdownOpen} aria-controls={dropdownOpen ? "partner-account-options" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg hover:bg-[#eef4fa] sm:px-2 ${focus}`}>
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[#101f3f] text-xs font-bold text-white">
                  {org?.contactPerson?.charAt(0) || org?.name?.charAt(0) || "P"}
                </span>
                <HiOutlineChevronDown aria-hidden="true" className="hidden size-3 sm:block" />
              </button>
              {dropdownOpen && (
                <>
                  <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div id="partner-account-options" className="absolute end-0 z-50 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#cbd8e8] bg-white p-2 text-sm shadow-lg">
                    <div className="border-b border-[#dce5ef] px-2 py-2 wrap-anywhere">
                      <p className="font-semibold">{org?.contactPerson || "Partner representative"}</p>
                      {org?.contactEmail && <p className="mt-0.5 text-xs text-[#465a74]">{org.contactEmail}</p>}
                    </div>
                    <Link href="/partner-portal/settings" onClick={() => setDropdownOpen(false)}
                      className={`mt-1 flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-[#eef4fa] ${focus}`}>
                      <HiOutlineCog6Tooth aria-hidden="true" className="size-4 shrink-0" /> Organization settings
                    </Link>
                    <button type="button" onClick={handleLogout}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start hover:bg-[#eef4fa] ${focus}`}>
                      <HiArrowLeftOnRectangle aria-hidden="true" className="size-4 shrink-0" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main id="partner-main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 scroll-mt-16 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
