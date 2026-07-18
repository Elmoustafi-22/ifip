"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { getAccessToken } from "@/lib/api/auth";

export default function HomeNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  return (
    <>
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-3 md:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo (Mobile & Desktop) */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <Link href="/about" className="text-on-surface/80 hover:text-primary transition-colors">About IFIP</Link>
            <a href="#curriculum" className="text-on-surface/80 hover:text-primary transition-colors">Curriculum</a>
            <a href="#process" className="text-on-surface/80 hover:text-primary transition-colors">Process</a>
            <a href="#partners" className="text-on-surface/80 hover:text-primary transition-colors">Partners</a>
            <a href="#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
                  Login
                </Link>
                <Link
                  href="/apply"
                  className="bg-impact-orange hover:bg-impact-orange/90 text-white font-semibold text-sm px-6 py-2.5 rounded-[4px] shadow-sm hover-lift transition-all"
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile-only Right: Hamburger menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:text-primary"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <HiXMark className="w-6 h-6" /> : <HiBars3 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-45 bg-background md:hidden flex flex-col px-6 py-8 border-t border-outline-variant/30 gap-6">
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            About IFIP
          </Link>
          <a
            href="#curriculum"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Curriculum
          </a>
          <a
            href="#process"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Process
          </a>
          <a
            href="#partners"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Partners
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            FAQ
          </a>
          <div className="flex flex-col gap-4 mt-6">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center font-semibold bg-primary text-white py-3 rounded-[4px]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center font-semibold border border-primary/20 py-3 rounded-[4px] hover:bg-primary/5 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/apply"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center bg-impact-orange text-white font-semibold py-3 rounded-[4px]"
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
