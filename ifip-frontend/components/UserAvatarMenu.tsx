"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HiOutlineSquares2X2,
  HiArrowLeftOnRectangle,
  HiOutlineShieldCheck,
  HiChevronDown
} from "react-icons/hi2";
import { logout } from "@/lib/api/auth";
import { getMyApplication } from "@/lib/api/services";

interface UserAvatarMenuProps {
  dropDirection?: "down" | "up";
  showLabel?: boolean;
}

export default function UserAvatarMenu({
  dropDirection = "down",
  showLabel = false,
}: UserAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const profile = await getMyApplication();
        if (isMounted && profile) {
          setUserData(profile);
        }
      } catch {
        // Silently handle if user profile fetch fails
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
  };

  const getInitials = () => {
    if (userData?.fullName) {
      return userData.fullName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return "U";
  };

  const dashboardPath =
    userData?.role === "admin" || userData?.role === "superadmin"
      ? "/admin"
      : "/dashboard";

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-on-surface hover:text-primary transition-all focus:outline-none cursor-pointer group"
        aria-label="User Account Menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm transition-transform group-hover:scale-105">
          {userData?.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt={userData?.fullName || "User Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs md:text-sm font-black text-primary">
              {getInitials()}
            </span>
          )}
        </div>

        {showLabel && (
          <div className="flex flex-col text-left text-xs font-semibold">
            <span className="truncate max-w-[100px]">
              {userData?.fullName?.split(" ")[0] || "Account"}
            </span>
          </div>
        )}

        <HiChevronDown
          className={`w-3.5 h-3.5 text-on-surface/60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 w-56 bg-background border border-outline-variant/40 rounded-xl shadow-xl py-2 z-50 animate-fadeIn font-sans ${
            dropDirection === "up" ? "bottom-full mb-3" : "top-full mt-2"
          }`}
        >
          {/* User Details Header */}
          <div className="px-4 py-2 border-b border-outline-variant/20 mb-1">
            <p className="text-xs font-bold text-on-surface truncate">
              {userData?.fullName || "Authenticated User"}
            </p>
            <p className="text-[11px] text-on-surface/60 truncate">
              {userData?.email || ""}
            </p>
          </div>

          {/* Menu Items */}
          <Link
            href={dashboardPath}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-on-surface/90 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {userData?.role === "admin" || userData?.role === "superadmin" ? (
              <HiOutlineShieldCheck className="w-4 h-4 text-primary" />
            ) : (
              <HiOutlineSquares2X2 className="w-4 h-4 text-primary" />
            )}
            <span>Dashboard</span>
          </Link>

          <div className="border-t border-outline-variant/20 my-1"></div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
          >
            <HiArrowLeftOnRectangle className="w-4 h-4 text-red-600" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
