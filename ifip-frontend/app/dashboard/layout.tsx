"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HiOutlineSquares2X2,
  HiOutlineBookOpen,
  HiOutlineClipboardDocumentList,
  HiOutlineFolderMinus,
  HiOutlineBriefcase,
  HiOutlineCog6Tooth,
  HiArrowLeftOnRectangle,
  HiOutlineUserCircle,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBell
} from "react-icons/hi2";
import { getAccessToken, clearAuth } from "@/lib/api/auth";
import { 
  getMyApplication, 
  getCohortConfig, 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotification, 
  AppNotification 
} from "@/lib/api/services";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);

  const fetchNotificationsList = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      fetchNotificationsList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotificationsList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      fetchNotificationsList();
    } catch (err) {
      console.error(err);
    }
  };

  // Authenticate user & check placement status
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        clearAuth();
        router.push("/login?session=expired");
        return;
      }

      try {
        const [application, config] = await Promise.all([
          getMyApplication(),
          getCohortConfig()
        ]);
        if (application) {
          setUserData(application);
          setAppStatus(application.status);
          setCohortStartDate(config.cohortStartDate);
          setDashboardViewOverride(config.dashboardViewOverride || "default");
          setIsAuthorized(true);
          fetchNotificationsList();

          // Auto-redirect admin to admin control panel
          const role = application.role;
          if (role === "admin" || role === "superadmin") {
            router.push("/admin");
            return;
          }
        } else {
          throw new Error("No application profile");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        clearAuth();
        router.push("/login?session=expired");
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
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center font-sans">
        <svg className="animate-spin w-10 h-10 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">Loading your candidate workspace...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // Gated Status holding screen if application is withdrawn
  if (appStatus === "withdrawn") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between font-sans">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 py-5 px-8 flex items-center justify-between">
          <Image
            src="/images/logos/logo-full-color.png"
            alt="IFIP Logo"
            width={120}
            height={33}
            priority
            className="h-8 w-auto object-contain"
          />
          <button
            onClick={handleLogout}
            className="text-slate-600 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HiArrowLeftOnRectangle className="w-4 h-4" />
            Sign Out
          </button>
        </header>

        {/* Content body */}
        <main className="flex-1 max-w-xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center justify-center gap-8">
          <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-2">
            <HiOutlineExclamationTriangle className="w-12 h-12" />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-display font-black text-[#000666]">Access Blocked</h1>
            <h2 className="text-sm font-bold text-red-700 uppercase tracking-widest bg-red-50 border border-red-100 rounded-full px-4 py-1.5 inline-block mx-auto mt-2">
              Application Withdrawn
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mt-4 font-medium">
              Your application has been marked as withdrawn from the current Islamic Finance cohort.
            </p>
          </div>

          <div className="w-full border-t border-slate-150/60 pt-6 mt-2 flex flex-col gap-3 text-left bg-slate-50 rounded-2xl border border-slate-200/50 p-6">
            <a
              href="mailto:ifip.program@gmail.com"
              className="text-xs text-[#FF9800] font-bold hover:underline mt-1"
            >
              Questions? Contact Admissions &rarr;
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.
        </footer>
      </div>
    );
  }
  const getIsLaunched = () => {
    if (userData?.role === "admin" || userData?.role === "superadmin") return true;
    if (dashboardViewOverride === "unlocked") return true;
    if (dashboardViewOverride === "coming_soon") return false;
    return new Date() >= new Date(cohortStartDate);
  };

  const isLaunched = getIsLaunched();

  const getDashboardTitle = () => {
    const role = userData?.role || "participant";
    if (role === "admin") return "Admin Dashboard";
    if (role === "superadmin") return "Superadmin Dashboard";
    if (role === "applicant") return "Applicant Dashboard";
    return "Participant Dashboard";
  };

  const getDashboardSubtitle = () => {
    const role = userData?.role || "participant";
    if (role === "admin" || role === "superadmin") return "Administrative & Management Workspace";
    return "Islamic Finance Internship Program";
  };

  // Sidebar Layout Navigation Structure matching screen-7.png
  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: HiOutlineSquares2X2, disabled: false },
    { name: "Modules", href: "/dashboard/modules", icon: HiOutlineBookOpen, disabled: !isLaunched },
    { name: "Assessments", href: "/dashboard/assessments", icon: HiOutlineClipboardDocumentList, disabled: !isLaunched },
    { name: "Resources", href: "/dashboard/resources", icon: HiOutlineFolderMinus, disabled: !isLaunched },
    { name: "Placement", href: "/dashboard/placement", icon: HiOutlineBriefcase, disabled: !isLaunched },
    { name: "Settings", href: "/dashboard/settings", icon: HiOutlineCog6Tooth, disabled: false }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex font-sans bg-[#FDFBF7]">
      {/* Sidebar Shell */}
      <aside className="w-68 bg-[#0E1B5D] text-white flex flex-col justify-between shrink-0 select-none border-r border-[#000666]/10">
        <div className="flex flex-col">
          {/* Header Logo */}
          <div className="p-6 pb-4 border-b border-white/5 flex flex-col gap-1.5">
            <Image
              src="/images/logos/logo-white-wordmark.png"
              alt="IFIP Logo"
              width={130}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          </div>



          {/* Navigation Menu */}
          <nav className="p-4 flex flex-col gap-1.5 mt-2">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-lg text-white/40 cursor-not-allowed text-sm font-semibold select-none group relative"
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] uppercase tracking-wider font-bold bg-white/10 text-white/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-sky-400 text-[#0E1B5D] shadow-sm font-bold"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2 bg-black/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold hover:bg-red-900/10 text-red-400 hover:text-red-300 transition-colors border border-red-900/20 cursor-pointer"
          >
            <HiArrowLeftOnRectangle className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Header Navbar matching screen.png top layout but standard */}
        <header className="bg-white border-b border-slate-200/50 py-5 px-8 md:px-12 flex items-center justify-between shadow-sm select-none shrink-0">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl md:text-2xl font-display font-black text-[#000666]">
              {getDashboardTitle()}
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-semibold tracking-wide uppercase">
              {getDashboardSubtitle()} &bull; Batch 2026-A
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Bell notification dropdown */}
            <div className="relative">
              <button
                onClick={() => setBellOpen(!bellOpen)}
                className="relative p-1.5 text-slate-400 hover:text-[#000666] transition-colors cursor-pointer focus:outline-none"
              >
                <HiOutlineBell className="w-5.5 h-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white font-bold text-[8px] h-4 w-4 flex items-center justify-center rounded-full border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setBellOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-xl shadow-lg z-50 py-3 font-sans animate-fadeIn text-xs text-slate-700">
                    <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-[#000666]">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-sky-600 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                          No notifications found.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n._id} className={`p-3 transition-colors hover:bg-slate-50 flex gap-2 justify-between items-start ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                            <div className="flex-1">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'alert' ? 'bg-rose-500' : 'bg-sky-500'}`}></span>
                                {n.title}
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              {!n.read && (
                                <button onClick={() => handleMarkRead(n._id)} className="text-[9px] font-bold text-sky-600 hover:underline">
                                  Mark read
                                </button>
                              )}
                              <button onClick={() => handleDeleteNotification(n._id)} className="text-[9px] text-rose-500 hover:underline">
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Vertical separator */}
            <div className="w-px h-8 bg-slate-200"></div>

            {/* Profile Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer focus:outline-none group select-none"
              >
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#000666] transition-colors">
                    {userData?.fullName || "Candidate"}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    Batch 2026-A
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-sky-50 border border-slate-200 flex items-center justify-center text-sky-700 font-bold overflow-hidden">
                  <HiOutlineUserCircle className="w-8 h-8 text-sky-700" />
                </div>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop to close click */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setDropdownOpen(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg py-1.5 z-50 animate-fadeIn font-sans">
                    {(userData?.role === "admin" || userData?.role === "superadmin") && (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <HiOutlineShieldCheck className="w-4 h-4 text-slate-400" />
                          Admin Workspace
                        </Link>
                        <div className="border-t border-slate-100 my-1"></div>
                      </>
                    )}
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <HiOutlineCog6Tooth className="w-4 h-4 text-slate-400" />
                      Account Settings
                    </Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-650 hover:bg-red-50/50 transition-colors text-left cursor-pointer"
                    >
                      <HiArrowLeftOnRectangle className="w-4 h-4 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 md:p-12 max-w-5xl w-full mx-auto flex flex-col gap-8">
          {children}
        </main>

        {/* Portal Footer */}
        <footer className="bg-white border-t border-slate-200/50 py-6 px-12 text-xs text-slate-400 flex items-center justify-between font-sans shrink-0">
          <span>© {new Date().getFullYear()} IFIP. All rights reserved. Ethical Finance Education.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Program FAQs</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
