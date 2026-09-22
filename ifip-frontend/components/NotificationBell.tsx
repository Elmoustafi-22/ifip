"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBell as BellIcon,
  HiOutlineCheckCircle as CheckIcon,
  HiOutlineTrash as TrashIcon,
  HiOutlineEnvelopeOpen as EnvelopeIcon,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  AppNotification
} from "@/lib/api/services";

export default function NotificationBell() {
  const router = useRouter();
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
    const handleRefresh = () => fetchList();
    window.addEventListener("notifications:refresh", handleRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications:refresh", handleRefresh);
    };
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

  const handleItemClick = async (n: AppNotification) => {
    if (!n.read) {
      setNotifications((prev) =>
        prev.map((item) => (item._id === n._id ? { ...item, read: true } : item))
      );
      try {
        await markNotificationRead(n._id);
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    }
    setIsOpen(false);
    if (n.link) {
      router.push(n.link);
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
        <>
          {/* Mobile backdrop for easy dismissal */}
          <div
            className="fixed inset-0 z-[990] bg-black/25 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-3 sm:w-96 bg-white border border-[#E7E2D8] rounded-2xl shadow-2xl z-[999] overflow-hidden max-h-[calc(100vh-5.5rem)] sm:max-h-none flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 bg-[#000666]/5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#000666] text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#000666] text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] uppercase font-bold text-[#006591] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  aria-label="Close notifications"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Wrapper */}
            <div className="max-h-[calc(100vh-10rem)] sm:max-h-96 overflow-y-auto divide-y divide-slate-100">
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
                      onClick={() => handleItemClick(n)}
                      className={`p-3.5 sm:p-4 flex gap-3 hover:bg-slate-50 transition-colors relative group cursor-pointer ${
                        !n.read ? "bg-sky-50/20 border-l-2 " + styles.border : ""
                      }`}
                    >
                      {/* Status Indicator dot */}
                      <div className="mt-1 shrink-0">
                        <span className={`block h-2 w-2 rounded-full ${styles.dot}`}></span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-12 sm:pr-10">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold text-[#000666] truncate block">{n.title}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px] mb-2">{n.message}</p>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{formatDate(n.createdAt)}</span>
                          {n.link && (
                            <span className="text-[#006591] font-bold hover:underline flex items-center gap-0.5">
                              View details &rarr;
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Inline Quick Action Buttons */}
                      <div className="absolute right-2.5 top-2.5 flex gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkRead(n._id, e)}
                            title="Mark as read"
                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(n._id, e)}
                          title="Dismiss notification"
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-rose-500 shadow-xs transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
