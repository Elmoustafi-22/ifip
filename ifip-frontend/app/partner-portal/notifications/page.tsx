"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineBellAlert,
} from "react-icons/hi2";
import {
  getPartnerNotifications,
  markNotificationRead,
  PartnerNotificationItem,
} from "@/lib/api/partner";

export default function PartnerNotificationsPage() {
  const [notifications, setNotifications] = useState<PartnerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    try {
      const res = await getPartnerNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.read : true));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HiOutlineBell className="w-6 h-6 text-emerald-600" />
            <span>Portal Notifications</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System alerts and direct communications from IFIP admissions.
          </p>
        </div>

        {/* Filter & Unread Badge */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all" ? "bg-white text-emerald-700 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "unread" ? "bg-white text-emerald-700 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Roster */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200/70 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <HiOutlineBellAlert className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Notifications</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filter === "unread" ? "You have read all your notifications." : "No system notifications received yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n._id}
              className={`p-4 sm:p-5 rounded-2xl border transition-colors flex items-start justify-between gap-4 shadow-sm ${
                !n.read
                  ? "bg-emerald-50/40 border-emerald-300"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="mt-0.5 shrink-0">
                  {n.type === "success" ? (
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : n.type === "warning" || n.type === "alert" ? (
                    <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <HiOutlineInformationCircle className="w-5 h-5 text-sky-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">{n.message}</p>
                  <span className="text-[11px] text-slate-400 mt-2 block font-medium">
                    {new Date(n.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              </div>

              {/* Action Link & Mark Read */}
              <div className="flex items-center space-x-2 shrink-0">
                {n.link && (
                  <Link
                    href={n.link}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#000666] hover:bg-[#00054d] text-xs text-white font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>View Detail</span>
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    <HiOutlineCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark Read</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
