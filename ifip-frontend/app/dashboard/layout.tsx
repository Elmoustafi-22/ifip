"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HiOutlineSquares2X2,
  HiOutlineBookOpen,
  HiOutlineClipboardDocumentList,
  HiOutlineFolderOpen,
  HiOutlineBriefcase,
  HiOutlineCog6Tooth,
  HiArrowLeftOnRectangle,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineCalendar,
  HiOutlineChevronDown,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { getAccessToken, clearAuth } from "@/lib/api/auth";
import { getMyApplication } from "@/lib/api/services";
import { expiredSessionLoginPath } from "@/lib/cv-request-link";
import NotificationBell from "@/components/NotificationBell";
import MarketingConsentPrompt from "@/components/MarketingConsentPrompt";
import { DashboardContext, type DashboardProfile } from "./dashboard-context";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]";
const navyFocus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white";
const accountItem = `flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-start text-sm font-medium hover:bg-[#eef4fa] ${focus}`;

const navigation = [
  { label: "Learning", items: [
    { label: "Dashboard", href: "/dashboard", icon: HiOutlineSquares2X2 },
    { label: "Schedule", href: "/dashboard/schedule", icon: HiOutlineCalendar },
    { label: "Modules", href: "/dashboard/modules", icon: HiOutlineBookOpen },
    { label: "Assessments", href: "/dashboard/assessments", icon: HiOutlineClipboardDocumentList, requiresLaunch: true },
    { label: "Resources", href: "/dashboard/resources", icon: HiOutlineFolderOpen, requiresLaunch: true },
  ] },
  { label: "Career", items: [
    { label: "Placement", href: "/dashboard/placement", icon: HiOutlineBriefcase, requiresLaunch: true },
    { label: "Job openings", href: "/dashboard/job-openings", icon: HiOutlineBriefcase, requiresLaunch: true },
  ] },
  { label: "Account", items: [
    { label: "Settings", href: "/dashboard/settings", icon: HiOutlineCog6Tooth },
  ] },
];

const tabs = ["/dashboard", "/dashboard/schedule", "/dashboard/modules", "/dashboard/job-openings", "/dashboard/resources"]
  .map((href) => navigation.flatMap((group) => group.items).find((item) => item.href === href)!);

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}


const cohortDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<DashboardProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const accountButton = useRef<HTMLButtonElement>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const startTime = Date.parse(userData?.cohort?.startDate ?? "");

  useEffect(() => {
    if (!(startTime > currentTime)) return;

    // Browser timers cannot wait more than this in a single interval.
    const delay = Math.min(startTime - Date.now(), 2_147_483_647);
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [startTime, currentTime]);

  // Authenticate user & check placement status
  useEffect(() => {
    const expireSession = () => {
      clearAuth();
      router.push(expiredSessionLoginPath(window.location.pathname));
    };
    const checkAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        expireSession();
        return;
      }

      try {
        const application: DashboardProfile = await getMyApplication();
        if (application) {
          setCurrentTime(Date.now());
          setUserData(application);


          // Auto-redirect partner to partner portal
          const role = application.role;
          if (role === "partner") {
            router.push("/partner-portal");
            return;
          }
        } else {
          throw new Error("No application profile");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        expireSession();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (loading) {
    return <div role="status" className="grid min-h-dvh place-items-center bg-[#eef4fa] px-4 text-sm font-medium text-[#101f3f]">Loading your workspace…</div>;
  }

  if (!userData) return null;

  if (userData.status === "withdrawn") {
    return (
      <div className="min-h-dvh bg-[#eef4fa] font-sans text-[#101f3f]">
        <header className="flex items-center justify-between gap-3 border-b border-[#cbd8e8] bg-white px-4 py-3 sm:px-8">
          <Image src="/images/logos/logo-full-color.png" alt="IFIP" width={120} height={33} className="h-8 w-auto object-contain" />
          <button type="button" onClick={handleLogout} className={`${accountItem} w-auto`}><HiArrowLeftOnRectangle aria-hidden="true" className="size-4" /> Sign out</button>
        </header>
        <main className="mx-auto max-w-xl px-4 py-12 sm:py-20">
          <section aria-labelledby="withdrawn-title" className="rounded-2xl border border-[#cbd8e8] bg-white p-5 sm:p-8">
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-rose-50 text-rose-700"><HiOutlineExclamationTriangle aria-hidden="true" className="size-6" /></span>
            <h1 id="withdrawn-title" className="font-display text-3xl">Application withdrawn</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#465a74]">Your application has been marked as withdrawn from the current Islamic Finance cohort.</p>
            <a href="mailto:ifip.program@gmail.com" className={`mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#aebdd0] px-3 text-sm font-semibold hover:bg-[#eef4fa] ${focus}`}>Contact admissions</a>
          </section>
        </main>
      </div>
    );
  }

  const isAdmin = userData.role === "admin" || userData.role === "superadmin";
  const cohortName = userData.cohort?.name;
  const cohortStartLabel = Number.isFinite(startTime) ? cohortDateFormatter.format(startTime) : null;
  const isLaunched = isAdmin || userData.dashboardViewOverride === "unlocked"
    || (userData.dashboardViewOverride !== "coming_soon" && currentTime >= startTime);
  const workspace = userData.role === "applicant" ? "Applicant dashboard" : "Participant dashboard";
  const initials = userData.fullName?.trim().split(/\s+/).slice(0, 2).map((name) => name.charAt(0)).join("").toUpperCase() || "IF";

  return (
    <div className="flex min-h-dvh w-full max-w-full bg-[#eef4fa] font-sans text-[#101f3f]">
      <a href="#participant-main" className="sr-only z-[60] rounded-lg bg-white px-4 py-3 text-[#101f3f] focus:not-sr-only focus:fixed focus:start-4 focus:top-3">Skip to main content</a>
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-[#101f3f] text-white lg:flex xl:w-60">
        <div className="border-b border-white/15 px-5 py-4">
          <Image src="/images/logos/logo-white-wordmark.png" alt="IFIP" width={110} height={30} className="h-7 w-auto object-contain" />
          <p className="mt-1.5 text-xs font-medium text-[#c7dfef]">{workspace}</p>
        </div>

        <nav aria-label="Participant dashboard" className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2.5 py-4">
          {navigation.map(({ label, items }) => (
            <div key={label}>
              <p className="mb-1 px-3 text-xs font-medium text-[#a9c4dc]">{label}</p>
              <ul className="space-y-1">
                {items.map(({ label: name, href, icon: Icon, requiresLaunch }) => {
                  const active = isCurrent(pathname, href);
                  const itemClass = "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";
                  return (
                    <li key={href}>
                      {requiresLaunch && !isLaunched ? (
                        <span className={`${itemClass} text-[#bfd1e2]`}><Icon aria-hidden="true" className="size-[18px] shrink-0" /> {name}<HiOutlineLockClosed aria-hidden="true" className="ms-auto size-4 shrink-0" /><span className="sr-only"> available when training opens</span></span>
                      ) : (
                        <Link href={href} aria-current={active ? "page" : undefined} className={`${itemClass} ${navyFocus} motion-safe:transition-colors ${active ? "bg-[#e1f1fb] text-[#101f3f] focus-visible:outline-[#12617e]" : "text-[#e0ecfa] hover:bg-white/10"}`}>
                          <Icon aria-hidden="true" className="size-[18px] shrink-0" /> {name}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/15 px-2.5 py-3">
          {isAdmin && <Link href="/admin" className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#e0ecfa] hover:bg-white/10 ${navyFocus}`}><HiOutlineShieldCheck aria-hidden="true" className="size-[18px]" /> Admin dashboard</Link>}
          <button type="button" onClick={handleLogout} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#e0ecfa] hover:bg-white/10 ${navyFocus}`}><HiArrowLeftOnRectangle aria-hidden="true" className="size-[18px]" /> Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#bdd8e9] bg-[#e1f1fb] px-4 py-2 text-sm sm:px-6">
            <p className="flex items-center gap-2 font-semibold"><HiOutlineShieldCheck aria-hidden="true" className="size-4" /> Admin preview</p>
            <Link href="/admin" className={`inline-flex min-h-9 items-center rounded-lg px-2 font-medium underline underline-offset-2 ${focus}`}>Back to admin dashboard</Link>
          </div>
        )}

        <header className="sticky top-0 z-40 flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-[#cbd8e8] bg-white px-3 sm:px-6">
          <Link href="/" className={`flex min-h-11 items-center rounded-lg lg:hidden ${focus}`}>
            <Image src="/images/logos/logo-full-color.png" alt="IFIP home" width={110} height={30} className="h-7 w-auto object-contain" />
          </Link>
          <div className="hidden min-w-0 lg:block">
            <p className="text-sm font-semibold">{workspace}</p>
            {cohortName && <p className="truncate text-xs text-[#465a74]" title={cohortName}>{cohortName}</p>}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="relative" onKeyDown={(event) => {
              if (event.key === "Escape" && dropdownOpen) {
                setDropdownOpen(false);
                accountButton.current?.focus();
              }
            }}>
              <button type="button" ref={accountButton} onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Account options" aria-expanded={dropdownOpen} aria-controls={dropdownOpen ? "participant-account-options" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg hover:bg-[#eef4fa] sm:px-2 ${focus}`}>
                <span aria-hidden="true" className="grid size-8 place-items-center overflow-hidden rounded-full bg-[#101f3f] text-xs font-bold text-white">
                  {userData.avatarUrl ? (
                    // Participant-uploaded avatars may use URLs outside the Next.js image allowlist.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userData.avatarUrl} alt="" className="size-full object-cover" />
                  ) : initials}
                </span>
                <HiOutlineChevronDown aria-hidden="true" className="hidden size-3 sm:block" />
              </button>

              {dropdownOpen && (
                <>
                  <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div id="participant-account-options" className="absolute end-0 z-50 mt-2 max-h-[calc(100dvh-9rem)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-[#cbd8e8] bg-white p-2 shadow-lg">
                    <div className="border-b border-[#dce5ef] px-2.5 py-2 wrap-anywhere">
                      <p className="text-sm font-semibold">{userData.fullName || "Participant"}</p>
                      {cohortName && <p className="mt-1 text-xs text-[#465a74]">{cohortName}</p>}
                    </div>
                    <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineSquares2X2 aria-hidden="true" className="size-4" /> Dashboard overview</Link>
                    <div className="lg:hidden">
                      <Link href="/dashboard/job-openings" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineBriefcase aria-hidden="true" className="size-4" /> Job openings</Link>
                      <Link href="/dashboard/assessments" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineClipboardDocumentList aria-hidden="true" className="size-4" /> Assessments</Link>
                      <Link href="/dashboard/placement" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineBriefcase aria-hidden="true" className="size-4" /> Placement</Link>
                    </div>
                    {isAdmin && <Link href="/admin" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineShieldCheck aria-hidden="true" className="size-4" /> Admin dashboard</Link>}
                    <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className={accountItem}><HiOutlineCog6Tooth aria-hidden="true" className="size-4" /> Account settings</Link>
                    <button type="button" onClick={() => { setDropdownOpen(false); handleLogout(); }} className={accountItem}><HiArrowLeftOnRectangle aria-hidden="true" className="size-4" /> Sign out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="participant-main" tabIndex={-1} className={`mx-auto flex w-full min-w-0 flex-1 scroll-mt-16 flex-col gap-6 overflow-x-hidden p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:p-8 ${pathname === "/dashboard" ? "max-w-7xl" : "max-w-5xl"}`}>
          <DashboardContext.Provider value={{
            profile: userData,
            updateProfile: (fields) => setUserData((current) => current && { ...current, ...fields }),
            isLaunched,
            cohortStartLabel,
          }}>
            {userData.role === "participant" && <MarketingConsentPrompt />}
            {children}
          </DashboardContext.Provider>
        </main>

        <footer className="hidden border-t border-[#cbd8e8] bg-white px-6 py-4 text-xs text-[#465a74] lg:block">
          © {new Date().getFullYear()} IFIP
        </footer>
      </div>

      <nav aria-label="Mobile dashboard" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#101f3f] px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] text-white lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5">
          {tabs.map(({ label, href, icon: Icon, requiresLaunch }) => {
            const active = isCurrent(pathname, href);
            const displayLabel = href === "/dashboard/job-openings" ? "Openings" : label;
            const tab = "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-center text-[11px] font-medium";
            return (
              <li key={href} className="min-w-0">
                {requiresLaunch && !isLaunched ? (
                  <span className={`${tab} text-[#bfd1e2]`}><HiOutlineLockClosed aria-hidden="true" className="size-[18px]" /> {displayLabel}<span className="sr-only"> available when training opens</span></span>
                ) : (
                  <Link href={href} aria-current={active ? "page" : undefined} className={`${tab} ${navyFocus} ${active ? "bg-[#e1f1fb] font-semibold text-[#101f3f] focus-visible:outline-[#12617e]" : "text-[#e0ecfa] hover:bg-white/10"}`}>
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" /> {displayLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
