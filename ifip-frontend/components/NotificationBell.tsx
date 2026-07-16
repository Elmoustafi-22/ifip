"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { HiOutlineBell as BellIcon, HiOutlineCheckCircle as CheckIcon, HiOutlineTrash as TrashIcon, HiOutlineEnvelopeOpen as EnvelopeIcon } from "react-icons/hi2";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  AppNotification
} from "@/lib/api/services";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchList = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    fetchList();
    // Poll every 30 seconds for new alerts
    const interval = setInterval(fetchList, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeStyles = (type: AppNotification["type"]) => {
    switch (type) {
      case "success":
        return { border: "border-emerald-500", dot: "bg-emerald-500" };
      case "warning":
        return { border: "border-amber-500", dot: "bg-amber-500" };
      case "alert":
        return { border: "border-rose-500", dot: "bg-rose-500" };
      default:
        return { border: "border-sky-500", dot: "bg-sky-500" };
    }
  };

  return (
    <div className="relative font-sans text-xs" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-[#E7E2D8] bg-white hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
        aria-label="Toggle notifications dropdown"
      >
        <BellIcon className="w-5 h-5 text-[#000666]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-[#E7E2D8] rounded-2xl shadow-xl z-[999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#000666]/5">
            <h3 className="font-bold text-[#000666] text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] uppercase font-bold text-[#00B0FF] hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List Wrapper */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 gap-2">
                <EnvelopeIcon className="w-8 h-8 opacity-40 text-[#000666]" />
                <p className="italic">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const styles = getTypeStyles(n.type);
                return (
                  <div
                    key={n._id}
                    className={`p-4 flex gap-3 hover:bg-slate-50/70 transition-colors relative group ${
                      !n.read ? "bg-sky-50/20 border-l-2 " + styles.border : ""
                    }`}
                  >
                    {/* Status Indicator dot */}
                    <div className="mt-1 shrink-0">
                      <span className={`block h-2 w-2 rounded-full ${styles.dot}`}></span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="font-bold text-[#000666] truncate block">{n.title}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px] mb-2">{n.message}</p>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatDate(n.createdAt)}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            className="text-[#00B0FF] font-bold hover:underline"
                          >
                            View details &rarr;
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick Action Buttons */}
                    <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          onClick={(e) => handleMarkRead(n._id, e)}
                          title="Mark as read"
                          className="p-1 rounded-md bg-white border border-slate-100 text-slate-400 hover:text-emerald-500 shadow-sm transition-colors cursor-pointer"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(n._id, e)}
                        title="Dismiss notification"
                        className="p-1 rounded-md bg-white border border-slate-100 text-slate-400 hover:text-rose-500 shadow-sm transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
