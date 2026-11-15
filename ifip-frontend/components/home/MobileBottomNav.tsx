"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { TbApps, TbBook, TbClipboardText, TbHelpCircle, TbHome, TbLogin } from "react-icons/tb";
import { getAccessToken } from "@/lib/api/auth";
import UserAvatarMenu from "@/components/UserAvatarMenu";

const guestLinks = [
  { href: "/apply", label: "Apply", icon: TbClipboardText },
  { href: "#faq", label: "FAQ", icon: TbHelpCircle },
  { href: "/login", label: "Log in", icon: TbLogin },
];

const participantLinks = [
  { href: "/dashboard", label: "Workspace", icon: TbApps },
  { href: "/dashboard/modules", label: "Modules", icon: TbBook },
];

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
  };
}
const hasToken = () => Boolean(getAccessToken());
const serverSnapshot = () => false;

export function useHomepageSession() {
  return useSyncExternalStore(subscribe, hasToken, serverSnapshot);
}

export default function MobileBottomNav() {
  const loggedIn = useHomepageSession();

  return (
    <nav className="ifip-home-bottom-nav" aria-label="Mobile shortcuts">
      <Link href="/" aria-current="page"><TbHome aria-hidden="true" />Home</Link>
      {(loggedIn ? participantLinks : guestLinks).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}><Icon aria-hidden="true" />{label}</Link>
      ))}
      {loggedIn && <UserAvatarMenu dropDirection="up" />}
    </nav>
  );
}
