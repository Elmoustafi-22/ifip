"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TbArrowUpRight, TbMenu2, TbX } from "react-icons/tb";
import { motion } from "framer-motion";
import { useHomepageSession } from "./MobileBottomNav";
import UserAvatarMenu from "@/components/UserAvatarMenu";

const sections = [
  { href: "#curriculum", label: "Curriculum" },
  { href: "#process", label: "Process" },
  { href: "#partners", label: "Partners" },
  { href: "#faq", label: "FAQ" },
];

export default function HomeNav() {
  const [open, setOpen] = useState(false);
  const loggedIn = useHomepageSession();
  const toggle = useRef<HTMLButtonElement>(null);

  return (
    <motion.header className="ifip-home-header" data-home-entrance initial={{ y: -16, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <div className="ifip-home-nav-inner">
        <Link href="/" aria-label="IFIP homepage">
          <Image priority src="/images/logos/logo-full-color.png" alt="" width={160} height={44} className="ifip-home-logo" />
        </Link>
        <button ref={toggle} type="button" className="ifip-home-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="homepage-navigation" onClick={() => setOpen(!open)}>
          {open ? <TbX aria-hidden="true" /> : <TbMenu2 aria-hidden="true" />}
        </button>
        <nav id="homepage-navigation" className="ifip-home-nav" data-open={open} aria-label="Main navigation">
          <Link href="/about" onClick={() => setOpen(false)}>About</Link>
          {sections.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
          {loggedIn ? (
            <UserAvatarMenu dropDirection="down" />
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}>Log in <TbArrowUpRight aria-hidden="true" /></Link>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
