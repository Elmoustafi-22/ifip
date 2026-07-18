"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowLeft,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowPath,
  HiOutlineUserCircle,
  HiOutlineXMark,
  HiOutlineBookOpen,
  HiOutlineSparkles,
  HiOutlineBriefcase,
  HiOutlineUser,
  HiOutlinePlus,
} from "react-icons/hi2";
import { getAdminUsers, AdminUser, AdminUsersResponse, getMyApplication, inviteAdmin } from "@/lib/api/services";

const ROLE_META: Record<string, { label: string; className: string }> = {
  applicant:   { label: "Applicant",   className: "bg-slate-100 text-slate-600" },
  participant: { label: "Participant", className: "bg-indigo-50 text-indigo-700" },
  admin:       { label: "Admin",       className: "bg-amber-50 text-amber-700" },
  superadmin:  { label: "Super Admin", className: "bg-rose-50 text-rose-700" },
};

const APP_STATUS_META: Record<string, { label: string; className: string }> = {
  payment_confirmed: { label: "Paid",      className: "bg-blue-50 text-blue-700" },
  active:            { label: "Active",    className: "bg-emerald-50 text-emerald-700" },
  completed:         { label: "Completed", className: "bg-purple-50 text-purple-700" },
  withdrawn:         { label: "Withdrawn", className: "bg-red-50 text-red-600" },
};

const ROLE_TABS = [
  { key: "all",        label: "All Users" },
  { key: "applicant",  label: "Applicants" },
  { key: "participant",label: "Participants" },
  { key: "admin",      label: "Admins" },
  { key: "superadmin", label: "Super Admins" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Invite Admin form states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "superadmin">("admin");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyApplication();
        if (profile?.role === "admin" || profile?.role === "superadmin") {
          setAuthorized(true);
          setCurrentUserRole(profile.role);
        } else {
          router.push("/dashboard?error=unauthorized");
        }
      } catch {
        router.push("/login?session=expired");
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeRole, debouncedSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminUsers({
        role: activeRole === "all" ? undefined : activeRole,
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setData(result);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }, [activeRole, debouncedSearch, page]);

  useEffect(() => {
    if (authorized) fetchUsers();
  }, [authorized, fetchUsers]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFirstName || !inviteLastName || !inviteEmail || !inviteTitle) {
      setInviteError("All fields are required.");
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess(false);
    try {
      await inviteAdmin({
        firstName: inviteFirstName,
        lastName: inviteLastName,
        email: inviteEmail,
        role: inviteRole,
        title: inviteTitle,
      });
      setInviteSuccess(true);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInviteTitle("");
      setInviteRole("admin");
      fetchUsers();
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (err: any) {
      setInviteError(err?.response?.data?.message || err.message || "Failed to invite administrator.");
    } finally {
      setInviteLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 text-sm font-medium">Authenticating session…</p>
      </div>
    );
  }

  if (!authorized) return null;

  const breakdown = data?.roleBreakdown ?? {};

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] min-h-screen">

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-[#E7E2D8] bg-white hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight flex items-center gap-2">
              <HiOutlineUsers className="w-7 h-7 text-[#FF9800]" />
              Platform Users
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              View all registered users, their roles, and application status.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {currentUserRole === "superadmin" && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#000666] hover:bg-[#000666]/90 px-4 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Invite Admin
            </button>
          )}
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[#000666] border border-[#E7E2D8] bg-white px-4 py-2.5 rounded-xl transition-all"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Role Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { key: "applicant",  label: "Applicants",  color: "text-slate-700" },
          { key: "participant",label: "Participants", color: "text-indigo-700" },
          { key: "admin",      label: "Admins",       color: "text-amber-700" },
          { key: "superadmin", label: "Super Admins", color: "text-rose-700" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setActiveRole(key)}
            className={`flex flex-col bg-white border rounded-xl p-5 shadow-sm text-left hover:shadow-md transition-all ${
              activeRole === key ? "border-[#000666] ring-1 ring-[#000666]/20" : "border-[#E7E2D8]"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</div>
            <div className={`text-2xl font-black ${color}`}>{breakdown[key] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* Filter Bar + Table Card */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-sm overflow-hidden mb-4">

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-nowrap -mx-4 px-4 sm:-mx-0 sm:px-0 pb-1.5 sm:pb-0">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRole(tab.key)}
                className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                  activeRole === tab.key
                    ? "bg-[#000666] text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && breakdown[tab.key] !== undefined && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeRole === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {breakdown[tab.key] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Role</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Account Status</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Application Status</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Country</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-2.5 bg-slate-100 rounded" />
                          <div className="w-40 h-2 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="w-20 h-2.5 bg-slate-100 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <HiOutlineUserCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No users found.</p>
                    <p className="text-slate-300 text-xs mt-1">Try adjusting the filter or search term.</p>
                  </td>
                </tr>
              ) : (
                data.users.map((user: AdminUser) => {
                  const roleMeta = ROLE_META[user.role] ?? { label: user.role, className: "bg-slate-100 text-slate-600" };
                  const appStatus = user.application?.status;
                  const statusMeta = appStatus ? APP_STATUS_META[appStatus] : null;
                  const displayName = user.fullName ?? user.application?.fullName;
                  const country = user.country ?? user.application?.country;
                  const initials = displayName
                    ? displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                    : user.email[0].toUpperCase();

                  return (
                    <tr key={user._id} onClick={() => setSelectedUser(user)} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#000666]/10 flex items-center justify-center text-[#000666] text-xs font-black shrink-0 select-none">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#000666] text-xs leading-tight">
                              {displayName ?? <span className="text-slate-400 italic font-normal">No name yet</span>}
                            </div>
                            <div className="text-slate-400 text-[11px] leading-tight mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${roleMeta.className}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.isConfigured ? (
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                            Configured
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#E65100]">
                            Pending Setup
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {statusMeta ? (
                          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px] italic">No application</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {country ?? <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-3 bg-slate-100 rounded" />
                    <div className="w-36 h-2 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="w-16 h-4 bg-slate-100 rounded" />
                  <div className="w-20 h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))
          ) : !data || data.users.length === 0 ? (
            <div className="p-8 text-center">
              <HiOutlineUserCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No users found.</p>
            </div>
          ) : (
            data.users.map((user: AdminUser) => {
              const roleMeta = ROLE_META[user.role] ?? { label: user.role, className: "bg-slate-100 text-slate-600" };
              const appStatus = user.application?.status;
              const statusMeta = appStatus ? APP_STATUS_META[appStatus] : null;
              const displayName = user.fullName ?? user.application?.fullName;
              const country = user.country ?? user.application?.country;
              const initials = displayName
                ? displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                : user.email[0].toUpperCase();

              return (
                <div key={user._id} onClick={() => setSelectedUser(user)} className="p-4 pr-10 sm:pr-4 space-y-4.5 cursor-pointer hover:bg-slate-50/60 transition-colors">
                  {/* Identity Row */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-[#000666]/10 flex items-center justify-center text-[#000666] text-sm font-black shrink-0 select-none">
                          {initials}
                        </div>
                        <div className="font-bold text-[#000666] text-sm leading-tight break-words flex-1">
                          {displayName ?? <span className="text-slate-400 italic font-normal">No name yet</span>}
                        </div>
                      </div>
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${roleMeta.className}`}>
                        {roleMeta.label}
                      </span>
                    </div>
                    <div className="pl-[52px] text-slate-400 text-xs leading-tight break-all">
                      {user.email}
                    </div>
                  </div>

                  {/* Labeled Metadata Details Grid */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Status</div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {statusMeta ? (
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px] italic">No application</span>
                        )}
                        {user.isConfigured ? (
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                            Configured
                          </span>
                        ) : (
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100]">
                            Pending Setup
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Access Timeline</div>
                      <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-0.5">
                        <div>Joined: {formatDate(user.createdAt)}</div>
                        <div>Login: {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</div>
                      </div>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                      <span>Origin Country: <strong className="text-slate-600 font-bold">{country ?? "—"}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing <strong className="text-slate-600">{((data.page - 1) * 50) + 1}–{Math.min(data.page * 50, data.total)}</strong> of{" "}
              <strong className="text-slate-600">{data.total}</strong> users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <HiOutlineChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-xs font-bold text-slate-600">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={data.page >= data.pages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <HiOutlineChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {data && (
        <p className="text-center text-xs text-slate-400 mt-4">
          {data.total} total user{data.total !== 1 ? "s" : ""} registered on the platform.
        </p>
      )}

      {/* Selected User Details Inspector Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">{selectedUser.fullName ?? selectedUser.application?.fullName ?? "User Details"}</h3>
                <p className="text-xs text-sky-200 mt-0.5">{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Account Reference / Role info */}
              <div className="bg-[#FDFBF7] border border-[#E7E2D8] rounded-xl p-4 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account ID</span>
                  <div className="font-mono text-xs text-[#000666] mt-0.5">{selectedUser._id}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs capitalize font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1">
                    System Role: {selectedUser.role}
                  </span>
                  {selectedUser.title && (
                    <span className="text-[10px] text-slate-500 font-semibold italic">
                      Position: {selectedUser.title}
                    </span>
                  )}
                </div>
              </div>

              {/* Basic Demographics */}
              <div>
                <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                  <HiOutlineUser className="w-4 h-4 text-amber-500" /> Profile Info
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Registered Country</span>
                    <div className="font-bold text-slate-700">{selectedUser.country ?? selectedUser.application?.country ?? "—"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Account Created</span>
                    <div className="font-bold text-slate-700">{formatDate(selectedUser.createdAt)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Account Setup Status</span>
                    <div className="mt-0.5">
                      {selectedUser.isConfigured ? (
                        <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                          Configured
                        </span>
                      ) : (
                        <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100]">
                          Pending Setup
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Last Login Timestamp</span>
                    <div className="font-bold text-slate-700 font-mono mt-0.5">
                      {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : "Never"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Application Details */}
              {selectedUser.application ? (
                <div className="space-y-6">
                  {/* Academic Info */}
                  <div>
                    <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                      <HiOutlineBookOpen className="w-4 h-4 text-sky-500" /> Academic Credentials
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Institution</span>
                        <div className="font-bold text-slate-700">{selectedUser.application.academicInfo?.institution || "—"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Field of Study</span>
                        <div className="font-bold text-slate-700">{selectedUser.application.academicInfo?.fieldOfStudy || "—"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Qualification</span>
                        <div className="font-bold text-slate-700">{selectedUser.application.academicInfo?.qualification || "—"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Graduation Year</span>
                        <div className="font-bold text-slate-700">{selectedUser.application.academicInfo?.gradYear || "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Career Interests & Skills */}
                  <div>
                    <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                      <HiOutlineSparkles className="w-4 h-4 text-emerald-500" /> Interest Tracks & Skills
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Primary Interests</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedUser.application.programInterest?.primary?.map((track: string, index: number) => (
                            <span key={index} className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {track}
                            </span>
                          )) || <span className="text-slate-300 italic">None</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">Core Professional Skills</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedUser.application.skills?.relevantSkills?.map((skill: string, index: number) => (
                            <span key={index} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {skill}
                            </span>
                          )) || <span className="text-slate-300 italic">None</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Motivation */}
                  {selectedUser.application.motivation?.whyApplying && (
                    <div>
                      <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                        <HiOutlineUser className="w-4 h-4 text-rose-500" /> Application Motivation
                      </h4>
                      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 italic leading-relaxed">
                        "{selectedUser.application.motivation.whyApplying}"
                      </div>
                    </div>
                  )}

                  {/* CV File Link */}
                  {selectedUser.application.cvUrl && (
                    <div>
                      <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                        <HiOutlineBriefcase className="w-4 h-4 text-blue-500" /> Curriculum Vitae (CV)
                      </h4>
                      <a 
                        href={selectedUser.application.cvUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#00B0FF] font-bold hover:underline"
                      >
                        📄 View PDF Attachment &rarr;
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 text-xs font-medium">No program application submitted yet.</p>
                </div>
              )}

              {/* Action Controls Section */}
              <div className="border-t border-slate-100 pt-6 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="bg-[#000666] hover:bg-[#000666]/95 text-white font-bold text-xs tracking-wider uppercase px-6 py-2.5 rounded-xl shadow-xs transition-all"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">Invite Admin</h3>
                <p className="text-xs text-sky-200 mt-0.5">Send a password setup link to a new admin</p>
              </div>
              <button 
                onClick={() => setInviteModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 text-xs">
              {inviteSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 font-semibold text-center">
                  ✓ Invitation email sent successfully!
                </div>
              )}
              {inviteError && (
                <div className="bg-rose-50 text-rose-800 border border-rose-200 rounded-xl p-3 font-semibold text-center">
                  ⚠️ {inviteError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Startup Position / Title</label>
                <input
                  type="text"
                  required
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="e.g. Director, Program Manager"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">System Permissions / Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "superadmin")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white text-slate-700 font-medium"
                >
                  <option value="admin">Admin (Standard Access)</option>
                  <option value="superadmin">Super Admin (Full Access)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E7E2D8] hover:bg-slate-50 text-slate-500 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2 rounded-lg bg-[#000666] hover:bg-[#000666]/90 text-white font-bold transition-all disabled:opacity-50"
                >
                  {inviteLoading ? "Sending Invitation..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
