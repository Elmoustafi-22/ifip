"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { TbBrandWhatsapp, TbMail } from "react-icons/tb";
import { useRouter } from "next/navigation";
import {
  HiChevronRight,
  HiCheckCircle,
  HiOutlineChevronLeft,
  HiShieldCheck,
  HiBars3,
  HiUserGroup,
} from "react-icons/hi2";
import {
  TbUserCog,
  TbBriefcase,
  TbRefresh,
  TbActivity,
  TbScale,
  TbMessage,
  TbWriting,
  TbSearch,
  TbDeviceLaptop,
  TbHeartHandshake,
  TbAward
} from "react-icons/tb";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import {
  startApplication,
  verifyOtp,
  getApplicantProfile,
  getApplicantBankTransfer,
  updateApplicantProfile,
  submitApplication,
  resumeApplication,
  initiatePayment,
  getCohortStatus,
  getRegistrationStatus,
  getRegistrationNotice,
  joinWaitlist,
  validateCoupon,
} from "@/lib/api/services";
import { getAccessToken } from "@/lib/api/auth";
import type { Applicant } from "@/lib/api/types";
import type { RegistrationNotice } from "@/lib/api/services";
import {
  step1EmailSchema,
  step1OtpSchema,
  step2ProfileSchema,
  step3AcademicSchema,
  step4InterestSchema,
  step5SkillsSchema,
  step6DeclarationSchema,
} from "@/lib/validation/applySchemas";

import { useFormOptions } from "@/lib/hooks/useFormOptions";
import { formatLevyAmount, useLevyPricing } from "@/lib/hooks/useLevyPricing";

type RegistrationAvailability =
  | { status: "checking" | "closed" | "failed" }
  | { status: "open" | "full"; cohortName?: string };

function timeUntil(expiry: string, now: number) {
  const minutes = Math.ceil((Date.parse(expiry) - now) / 60000);
  if (minutes <= 1) return "less than a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts = [
    days && `${days} ${days === 1 ? "day" : "days"}`,
    hours && `${hours} ${hours === 1 ? "hour" : "hours"}`,
    remainingMinutes && `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"}`,
  ].filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

// A failed lookup is unknown, never evidence that registration is closed.
async function loadRegistrationAvailability(): Promise<RegistrationAvailability> {
  try {
    const data = await getRegistrationStatus();
    if (data?.hasActiveCohort === false) return { status: "closed" };
    if (data?.hasActiveCohort === true && typeof data.isFull === "boolean") {
      return { status: data.isFull ? "full" : "open", cohortName: data.cohortName };
    }
  } catch {
    // Keep entry usable; the start endpoint validates availability on submission.
  }
  return { status: "failed" };
}

type WaitlistSubmission =
  | { status: "idle" | "submitting" | "joined" | "already_joined" | "failed" }
  | { status: "invalid"; message: string };

type ResumeStatus = "restoring" | "idle" | "invalid_link" | "stale_session" | "retry";
type VerificationRequest = "idle" | "sending" | "resending" | "verifying";

const otherInterest = "Other (Specify)";
const otherInterestPrefix = "Other: ";

function interestChoice(value: string) {
  return /^(other|other \(specify\))$/i.test(value.trim()) || value.startsWith(otherInterestPrefix)
    ? otherInterest
    : value;
}

function saveInterest(choice: string, detail: string) {
  return choice === otherInterest && detail.trim() ? otherInterestPrefix + detail.trim() : choice;
}

const registrationButton = "min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant";

const entryWidth = "mx-auto w-full max-w-[1264px] px-4 min-[360px]:px-5 sm:px-[5vw] lg:px-14";
const entryFocus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary";
const entryHeading = "break-words font-display text-[32px] leading-[1.12] font-normal tracking-[-0.02em] text-balance text-primary min-[360px]:text-[36px] min-[681px]:text-[clamp(36px,4vw,51px)]";
const entryCopy = "text-base leading-[1.55] text-[#43536e]";
const entryInput = `min-h-[54px] w-full min-w-0 rounded-[10px] border bg-[#fbfcff] px-3.5 py-2.5 text-base text-[#101f3f] placeholder:text-[#616b81] ${entryFocus}`;
const formControl = "min-h-12 w-full min-w-0 scroll-mt-28 rounded-lg border border-outline bg-surface-container-lowest px-2.5 py-2 text-base text-on-surface aria-invalid:border-error sm:px-3 " + entryFocus;
type CouponState =
  | { status: "idle" | "checking" | "removed" }
  | { status: "applied"; code: string; discountPercent: number }
  | { status: "error"; message: string };

type CheckoutState =
  | { status: "idle" | "saving" | "requesting" | "redirecting" }
  | { status: "error"; title: string; message: string; canCheckPayment?: boolean };

const formHeading = "scroll-mt-28 font-display text-3xl font-normal tracking-tight leading-tight text-primary sm:text-4xl";
const formSection = "mb-3 font-sans text-xl font-semibold text-[#101f3f]";
const optionalLabel = "font-normal text-on-surface-variant";
const formLabel = "text-sm font-semibold text-on-surface";
const stepActionRow = "grid grid-cols-[auto_minmax(0,1fr)] gap-2.5";
const stepBackAction = "inline-flex min-h-[50px] items-center justify-center gap-1.5 rounded-[9px] border border-outline px-3 text-sm font-semibold text-[#101f3f] hover:bg-surface-container-low disabled:opacity-60 " + entryFocus;
const stepForwardAction = "min-h-[50px] min-w-0 rounded-[9px] bg-[#101f3f] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#24395f] motion-safe:transition-[background-color,scale] motion-safe:active:scale-[.985] " + entryFocus;
const formPartLabel = "block text-sm text-on-surface-variant";
const formSecondaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60 " + entryFocus;
const birthMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const graduationYears = Array.from({ length: 26 }, (_, index) => String(2010 + index));
const qualifications = [
  { value: "Undergraduate", label: "Undergraduate Student" },
  { value: "Diploma", label: "Diploma / ND / HND" },
  { value: "Bachelor's Degree", label: "Bachelor's Degree (B.Sc, B.A, etc.)" },
  { value: "Master's Degree", label: "Master's Degree (M.Sc, MBA, etc.)" },
  { value: "Doctorate", label: "PhD / Doctorate" },
];
const entryAction = `flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[10px] bg-primary px-4 py-3 text-start text-base font-semibold text-white hover:bg-primary-container motion-safe:transition-colors disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant aria-disabled:cursor-wait aria-disabled:bg-surface-container-high aria-disabled:text-on-surface-variant ${entryFocus}`;

function RegistrationEntryFrame({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <div className="grid overflow-hidden rounded-[14px] border border-[#cbd8e8] bg-white shadow-[0_18px_52px_#1824430c] min-[681px]:min-h-[530px] min-[681px]:grid-cols-2 min-[681px]:rounded-[22px] lg:min-h-[584px]">
      <aside aria-label="About IFIP" className="relative isolate flex flex-col justify-between gap-8 overflow-hidden bg-primary px-5 py-5 text-white min-[681px]:p-[clamp(30px,4vw,56px)]">
        <div>
          <p className="max-w-[38ch] text-xs font-semibold leading-normal text-[#a9e2fa] min-[681px]:mb-6 min-[681px]:text-sm lg:mb-[38px]">
            Islamic Finance Internship Program
          </p>
          <p className="hidden max-w-[15ch] min-[681px]:block font-display font-normal text-[clamp(32px,8vw,44px)] leading-[1.1] tracking-[-0.02em] text-balance min-[681px]:mt-0 min-[681px]:max-w-[13ch] min-[681px]:text-[clamp(39px,6vw,54px)] lg:text-[clamp(48px,4.5vw,62px)]">
            Build your future in <em className="not-italic text-[#a9e2fa]">Islamic finance.</em>
          </p>
          <p className="mt-5 hidden max-w-[37ch] text-base leading-[1.55] text-[#d1dff2] min-[681px]:block">
            Prepare for a career in Islamic finance through structured learning, assessment and internship placement.
          </p>
        </div>
        {open && (
          <div className="hidden space-y-2 border-t border-[#7582ab] pt-4 text-sm min-[681px]:block">
            <strong>Have these ready</strong>
            <ul className="flex list-disc flex-wrap gap-x-6 gap-y-1 ps-[18px] text-[#d1dff2] marker:text-[#a9e2fa]">
              <li>An email you can access</li>
              <li>Your CV as a PDF</li>
            </ul>
          </div>
        )}
      </aside>
      <div className="flex min-w-0 items-center px-5 py-[23px] min-[681px]:p-[clamp(26px,4.2vw,60px)]">
        <div className="mx-auto w-full max-w-[432px]">{children}</div>
      </div>
    </div>
  );
}

function EntryIntake({ label, cohortName, tone = "neutral" }: {
  label: string;
  cohortName?: string;
  tone?: "open" | "waitlist" | "error" | "neutral";
}) {
  const color = {
    open: "text-[#176448]",
    waitlist: "text-[#785018]",
    error: "text-[#9e2638]",
    neutral: "text-[#43536e]",
  }[tone];
  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-normal text-[#43536e] min-[360px]:gap-x-3 min-[360px]:text-[13px] min-[681px]:mb-[27px]">
      <span className={`inline-flex items-center gap-2 font-bold ${color}`}>
        <span className="size-[7px] shrink-0 rounded-full bg-current" aria-hidden="true" />
        {label}
      </span>
      {cohortName && <span className="min-w-0 break-words border-s border-[#b0b7c5] ps-[11px]">{cohortName}</span>}
    </p>
  );
}

function EntryRecovery() {
  return (
    <div className="mt-[18px] space-y-1 border-t border-[#cbd8e8] pt-[14px] text-sm leading-relaxed text-[#43536e] min-[681px]:mt-6 min-[681px]:pt-[18px]">
      <p className="font-semibold text-[#101f3f]">Already started an application?</p>
      <p>Use the resume link in your email to continue.</p>
    </div>
  );
}

interface CountryDialCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

const DIAL_CODES: CountryDialCode[] = [
  { code: "AF", dialCode: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { code: "AL", dialCode: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "DZ", dialCode: "+213", flag: "🇩🇿", name: "Algeria" },
  { code: "AD", dialCode: "+376", flag: "🇦🇩", name: "Andorra" },
  { code: "AO", dialCode: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "AR", dialCode: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "AM", dialCode: "+374", flag: "🇦🇲", name: "Armenia" },
  { code: "AU", dialCode: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "AT", dialCode: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "AZ", dialCode: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "BS", dialCode: "+1", flag: "🇧🇸", name: "Bahamas" },
  { code: "BH", dialCode: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "BD", dialCode: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "BB", dialCode: "+1", flag: "🇧🇧", name: "Barbados" },
  { code: "BY", dialCode: "+375", flag: "🇧🇾", name: "Belarus" },
  { code: "BE", dialCode: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "BZ", dialCode: "+501", flag: "🇧🇿", name: "Belize" },
  { code: "BJ", dialCode: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "BT", dialCode: "+975", flag: "🇧🇹", name: "Bhutan" },
  { code: "BO", dialCode: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "BA", dialCode: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
  { code: "BW", dialCode: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "BR", dialCode: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "BN", dialCode: "+673", flag: "🇧🇳", name: "Brunei" },
  { code: "BG", dialCode: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "BF", dialCode: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "BI", dialCode: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "KH", dialCode: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "CM", dialCode: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "CA", dialCode: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "CV", dialCode: "+238", flag: "🇨🇻", name: "Cape Verde" },
  { code: "CF", dialCode: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { code: "TD", dialCode: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "CL", dialCode: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "CN", dialCode: "+86", flag: "🇨🇳", name: "China" },
  { code: "CO", dialCode: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "KM", dialCode: "+269", flag: "🇰🇲", name: "Comoros" },
  { code: "CG", dialCode: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "CR", dialCode: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "HR", dialCode: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "CU", dialCode: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "CY", dialCode: "+357", flag: "🇨🇾", name: "Cyprus" },
  { code: "CZ", dialCode: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "DK", dialCode: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "DJ", dialCode: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "DM", dialCode: "+1", flag: "🇩🇲", name: "Dominica" },
  { code: "DO", dialCode: "+1", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "EC", dialCode: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "EG", dialCode: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "SV", dialCode: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "GQ", dialCode: "+240", flag: "🇬🇶", name: "Equatorial Guinea" },
  { code: "ER", dialCode: "+291", flag: "🇪🇷", name: "Eritrea" },
  { code: "EE", dialCode: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "ET", dialCode: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "FJ", dialCode: "+679", flag: "🇫🇯", name: "Fiji" },
  { code: "FI", dialCode: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "FR", dialCode: "+33", flag: "🇫🇷", name: "France" },
  { code: "GA", dialCode: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "GM", dialCode: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "GE", dialCode: "+995", flag: "🇬🇪", name: "Georgia" },
  { code: "DE", dialCode: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "GH", dialCode: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "GR", dialCode: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "GD", dialCode: "+1", flag: "🇬🇩", name: "Grenada" },
  { code: "GT", dialCode: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "GN", dialCode: "+224", flag: "🇬🇳", name: "Guinea" },
  { code: "GW", dialCode: "+245", flag: "🇬🇼", name: "Guinea-Bissau" },
  { code: "GY", dialCode: "+592", flag: "🇬🇾", name: "Guyana" },
  { code: "HT", dialCode: "+509", flag: "🇭🇹", name: "Haiti" },
  { code: "HN", dialCode: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "HU", dialCode: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "IS", dialCode: "+354", flag: "🇮🇸", name: "Iceland" },
  { code: "IN", dialCode: "+91", flag: "🇮🇳", name: "India" },
  { code: "ID", dialCode: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "IR", dialCode: "+98", flag: "🇮🇷", name: "Iran" },
  { code: "IQ", dialCode: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "IE", dialCode: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "IL", dialCode: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "IT", dialCode: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "JM", dialCode: "+1", flag: "🇯🇲", name: "Jamaica" },
  { code: "JP", dialCode: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "JO", dialCode: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "KZ", dialCode: "+7", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "KE", dialCode: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "KI", dialCode: "+686", flag: "🇰🇮", name: "Kiribati" },
  { code: "KP", dialCode: "+850", flag: "🇰🇵", name: "North Korea" },
  { code: "KR", dialCode: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "KW", dialCode: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "KG", dialCode: "+996", flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "LA", dialCode: "+856", flag: "🇱🇦", name: "Laos" },
  { code: "LV", dialCode: "+371", flag: "🇱🇻", name: "Latvia" },
  { code: "LB", dialCode: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "LS", dialCode: "+266", flag: "🇱🇸", name: "Lesotho" },
  { code: "LR", dialCode: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "LY", dialCode: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "LI", dialCode: "+423", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "LT", dialCode: "+370", flag: "🇱🇹", name: "Lithuania" },
  { code: "LU", dialCode: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "MK", dialCode: "+389", flag: "🇲🇰", name: "North Macedonia" },
  { code: "MG", dialCode: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "MW", dialCode: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "MY", dialCode: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "MV", dialCode: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "ML", dialCode: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "MT", dialCode: "+356", flag: "🇲🇹", name: "Malta" },
  { code: "MH", dialCode: "+692", flag: "🇲🇭", name: "Marshall Islands" },
  { code: "MR", dialCode: "+222", flag: "🇲🇷", name: "Mauritania" },
  { code: "MU", dialCode: "+230", flag: "🇲🇺", name: "Mauritius" },
  { code: "MX", dialCode: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "FM", dialCode: "+691", flag: "🇫🇲", name: "Micronesia" },
  { code: "MD", dialCode: "+373", flag: "🇲🇩", name: "Moldova" },
  { code: "MC", dialCode: "+377", flag: "🇲🇨", name: "Monaco" },
  { code: "MN", dialCode: "+976", flag: "🇲🇳", name: "Mongolia" },
  { code: "ME", dialCode: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "MA", dialCode: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "MZ", dialCode: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "MM", dialCode: "+95", flag: "🇲🇲", name: "Myanmar" },
  { code: "NA", dialCode: "+264", flag: "🇳🇦", name: "Namibia" },
  { code: "NR", dialCode: "+674", flag: "🇳🇷", name: "Nauru" },
  { code: "NP", dialCode: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "NL", dialCode: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", dialCode: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "NI", dialCode: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "NE", dialCode: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "NG", dialCode: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "NO", dialCode: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "OM", dialCode: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "PK", dialCode: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "PW", dialCode: "+680", flag: "🇵🇼", name: "Palau" },
  { code: "PA", dialCode: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "PG", dialCode: "+675", flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "PY", dialCode: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "PE", dialCode: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "PH", dialCode: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "PL", dialCode: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "PT", dialCode: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "QA", dialCode: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "RO", dialCode: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "RU", dialCode: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "RW", dialCode: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "KN", dialCode: "+1", flag: "🇰🇳", name: "Saint Kitts and Nevis" },
  { code: "LC", dialCode: "+1", flag: "🇱🇨", name: "Saint Lucia" },
  { code: "VC", dialCode: "+1", flag: "🇻🇨", name: "Saint Vincent and the Grenadines" },
  { code: "WS", dialCode: "+685", flag: "🇼🇸", name: "Samoa" },
  { code: "SM", dialCode: "+378", flag: "🇸🇲", name: "San Marino" },
  { code: "ST", dialCode: "+239", flag: "🇸🇹", name: "Sao Tome and Principe" },
  { code: "SA", dialCode: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "SN", dialCode: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "RS", dialCode: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "SC", dialCode: "+248", flag: "🇸🇨", name: "Seychelles" },
  { code: "SL", dialCode: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "SG", dialCode: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "SK", dialCode: "+421", flag: "🇸🇰", name: "Slovakia" },
  { code: "SI", dialCode: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "SB", dialCode: "+677", flag: "🇸🇧", name: "Solomon Islands" },
  { code: "SO", dialCode: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "ZA", dialCode: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "SS", dialCode: "+211", flag: "🇸🇸", name: "South Sudan" },
  { code: "ES", dialCode: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "LK", dialCode: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "SD", dialCode: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "SR", dialCode: "+597", flag: "🇸🇷", name: "Suriname" },
  { code: "SZ", dialCode: "+268", flag: "🇸🇿", name: "Eswatini" },
  { code: "SE", dialCode: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "CH", dialCode: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "SY", dialCode: "+963", flag: "🇸🇾", name: "Syria" },
  { code: "TW", dialCode: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "TJ", dialCode: "+992", flag: "🇹🇯", name: "Tajikistan" },
  { code: "TZ", dialCode: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "TH", dialCode: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "TG", dialCode: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "TO", dialCode: "+676", flag: "🇹🇴", name: "Tonga" },
  { code: "TT", dialCode: "+1", flag: "🇹🇹", name: "Trinidad and Tobago" },
  { code: "TN", dialCode: "+216", flag: "🇹🇳", name: "Tunisia" },
  { code: "TR", dialCode: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "TM", dialCode: "+993", flag: "🇹🇲", name: "Turkmenistan" },
  { code: "TV", dialCode: "+688", flag: "🇹🇻", name: "Tuvalu" },
  { code: "UG", dialCode: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "UA", dialCode: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "AE", dialCode: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "GB", dialCode: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", name: "United States" },
  { code: "UY", dialCode: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "UZ", dialCode: "+998", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "VU", dialCode: "+678", flag: "🇻🇺", name: "Vanuatu" },
  { code: "VE", dialCode: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "VN", dialCode: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "YE", dialCode: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "ZM", dialCode: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "ZW", dialCode: "+263", flag: "🇿🇼", name: "Zimbabwe" }
];

function getCountryEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const parsePhoneNumber = (fullPhone: string, list: CountryDialCode[]) => {
  const sortedList = [...list].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const item of sortedList) {
    if (fullPhone.startsWith(item.dialCode)) {
      return {
        countryCode: item.code,
        number: fullPhone.substring(item.dialCode.length).trim()
      };
    }
  }
  return {
    countryCode: "NG",
    number: fullPhone
  };
};

const residenceOptions = [...DIAL_CODES].sort((a, b) => (
  Number(b.code === "NG") - Number(a.code === "NG") || a.name.localeCompare(b.name)
));

const STATUS_DESCS: Record<string, string> = {
  "University Student": "Early Years",
  "Penultimate Year Student": "Year before final",
  "Final Year Student": "In your final year",
  "Recent Graduate": "Post-university",
  "NYSC Participant": "Current service",
  "Early-Career Professional": "0-2 years exp",
};

export default function ApplyPage() {
  const { 
    options: interestOptions, 
    loading: loadingInterests,
    error: interestError,
    retry: retryInterests
  } = useFormOptions("placement_interests");

  const { 
    options: statusOptions, 
    loading: loadingStatus,
    error: statusError,
    retry: retryStatus
  } = useFormOptions("academic_status");

  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Steps: 1: VERIFY, 2: PROFILE, 3: ACADEMIC, 4: INTEREST, 5: SKILLS, 6: PAYMENT
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [codeDeliveryUncertain, setCodeDeliveryUncertain] = useState(false);
  const [token, setToken] = useState("");
  const [confirmation, setConfirmation] = useState<{ type: "submitted" | "waived"; setupToken?: string } | null>(null);
  const paymentReturn = useRef(false);
  const [paymentRecovery, setPaymentRecovery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Waitlist/Cohort status state
  const [registrationAvailability, setRegistrationAvailability] = useState<RegistrationAvailability>({ status: "checking" });
  const [registrationNotice, setRegistrationNotice] = useState<RegistrationNotice | null>(null);
  const [registrationNoticeLoading, setRegistrationNoticeLoading] = useState(true);
  const [noticeClock, setNoticeClock] = useState(0);
  const [recoverExistingApplication, setRecoverExistingApplication] = useState(false);
  const registrationStartRequested = useRef(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlist, setWaitlist] = useState<WaitlistSubmission>({ status: "idle" });
  const waitlistRequest = useRef(false);
  const waitlistInput = useRef<HTMLInputElement>(null);
  const entryEmailInput = useRef<HTMLInputElement>(null);
  const availabilityHeading = useRef<HTMLHeadingElement>(null);
  const waitlistResultHeading = useRef<HTMLHeadingElement>(null);

  // Resume/session restoration states
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>("restoring");
  const resumeToken = useRef<string | undefined>(undefined);
  const resumeRequest = useRef(false);
  const mounted = useRef(false);
  const resumeHeading = useRef<HTMLHeadingElement>(null);
  const residenceChosen = useRef(false);
  const dialCodeChosen = useRef(false);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest>("idle");
  const activeVerification = useRef(false);
  const otpInput = useRef<HTMLInputElement>(null);
  const draftSaveRequest = useRef(false);
  const verificationStepSave = useRef<Promise<void> | null>(null);
  const stepToFocus = useRef<number | null>(null);
  const saveErrorRef = useRef<HTMLDivElement>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [formSaveError, setFormSaveError] = useState("");
  const firstInvalidField = useRef("");
  const focusEntryEmail = useRef(false);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState(false);

  // Step 1 State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 2 State (Profile)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");

  const handleDobPartChange = (part: 'day' | 'month' | 'year', value: string) => {
    const d = part === 'day' ? value.replace(/\D/g, "").slice(0, 2) : dobDay;
    const m = part === 'month' ? value : dobMonth;
    const y = part === 'year' ? value.replace(/\D/g, "").slice(0, 4) : dobYear;

    setDobDay(d);
    setDobMonth(m);
    setDobYear(y);

    if (d && m && y.length === 4) {
      const paddedDay = d.padStart(2, "0");
      const formatted = `${y}-${m}-${paddedDay}`;
      handleInputChange("dob", formatted, setDob);
    } else {
      if (errors.dob) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.dob;
          return copy;
        });
      }
      setDob("");
    }
  };
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [stateCity, setStateCity] = useState("");
  const dialCodesList = DIAL_CODES;
  const [selectedCountryCode, setSelectedCountryCode] = useState("NG");
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [geoDetecting, setGeoDetecting] = useState(true);

  // Step 3 State (Academic)
  const [academicStatus, setAcademicStatus] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [qualification, setQualification] = useState("Bachelor's Degree");

  // Step 4 State (Interest)
  const [primaryInterest, setPrimaryInterest] = useState<string[]>([]);
  const [secondaryInterest, setSecondaryInterest] = useState("");
  const [otherPrimaryInterest, setOtherPrimaryInterest] = useState("");
  const [otherSecondaryInterest, setOtherSecondaryInterest] = useState("");
  const [restoredInterests, setRestoredInterests] = useState<{ primary: string[]; secondary: string }>({ primary: [], secondary: "" });

  // Step 5 State (Skills & Motivation)
  const [skillsText, setSkillsText] = useState(""); // Comma separated tags
  const [toolsText, setToolsText] = useState("");
  const [hasPriorInternship, setHasPriorInternship] = useState<boolean | null>(null);
  const [priorInternshipDesc, setPriorInternshipDesc] = useState("");
  const [commLevel, setCommLevel] = useState("Intermediate");
  const [availability, setAvailability] = useState("Immediately");
  const [whyApplying, setWhyApplying] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [leadSource, setLeadSource] = useState("LinkedIn");

  // Step 6 State (Payment & Declaration)
  const [levyAcknowledged, setLevyAcknowledged] = useState<boolean | null>(null);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [signature, setSignature] = useState("");
  const [declarationDate, setDeclarationDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const couponRequest = useRef(false);
  const checkoutRequest = useRef(false);
  const couponSummary = useRef<HTMLElement>(null);
  const couponField = useRef<HTMLInputElement>(null);
  const checkoutError = useRef<HTMLDivElement>(null);
  const couponBusy = coupon.status === "checking";
  const checkoutBusy = checkout.status === "saving" || checkout.status === "requesting" || checkout.status === "redirecting";
  const appliedCoupon = coupon.status === "applied" ? coupon : null;
  const levyCurrency = country === "Nigeria" ? "NGN" : "USD";
  const { pricing, failed: pricingFailed } = useLevyPricing(step === 6 && !paymentVerified);
  const estimatedLevy = pricing?.[levyCurrency];
  const estimatedTotal = estimatedLevy === undefined ? undefined :
    Math.max(0, Math.round(estimatedLevy * (1 - (appliedCoupon?.discountPercent ?? 0) / 100)));

  useEffect(() => {
    if (coupon.status === "applied") couponSummary.current?.focus();
    if (coupon.status === "removed" || coupon.status === "error") {
      (couponOpen ? couponField.current : couponSummary.current)?.focus();
    }
  }, [coupon, couponOpen]);

  useEffect(() => {
    if (checkout.status === "error") checkoutError.current?.focus();
  }, [checkout]);

  useEffect(() => {
    const restoreFromHistory = (event: PageTransitionEvent) => {
      if (!event.persisted || checkout.status !== "redirecting") return;
      checkoutRequest.current = false;
      setCheckout({ status: "idle" });
    };
    window.addEventListener("pageshow", restoreFromHistory);
    return () => window.removeEventListener("pageshow", restoreFromHistory);
  }, [checkout.status]);

  const handleApplyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (couponRequest.current || checkoutRequest.current) return;
    const code = couponInput.trim();
    if (!code) {
      setCoupon({ status: "error", message: "Enter a coupon code." });
      return;
    }
    couponRequest.current = true;
    setCoupon({ status: "checking" });
    try {
      const result = await validateCoupon(code);
      if (mounted.current) {
        setCoupon(result.valid
          ? { status: "applied", code: result.code, discountPercent: result.discountPercent }
          : { status: "error", message: result.message || "This coupon could not be applied." });
      }
    } catch (error) {
      if (mounted.current) setCoupon({ status: "error", message: error instanceof Error ? error.message : "We couldn’t check this coupon. Try again." });
    } finally {
      couponRequest.current = false;
    }
  };

  const handleRemoveCoupon = () => {
    if (checkoutRequest.current) return;
    setCouponInput("");
    setCoupon({ status: "removed" });
  };

  const handleInputChange = (field: string, value: any, setter: Function) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    setErrors({});
    let schema;
    let dataToValidate: any = {};

    switch (currentStep) {
      case 1:
        return true;
      case 2:
        schema = step2ProfileSchema;
        const activeDialInfo = dialCodesList.find(d => d.code === selectedCountryCode);
        const dialCode = activeDialInfo ? activeDialInfo.dialCode : "";
        let cleanPhone = phone.replace(/\s+/g, "");
        if (dialCode && cleanPhone.startsWith(dialCode)) {
          cleanPhone = cleanPhone.substring(dialCode.length);
        }
        dataToValidate = { fullName, phone: `${dialCode}${cleanPhone}`, dob, gender, country, stateCity };
        break;
      case 3:
        schema = step3AcademicSchema;
        dataToValidate = { academicStatus, institution, graduationYear, fieldOfStudy, qualification };
        break;
      case 4:
        schema = step4InterestSchema;
        dataToValidate = {
          primaryInterest,
          secondaryInterest,
          otherPrimaryInterest: primaryInterest.includes(otherInterest) ? otherPrimaryInterest : undefined,
          otherSecondaryInterest: secondaryInterest === otherInterest ? otherSecondaryInterest : undefined,
        };
        break;
      case 5:
        schema = step5SkillsSchema;
        dataToValidate = { 
          whyApplying, 
          careerGoals, 
          linkedinUrl, 
          portfolioUrl 
        };
        break;
      case 6:
        schema = step6DeclarationSchema;
        dataToValidate = { levyAcknowledged: true, declarationConfirmed, signature };
        break;
      default:
        return true;
    }

    const result = schema.safeParse(dataToValidate);
    // A Date can roll an impossible day into the following month.
    const parsedDob = currentStep === 2 && dob ? new Date(dob) : null;
    const invalidCalendarDate = parsedDob && (Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dob);
    const missingPhone = currentStep === 2 && !phone.trim();
    if (!result.success || invalidCalendarDate || missingPhone) {
      const formattedErrors: Record<string, string> = {};
      if (!result.success) result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!formattedErrors[path]) {
          formattedErrors[path] = issue.message;
        }
      });
      if (missingPhone) formattedErrors.phone = "Enter your WhatsApp phone number.";
      if (invalidCalendarDate) formattedErrors.dob = "Enter a valid date of birth.";
      setErrors(formattedErrors);
      const field = ["fullName", "phone", "dob", "gender", "country", "stateCity", "academicStatus", "institution", "graduationYear", "fieldOfStudy", "qualification", "primaryInterest", "otherPrimaryInterest", "otherSecondaryInterest", "whyApplying", "careerGoals", "portfolioUrl", "declarationConfirmed", "signature"]
        .find((key) => formattedErrors[key]);
      const dateField = !dobDay ? "dob-day" : !dobMonth ? "dob-month" : dobYear.length < 4 ? "dob-year" : "dob-day";
      firstInvalidField.current = field === "dob" ? dateField : field ?? "";
      return false;
    }

    return true;
  };



  // Start quietly while the applicant reads and enters their email.
  useEffect(() => {
    let ignore = false;
    const request = loadRegistrationAvailability();
    void request.then((result) => {
      if (!ignore && !registrationStartRequested.current) setRegistrationAvailability(result);
    });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let clockTimer: ReturnType<typeof setInterval> | undefined;
    void getRegistrationNotice().then((notice) => {
      if (!active || !notice) return;
      const remaining = Date.parse(notice.expiresAt) - Date.now();
      if (remaining <= 0) return;
      setNoticeClock(Date.now());
      setRegistrationNotice(notice);
      expiryTimer = setTimeout(() => setRegistrationNotice(null), remaining);
      clockTimer = setInterval(() => setNoticeClock(Date.now()), 15000);
    }).catch(() => {}).finally(() => { if (active) setRegistrationNoticeLoading(false); });
    return () => {
      active = false;
      if (expiryTimer) clearTimeout(expiryTimer);
      if (clockTimer) clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    if (registrationAvailability.status === "full" || registrationAvailability.status === "closed") {
      if (!otpSent && !token) availabilityHeading.current?.focus();
    }
  }, [registrationAvailability.status, otpSent, token]);

  useEffect(() => {
    if (waitlist.status === "joined" || waitlist.status === "already_joined") {
      waitlistResultHeading.current?.focus();
    }
  }, [waitlist.status]);

  // Geolocation supplies defaults only. A saved or manually chosen value wins.
  useEffect(() => {
    let active = true;
    const detectCountry = async () => {
      let code = "NG";
      try {
        const response = await fetch("/api/geolocation");
        if (response.ok) {
          const data = await response.json();
          if (typeof data?.countryCode === "string") code = data.countryCode.toUpperCase();
        }
      } catch {
        // Keep the existing Nigeria default when location is unavailable.
      }
      if (!active) return;
      const match = DIAL_CODES.find((item) => item.code === code);
      if (!residenceChosen.current) setCountry(match?.name ?? "Nigeria");
      if (!dialCodeChosen.current) setSelectedCountryCode(match?.code ?? "NG");
      setGeoDetecting(false);
    };
    void detectCountry();
    return () => { active = false; };
  }, []);
  const hydrateApplicant = (applicant: Applicant, focusAfterHydration = false) => {
    if (applicant.email) setEmail(applicant.email);
    if (applicant.fullName) setFullName(applicant.fullName);
    if (applicant.phone) {
      dialCodeChosen.current = true;
      const parsed = parsePhoneNumber(applicant.phone, dialCodesList);
      setSelectedCountryCode(parsed.countryCode);
      setPhone(parsed.number);
    }
    if (applicant.dob) {
      const savedDate = typeof applicant.dob === "string"
        ? applicant.dob.substring(0, 10)
        : applicant.dob.toISOString().substring(0, 10);
      const [year, month, day] = savedDate.split("-");
      setDob(savedDate);
      setDobYear(year ?? "");
      setDobMonth(month ?? "");
      setDobDay(day ?? "");
    }
    if (applicant.gender) setGender(applicant.gender);
    if (applicant.country) {
      residenceChosen.current = true;
      setCountry(applicant.country);
    }
    if (applicant.stateCity) setStateCity(applicant.stateCity);

    if (applicant.academicInfo) {
      if (applicant.academicInfo.status) setAcademicStatus(applicant.academicInfo.status);
      if (applicant.academicInfo.institution) setInstitution(applicant.academicInfo.institution);
      if (applicant.academicInfo.gradYear) setGraduationYear(String(applicant.academicInfo.gradYear));
      if (applicant.academicInfo.fieldOfStudy) setFieldOfStudy(applicant.academicInfo.fieldOfStudy);
      if (applicant.academicInfo.qualification) setQualification(applicant.academicInfo.qualification);
    }

    if (applicant.programInterest) {
      const primary = applicant.programInterest.primary ?? [];
      const secondary = applicant.programInterest.secondary ?? "";
      const choices = [...new Set(primary.map(interestChoice))];
      const secondaryChoice = interestChoice(secondary);
      setRestoredInterests({ primary: choices, secondary: secondaryChoice });
      setPrimaryInterest(choices);
      setSecondaryInterest(secondaryChoice);
      setOtherPrimaryInterest(primary.find((item) => item.startsWith(otherInterestPrefix))?.slice(otherInterestPrefix.length) ?? "");
      setOtherSecondaryInterest(secondary.startsWith(otherInterestPrefix) ? secondary.slice(otherInterestPrefix.length) : "");
    }

    if (applicant.skills) {
      if (applicant.skills.relevantSkills) setSkillsText(applicant.skills.relevantSkills.join(", "));
      if (applicant.skills.tools) setToolsText(applicant.skills.tools.join(", "));
      if (applicant.skills.hasPriorInternship !== undefined) setHasPriorInternship(applicant.skills.hasPriorInternship);
      if (applicant.skills.priorInternshipDesc) setPriorInternshipDesc(applicant.skills.priorInternshipDesc);
      if (applicant.skills.commSkillLevel) setCommLevel(applicant.skills.commSkillLevel);
      if (applicant.skills.availability) setAvailability(applicant.skills.availability);
    }

    if (applicant.motivation) {
      if (applicant.motivation.whyApplying) setWhyApplying(applicant.motivation.whyApplying);
      if (applicant.motivation.careerGoals) setCareerGoals(applicant.motivation.careerGoals);
    }

    if (applicant.linkedinUrl) setLinkedinUrl(applicant.linkedinUrl);
    if (applicant.portfolioUrl) setPortfolioUrl(applicant.portfolioUrl);
    if (applicant.leadSource) setLeadSource(applicant.leadSource);
    if (applicant.levyAcknowledged !== undefined) setLevyAcknowledged(applicant.levyAcknowledged);

    if (applicant.declaration) {
      if (applicant.declaration.confirmed !== undefined) setDeclarationConfirmed(applicant.declaration.confirmed);
      if (applicant.declaration.signature) setSignature(applicant.declaration.signature);
      if (applicant.declaration.date) {
        const declDateVal = applicant.declaration.date;
        const formattedDate = typeof declDateVal === "string"
          ? declDateVal.substring(0, 10)
          : new Date(declDateVal).toISOString().substring(0, 10);
        setDeclarationDate(formattedDate);
      }
    }

    setPaymentVerified(applicant.isPaid === true);
    const savedStep = applicant.currentStep;
    const restoredStep = Number.isInteger(savedStep) && savedStep >= 2 && savedStep <= 6 ? savedStep : 2;
    if (focusAfterHydration) stepToFocus.current = restoredStep;
    setStep(restoredStep);
  };

  const restoreApplication = async (linkToken?: string) => {
    if (resumeRequest.current) return;
    resumeRequest.current = true;
    setResumeStatus("restoring");
    setErrorMsg("");
    try {
      const result = linkToken ? await resumeApplication(linkToken) : null;
      const applicant = result ? result.applicant : await getApplicantProfile();
      if (!mounted.current) return;
      const sessionToken = result?.sessionToken ?? localStorage.getItem("applicantToken");
      if (!applicant || !sessionToken) throw new Error("Missing applicant session");
      if (result) localStorage.setItem("applicantToken", sessionToken);
      if (applicant.transferHoldUntil) {
        router.replace("/apply/bank-transfer");
        return;
      }
      setToken(sessionToken);
      const returningFromPayment = paymentReturn.current;
      if (returningFromPayment && applicant.isPaid !== true) {
        setPaymentRecovery(true);
      } else {
        hydrateApplicant(applicant, returningFromPayment);
        paymentReturn.current = false;
        setPaymentRecovery(false);
      }
      setResumeStatus("idle");
      if ((linkToken || returningFromPayment) && !paymentReturn.current) router.replace("/apply");
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof Error && "status" in error ? error.status : undefined;
      if (!linkToken && status === 404 && localStorage.getItem("applicantToken")) {
        const transfer = await getApplicantBankTransfer().catch(() => null);
        if (transfer?.review === "approved" && mounted.current) {
          router.replace("/apply/bank-transfer");
          return;
        }
      }
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        if (!linkToken) {
          localStorage.removeItem("applicantToken");
          setToken("");
        }
        if (paymentReturn.current) {
          setPaymentRecovery(true);
          setResumeStatus("idle");
        } else {
          setResumeStatus(linkToken ? "invalid_link" : "stale_session");
          if (linkToken) router.replace("/apply");
        }
      } else {
        setResumeStatus("retry");
      }
    } finally {
      resumeRequest.current = false;
    }
  };

  useEffect(() => {
    mounted.current = true;
    let active = true;
    // Wait for the active mount before starting the session lookup.
    queueMicrotask(() => {
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      const linkToken = params.get("token");
      paymentReturn.current = params.get("payment") === "verified";
      if (linkToken) {
        resumeToken.current = linkToken;
        void restoreApplication(linkToken);
      } else {
        if (localStorage.getItem("applicantToken")) {
          void restoreApplication();
        } else {
          setPaymentRecovery(paymentReturn.current);
          setResumeStatus("idle");
        }
      }
    });
    return () => {
      active = false;
      mounted.current = false;
    };
    // The initial URL and stored session are read once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueFromResumeError = () => {
    const failedLink = resumeStatus === "invalid_link";
    resumeToken.current = undefined;
    if (failedLink && localStorage.getItem("applicantToken")) {
      void restoreApplication();
    } else {
      focusEntryEmail.current = true;
      setResumeStatus("idle");
      router.replace("/apply");
    }
  };


  // Step 1: Send OTP code to email
  const handleSendCode = async () => {
    if (activeVerification.current || resendCooldown > 0) return;
    setErrors({});
    setErrorMsg("");
    setRegisteredEmail(false);
    setVerificationNotice("");
    const cleanEmail = email.trim().toLowerCase();
    const validation = step1EmailSchema.safeParse({ email: cleanEmail });
    if (!validation.success) {
      setErrors({ email: validation.error.issues[0].message });
      entryEmailInput.current?.focus();
      return;
    }
    registrationStartRequested.current = true;
    activeVerification.current = true;
    setVerificationRequest(otpSent ? "resending" : "sending");
    try {
      // The start endpoint validates the current intake before issuing a code.
      await startApplication(cleanEmail);
      if (!mounted.current) return;
      setEmail(cleanEmail);
      setOtp("");
      setOtpSent(true);
      setCodeDeliveryUncertain(false);
      setResendCooldown(60);
      setVerificationNotice(otpSent ? "New code sent. Use the latest email." : "Verification code sent.");
    } catch (err) {
      if (!mounted.current) return;
      if (err instanceof Error && "apiCode" in err && err.apiCode === "COHORT_FULL") {
        setOtpSent(false);
        setRecoverExistingApplication(false);
        setWaitlistEmail(cleanEmail);
        setRegistrationAvailability({ status: "full", cohortName: "cohortName" in registrationAvailability ? registrationAvailability.cohortName : undefined });
      } else if (err instanceof Error && "apiCode" in err && err.apiCode === "REGISTRATION_CLOSED") {
        setOtpSent(false);
        setRecoverExistingApplication(false);
        setWaitlistEmail(cleanEmail);
        setRegistrationAvailability({ status: "closed" });
      } else if (err instanceof Error && "apiCode" in err && err.apiCode === "REGISTRATION_PAUSED") {
        setErrorMsg(err.message);
      } else {
        if (err instanceof Error && "isNetworkError" in err && err.isNetworkError) {
          setEmail(cleanEmail);
          setOtpSent(true);
          setCodeDeliveryUncertain(true);
          setResendCooldown(60);
          setVerificationNotice("If a verification code arrives, enter it below.");
          setErrorMsg("Unable to confirm whether your code was sent. If it arrives, enter it below. If it does not arrive, request a new code when the resend timer ends.");
          return;
        }
        setRegisteredEmail(err instanceof Error && "apiCode" in err && err.apiCode === "EMAIL_ALREADY_REGISTERED");
        setErrorMsg(err instanceof Error ? err.message : "Failed to send verification code.");
      }
    } finally {
      activeVerification.current = false;
      if (mounted.current) setVerificationRequest("idle");
    }
  };

  // Step 1: Verify OTP code
  const handleVerifyOtp = async () => {
    if (activeVerification.current) return;
    setErrors({});
    setErrorMsg("");
    setVerificationNotice("");
    const cleanEmail = email.trim().toLowerCase();
    const validation = step1OtpSchema.safeParse({ email: cleanEmail, otp: otp.trim() });
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        formattedErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(formattedErrors);
      otpInput.current?.focus();
      return;
    }
    activeVerification.current = true;
    setVerificationRequest("verifying");
    try {
      const data = await verifyOtp(cleanEmail, validation.data.otp);
      if (!mounted.current) return;
      const sessionToken = data.sessionToken;
      localStorage.setItem("applicantToken", sessionToken);
      setToken(sessionToken);
      hydrateApplicant(data.applicant, true);
      if (!data.applicant.currentStep || data.applicant.currentStep === 1) {
        verificationStepSave.current = saveProgressStep(2);
      }
    } catch (err) {
      if (!mounted.current) return;
      const message = err instanceof Error ? err.message : "We couldn’t verify the code. Try again.";
      if (err instanceof Error && "status" in err && err.status === 400) {
        setErrors({ otp: message });
        otpInput.current?.focus();
      } else {
        setErrorMsg(message);
      }
    } finally {
      activeVerification.current = false;
      if (mounted.current) setVerificationRequest("idle");
    }
  };

  useEffect(() => {
    if (verificationNotice) otpInput.current?.focus();
  }, [verificationNotice]);

  const focusPaymentRecovery = (heading: HTMLHeadingElement | null) => { heading?.focus(); };

  const focusStepHeading = (heading: HTMLHeadingElement | null) => {
    if (!heading || stepToFocus.current !== step) return;
    stepToFocus.current = null;
    heading.focus();
  };

  useEffect(() => {
    if (!firstInvalidField.current) return;
    document.getElementById(firstInvalidField.current)?.focus();
    firstInvalidField.current = "";
  }, [errors]);

  useEffect(() => {
    if (formSaveError) saveErrorRef.current?.focus();
  }, [formSaveError]);

  const goBackToStep = (previousStep: number) => {
    if (draftSaveRequest.current || checkoutRequest.current || couponRequest.current) return;
    setCheckout({ status: "idle" });
    setErrors({});
    setFormSaveError("");
    setSaveNotice("");
    if (previousStep === 1) {
      stepToFocus.current = null;
      if (otpSent) {
        requestAnimationFrame(() => otpInput.current?.focus());
      } else {
        focusEntryEmail.current = true;
      }
    } else {
      stepToFocus.current = previousStep;
    }
    setStep(previousStep);
  };

  useEffect(() => {
    if (resumeStatus === "retry" || resumeStatus === "invalid_link" || resumeStatus === "stale_session") {
      resumeHeading.current?.focus();
    }
    if (resumeStatus === "idle" && focusEntryEmail.current) {
      (entryEmailInput.current ?? availabilityHeading.current)?.focus();
      focusEntryEmail.current = false;
    }
  }, [resumeStatus, registrationAvailability.status, otpSent, step]);

  // Save Progress step index only
  const saveProgressStep = async (nextStep: number) => {
    try {
      await updateApplicantProfile({ currentStep: nextStep });
    } catch (err) {
      console.error("Failed to save step index:", err);
    }
  };

  // Save all progress data
  const saveAllData = async (nextStep: number) => {
    const currentStep = nextStep - 1;
    if (draftSaveRequest.current) return;
    setFormSaveError("");
    setSaveNotice("");
    if (!validateStep(currentStep)) {
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const relevantSkills = skillsText.split(",").map(s => s.trim()).filter(Boolean);
    const tools = toolsText.split(",").map(t => t.trim()).filter(Boolean);

    const activeDialInfo = dialCodesList.find(d => d.code === selectedCountryCode);
    const dialCode = activeDialInfo ? activeDialInfo.dialCode : "";
    let cleanPhone = phone.replace(/\s+/g, "");
    if (dialCode && cleanPhone.startsWith(dialCode)) {
      cleanPhone = cleanPhone.substring(dialCode.length);
    }
    const compiledPhone = `${dialCode}${cleanPhone}`;

    const payload: Record<string, any> = {
      fullName,
      phone: compiledPhone,
      dob: dob ? new Date(dob) : undefined,
      gender,
      country,
      stateCity,
      academicInfo: {
        status: academicStatus,
        institution,
        fieldOfStudy,
        qualification,
        gradYear: graduationYear ? Number(graduationYear) : undefined
      },
      programInterest: {
        primary: primaryInterest.map((choice) => saveInterest(choice, otherPrimaryInterest)),
        secondary: saveInterest(secondaryInterest, otherSecondaryInterest)
      },
      skills: {
        relevantSkills,
        tools,
        hasPriorInternship,
        priorInternshipDesc,
        commSkillLevel: commLevel,
        availability
      },
      motivation: {
        whyApplying,
        careerGoals
      },
      linkedinUrl,
      portfolioUrl,
      leadSource,
      currentStep: nextStep
    };

    draftSaveRequest.current = true;
    try {
      // Let the OTP step-index write finish before saving a newer step.
      await verificationStepSave.current;
      if (!mounted.current) return;
      await updateApplicantProfile(payload);
      if (!mounted.current) return;
      stepToFocus.current = nextStep;
      setSaveNotice("Progress saved.");
      setStep(nextStep);
    } catch (err) {
      if (mounted.current) setFormSaveError(err instanceof Error && err.message ? err.message : "Failed to save progress.");
    } finally {
      draftSaveRequest.current = false;
      if (mounted.current) setLoading(false);
    }
  };


  const finishCheckout = (setupToken?: string, waiver = false) => {
    setConfirmation({ type: waiver && !setupToken ? "waived" : "submitted", setupToken });
    localStorage.removeItem("applicantToken");
    stepToFocus.current = 7;
    setCheckout({ status: "idle" });
    setStep(7);
  };

  const handleCheckout = async () => {
    if (checkoutRequest.current || couponRequest.current || draftSaveRequest.current) return;
    setCheckout({ status: "idle" });
    if (!validateStep(6)) return;
    checkoutRequest.current = true;
    setSaveNotice("");
    setCheckout({ status: "saving" });

    const payload = {
      levyAcknowledged: paymentVerified ? levyAcknowledged === true : true,
      declaration: {
        confirmed: declarationConfirmed,
        signature,
        date: declarationDate ? new Date(declarationDate) : new Date(),
      },
    };

    let declarationSaved = false;
    let redirecting = false;
    try {
      await updateApplicantProfile(payload);
      if (!mounted.current) return;
      declarationSaved = true;
      setCheckout({ status: "requesting" });

      if (paymentVerified) {
        const result = await submitApplication();
        if (mounted.current) finishCheckout(result.setPasswordToken);
        return;
      }

      const result = await initiatePayment(appliedCoupon?.code);
      if (!mounted.current) return;
      if (result.bypassPayment) {
        finishCheckout(result.setPasswordToken, true);
      } else if (result.method === "bank_transfer") {
        router.push("/apply/bank-transfer");
        redirecting = true;
      } else if (result.reference && result.pollingToken) {
        localStorage.setItem("paymentReference", result.reference);
        localStorage.setItem("paymentPollingToken", result.pollingToken);
        setCheckout({ status: "redirecting" });
        window.location.href = result.authorizationUrl || "/verify-payment";
        redirecting = true;
      } else if (result.authorizationUrl) {
        localStorage.setItem("paymentReference", result.reference);
        localStorage.setItem("paymentPollingToken", "");
        setCheckout({ status: "redirecting" });
        window.location.href = result.authorizationUrl;
        redirecting = true;
      } else {
        throw new Error("The checkout response did not include a payment link.");
      }
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof Error && "status" in error ? error.status : undefined;
      const detail = error instanceof Error && error.message ? error.message + " " : "";
      const canCheckPayment = Boolean(localStorage.getItem("paymentReference") && localStorage.getItem("paymentPollingToken"));
      if (status === 401 || status === 403 || status === 404) {
        setCheckout({ status: "error", title: "Your application session has expired.", message: "Open the resume link in your email to continue.", canCheckPayment });
      } else if (!declarationSaved) {
        setCheckout({ status: "error", title: "We couldn’t save your declaration.", message: detail + "Your entries are still here. Try again to save and continue." });
      } else if (paymentVerified) {
        setCheckout({
          status: "error",
          title: "We couldn’t confirm application submission.",
          message: detail + (status === 402 ? "Check the existing payment before continuing." : "Check your email for application or account setup instructions. If you need help, contact IFIP support."),
          canCheckPayment,
        });
      } else if (status === 400 || status === 503) {
        setCheckout({ status: "error", title: "Checkout is unavailable.", message: detail || "Review your application details or contact IFIP support." });
      } else {
        setCheckout({
          status: "error",
          title: "We couldn’t confirm that checkout started.",
          message: "If you already paid or see a charge, check your previous payment or contact IFIP support before trying again.",
          canCheckPayment,
        });
      }
    } finally {
      if (!redirecting) checkoutRequest.current = false;
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistRequest.current || waitlist.status === "joined" || waitlist.status === "already_joined") return;

    const validation = step1EmailSchema.safeParse({ email: waitlistEmail.trim() });
    if (!validation.success) {
      setWaitlist({ status: "invalid", message: validation.error.issues[0].message });
      waitlistInput.current?.focus();
      return;
    }

    waitlistRequest.current = true;
    setWaitlist({ status: "submitting" });
    try {
      await joinWaitlist(validation.data.email);
      setWaitlist({ status: "joined" });
    } catch (err) {
      setWaitlist({ status: err instanceof Error && "status" in err && err.status === 409 ? "already_joined" : "failed" });
    } finally {
      waitlistRequest.current = false;
    }
  };

  const togglePrimaryInterest = (sector: string) => {
    let updated;
    if (primaryInterest.includes(sector)) {
      updated = primaryInterest.filter(s => s !== sector);
    } else {
      updated = [...primaryInterest, sector];
    }
    setPrimaryInterest(updated);
    if (errors.primaryInterest || errors.otherPrimaryInterest) {
      setErrors((prev) => {
        const copy = { ...prev };
        if (updated.length > 0) delete copy.primaryInterest;
        if (!updated.includes(otherInterest)) delete copy.otherPrimaryInterest;
        return copy;
      });
    }
  };

  const academicChoices = academicStatus && !statusOptions.some((option) => option.label === academicStatus)
    ? [...statusOptions, { label: academicStatus, value: `saved:${academicStatus}` }]
    : statusOptions;

  const interestLabels = interestOptions.map(({ label, value }) => value === "other_specify" ? otherInterest : interestChoice(label));
  const interestChoices = [...new Set([...interestLabels, ...restoredInterests.primary, ...primaryInterest])];
  const secondaryInterestChoices = [...new Set([...interestLabels, restoredInterests.secondary, secondaryInterest].filter(Boolean))];

  const fieldProps = (field: string, id = field, hint?: string) => ({
    id,
    className: formControl,
    "aria-invalid": Boolean(errors[field]) || undefined,
    "aria-describedby": [errors[field] && `${field}-error`, hint].filter(Boolean).join(" ") || undefined,
  });
  const fieldError = (field: string) => errors[field] && (
    <p id={`${field}-error`} className="text-sm text-error">{errors[field]}</p>
  );
  const errorCount = Object.keys(errors).length;
  const formFeedback = (
    <>
      {errorCount > 1 && (
        <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
          Check the {errorCount} fields marked below.
        </p>
      )}
      {formSaveError && (
        <div ref={saveErrorRef} tabIndex={-1} role="alert" className="scroll-mt-28 rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
          <p className="font-semibold">We couldn’t save your progress.</p>
          <p className="mt-1">{formSaveError} Your entries are still here. Select Save and continue to retry.</p>
        </div>
      )}
    </>
  );
  const formActions = (previousStep?: number, unavailable = false) => (
    <div className="space-y-3 border-t border-outline-variant pt-4">
      <div className={previousStep ? stepActionRow : "grid"}>
        {previousStep && (
          <button type="button" onClick={() => goBackToStep(previousStep)} disabled={loading} className={stepBackAction}>
            <HiOutlineChevronLeft aria-hidden="true" className="size-4" />
            Back
          </button>
        )}
        <button type="submit" aria-disabled={loading || unavailable} className={`${stepForwardAction} aria-disabled:cursor-not-allowed aria-disabled:bg-surface-container-high aria-disabled:text-on-surface-variant`}>
          {loading ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </div>
  );

  const stepsList = [
    { num: 1, label: "Verify email" },
    { num: 2, label: "Personal profile" },
    { num: 3, label: "Academic background" },
    { num: 4, label: "Program interest" },
    { num: 5, label: "Skills and motivation" },
    { num: 6, label: "Payment and declaration" }
  ];
  const canContinueApplication = Boolean(token) && step > 1;
  const isResuming = resumeStatus !== "idle";
  const editorialEntry = isResuming || paymentRecovery || step === 1 || (!canContinueApplication && registrationAvailability.status !== "open");
  const availabilityAnnouncement = {
    checking: "",
    open: "Registration is open.",
    full: "This cohort is full. You can join the waitlist.",
    closed: "Registration is closed. You can join the waitlist.",
    failed: "",
  }[registrationAvailability.status];

  return (
    <div className="flex min-h-screen flex-col bg-academic-cream font-sans">
        <header className="border-b border-[#cbd8e8] bg-[#ffffff]">
          <div className={`${entryWidth} flex min-h-16 items-center justify-between gap-2 sm:min-h-[76px]`}>
            <Link href="/" className={`min-w-0 shrink ${entryFocus}`}>
              <Image
                src="/images/logos/logo-full-color.png"
                alt="Islamic Finance Internship Program home"
                width={190}
                height={50}
                priority
                className="h-auto w-[136px] min-[360px]:w-[146px] sm:w-[170px] lg:w-[190px]"
              />
            </Link>
            <div className="flex shrink-0 items-center gap-2 text-sm text-[#101f3f] sm:gap-4">
              <details
                className="relative"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && event.currentTarget.open) {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector("summary")?.focus();
                  }
                }}
              >
                <summary aria-label="Program navigation" className={`flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-[#e1f1fb] [&::-webkit-details-marker]:hidden ${entryFocus}`}>
                  <HiBars3 aria-hidden="true" className="size-5" />
                </summary>
                <nav aria-label="Program" className="absolute end-0 top-full z-20 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-[#cbd8e8] bg-white p-2 shadow-lg">
                  <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/#curriculum">Curriculum</Link>
                  <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/#process">Process</Link>
                  <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/#partners">Partners</Link>
                  <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/#faq">FAQ</Link>
                  {isLoggedIn && (
                    <>
                      <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/dashboard/modules">Modules</Link>
                      <Link className={`block rounded-md px-3 py-2.5 hover:bg-[#e1f1fb] ${entryFocus}`} href="/dashboard/settings">Profile</Link>
                    </>
                  )}
                </nav>
              </details>
              {!isLoggedIn && <span className="hidden text-[#43536e] sm:inline">Already registered?</span>}
              <Link href={isLoggedIn ? "/dashboard" : "/login"} className={`inline-flex min-h-11 items-center rounded-lg border border-[#7185a0] px-2.5 font-semibold whitespace-nowrap hover:bg-[#e1f1fb] sm:px-3.5 ${entryFocus}`}>
                {isLoggedIn ? "Dashboard" : "Sign in"}
              </Link>
            </div>
          </div>
        </header>
      {/* Main Container */}
      <main className={editorialEntry
        ? `${entryWidth} flex-1 pt-5 min-[681px]:pt-12 [&_input]:scroll-my-6 [&_button]:scroll-my-6`
        : `${entryWidth} flex-1 pt-5 sm:pt-10`}>
        <p role="status" className="sr-only">{!isResuming && !canContinueApplication ? availabilityAnnouncement : ""}</p>

        {paymentRecovery && !isResuming ? (
          <RegistrationEntryFrame>
            <section className="space-y-4" aria-labelledby="payment-recovery-heading">
              <h1 id="payment-recovery-heading" ref={focusPaymentRecovery} tabIndex={-1} className={entryHeading}>We couldn’t open your application after payment</h1>
              <p className={entryCopy}>We couldn’t open a saved application with confirmed payment in this browser. Check your email for a resume or account setup link.</p>
              <p className={entryCopy}>If your bank shows a charge, contact IFIP support before making another payment.</p>
              {token && <button type="button" onClick={() => void restoreApplication(resumeToken.current)} className={entryAction}>Check saved application again</button>}
              <div className="flex flex-wrap gap-2.5">
                <Link href="/login" className={formSecondaryAction}>Sign in</Link>
                <a href="mailto:ifip.program@gmail.com" className={formSecondaryAction}>Email IFIP support</a>
              </div>
            </section>
          </RegistrationEntryFrame>
        ) : isResuming ? (
          <RegistrationEntryFrame>
            <section aria-labelledby="resume-heading" className="space-y-4">
              {resumeStatus === "restoring" ? (
                <div role="status" className="space-y-3">
                  <h1 id="resume-heading" className={entryHeading}>Resuming your application</h1>
                  <p className={entryCopy}>Looking up your saved progress…</p>
                </div>
              ) : (
                <>
                  <h1 id="resume-heading" ref={resumeHeading} tabIndex={-1} className={entryHeading}>
                    {resumeStatus === "invalid_link" ? "Resume link unavailable" : resumeStatus === "stale_session" ? "Application session expired" : "We couldn’t load your application"}
                  </h1>
                  <p className={entryCopy}>
                    {resumeStatus === "invalid_link"
                      ? "This link is invalid or has expired. Try the latest resume link from your email."
                      : resumeStatus === "stale_session"
                        ? "Open the resume link in your email or verify your email again."
                        : "Check your connection and try again to load your saved progress."}
                  </p>
                  {resumeStatus === "retry" ? (
                    <button type="button" className={entryAction} onClick={() => void restoreApplication(resumeToken.current)}>Try again</button>
                  ) : (
                    <button type="button" className={entryAction} onClick={continueFromResumeError}>Continue to application</button>
                  )}
                  <Link href="/login" className={`inline-block text-sm text-secondary underline underline-offset-4 ${entryFocus}`}>Already have an account? Sign in</Link>
                </>
              )}
            </section>
          </RegistrationEntryFrame>
        ) : editorialEntry ? (
          <RegistrationEntryFrame open={!registrationNotice && !registrationNoticeLoading && (otpSent || recoverExistingApplication || (registrationAvailability.status !== "full" && registrationAvailability.status !== "closed"))}>
            {registrationNoticeLoading ? (
              <section aria-labelledby="registration-opening-heading" role="status">
                <h1 id="registration-opening-heading" className={entryHeading}>Opening registration</h1>
              </section>
            ) : registrationNotice ? (
              <section aria-labelledby="registration-pause-heading" role="status">
                <EntryIntake label="Applications paused" tone="waitlist" />
                <h1 id="registration-pause-heading" className={entryHeading}>Registration is temporarily paused</h1>
                <p className={`${entryCopy} mt-3`}>{registrationNotice.message}</p>
                <p className={`${entryCopy} mt-3 font-semibold`}>Please return in {timeUntil(registrationNotice.expiresAt, noticeClock)} to continue.</p>
                <p className={`${entryCopy} mt-6`}>Already started? Use the resume link in your email to continue your application.</p>
              </section>
            ) : !otpSent && !recoverExistingApplication && (registrationAvailability.status === "full" || registrationAvailability.status === "closed") ? (
              <section aria-labelledby="waitlist-heading">
                <EntryIntake
                  label={registrationAvailability.status === "full" ? "Cohort at capacity" : "Registration closed"}
                  cohortName={registrationAvailability.status === "full" ? registrationAvailability.cohortName : undefined}
                  tone="waitlist"
                />
                <div role="status">
                  {(waitlist.status === "joined" || waitlist.status === "already_joined") && (
                    <>
                      <HiCheckCircle aria-hidden="true" className="mb-3 size-8 text-[#176448]" />
                      <h1 id="waitlist-heading" ref={waitlistResultHeading} tabIndex={-1} className={entryHeading}>
                        {waitlist.status === "joined" ? "You’ve joined the waitlist" : "You’re already on the waitlist"}
                      </h1>
                      <p className={`${entryCopy} mt-3`}>Watch your inbox for registration updates.</p>
                    </>
                  )}
                  {waitlist.status === "submitting" && <p className="sr-only">Joining the waitlist.</p>}
                </div>
                {waitlist.status !== "joined" && waitlist.status !== "already_joined" && (
                  <>
                    <h1 id="waitlist-heading" ref={availabilityHeading} tabIndex={-1} className={entryHeading}>Join the waitlist</h1>
                    <p className={`${entryCopy} mt-3 mb-5 min-[681px]:mb-6`}>
                      {registrationAvailability.status === "full"
                        ? "This cohort is full. Leave your email for updates about future registration."
                        : "There is no cohort currently accepting applications. Leave your email for updates."}
                    </p>
                    <form onSubmit={handleJoinWaitlist} noValidate className="space-y-3">
                      <div className="space-y-2">
                        <label htmlFor="wl-email" className="block text-sm font-semibold text-[#101f3f]">Email address</label>
                        <input
                          ref={waitlistInput}
                          id="wl-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="name@example.com"
                          value={waitlistEmail}
                          readOnly={waitlist.status === "submitting"}
                          onChange={(event) => {
                            setWaitlistEmail(event.target.value);
                            if (waitlist.status === "invalid" || waitlist.status === "failed") setWaitlist({ status: "idle" });
                          }}
                          aria-invalid={waitlist.status === "invalid" || undefined}
                          aria-describedby={waitlist.status === "invalid" ? "waitlist-email-error" : undefined}
                          className={`${entryInput} ${waitlist.status === "invalid" ? "border-error" : "border-[#7185a0]"}`}
                        />
                        {waitlist.status === "invalid" && (
                          <p id="waitlist-email-error" role="alert" className="text-sm text-error">{waitlist.message}</p>
                        )}
                      </div>
                      {waitlist.status === "failed" && (
                        <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">
                          We couldn’t join the waitlist. Check your connection and try again.
                        </p>
                      )}
                      <button type="submit" aria-disabled={waitlist.status === "submitting"} className={entryAction}>
                        {waitlist.status === "submitting" ? "Joining…" : waitlist.status === "failed" ? "Try again" : "Join waitlist"}
                        <span aria-hidden="true" className="text-xl leading-none">→</span>
                      </button>
                    </form>
                    <button type="button" onClick={() => { setEmail(waitlistEmail); setRecoverExistingApplication(true); }} className={`mt-5 text-sm font-semibold text-secondary underline underline-offset-4 ${entryFocus}`}>
                      Already started? Verify your email to continue
                    </button>
                  </>
                )}
              </section>
            ) : (
              <section aria-labelledby="verify-heading">
                <EntryIntake
                  label={recoverExistingApplication ? "Continue your application" : registrationAvailability.status === "open" ? "Registration open" : "Start your application"}
                  cohortName={registrationAvailability.status === "open" ? registrationAvailability.cohortName : undefined}
                  tone={registrationAvailability.status === "open" ? "open" : "neutral"}
                />
                <div aria-current="step" className="mb-4 space-y-2 text-[13px] font-semibold text-[#43536e] min-[681px]:mb-6">
                  <p>Step 1 of {stepsList.length} · Verify email</p>
                  <div className="grid grid-cols-6 gap-[5px]" aria-hidden="true">
                    {stepsList.map((item) => (
                      <span key={item.num} className={`h-1 rounded-full ${item.num === 1 ? "bg-[#12617e]" : "bg-[#dce1ec]"}`} />
                    ))}
                  </div>
                </div>
                <h1 id="verify-heading" ref={availabilityHeading} tabIndex={-1} className={entryHeading}>Verify your email</h1>
                <p className={`${entryCopy} mt-3 mb-5 min-[681px]:mb-6`}>
                  {otpSent ? (codeDeliveryUncertain ? "If a code arrives, enter it for:" : "Enter the six-digit code sent to:") : "We’ll email you a six-digit code."}
                </p>
                {errorMsg && (
                  <div role="alert" className="mb-4 rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                    <p>{errorMsg}</p>
                    {registeredEmail && <Link href="/login" className={`mt-2 inline-block font-semibold underline ${entryFocus}`}>Sign in</Link>}
                  </div>
                )}
                <p role="status" className="sr-only">{verificationNotice}</p>
                {!otpSent ? (
                  <form noValidate onSubmit={(event) => { event.preventDefault(); handleSendCode(); }} className="space-y-3">
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-[#101f3f]">Email address</label>
                      <input
                        ref={entryEmailInput}
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        spellCheck={false}
                        required
                        readOnly={verificationRequest !== "idle"}
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => {
                          handleInputChange("email", event.target.value, setEmail);
                          setWaitlistEmail(event.target.value);
                        }}
                        aria-invalid={!!errors.email || undefined}
                        aria-describedby={errors.email ? "apply-email-error" : undefined}
                        className={`${entryInput} ${errors.email ? "border-error" : "border-[#7185a0]"}`}
                      />
                      {errors.email && <p id="apply-email-error" role="alert" className="text-sm text-error">{errors.email}</p>}
                    </div>
                    <button type="submit" aria-disabled={verificationRequest !== "idle" || resendCooldown > 0} className={entryAction}>
                      {verificationRequest === "sending" ? "Sending…" : resendCooldown > 0 ? `Send code in ${resendCooldown}s` : "Send code"}
                      <span aria-hidden="true" className="text-xl leading-none">→</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(event) => { event.preventDefault(); void handleVerifyOtp(); }} className="space-y-4">
                    <p className="break-all text-sm font-medium text-[#43536e]">{email}</p>
                    <div className="space-y-2">
                      <label htmlFor="otp" className="block text-sm font-semibold text-[#101f3f]">Verification code</label>
                      <input
                        ref={otpInput}
                        id="otp"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        spellCheck={false}
                        aria-invalid={!!errors.otp || undefined}
                        aria-describedby={errors.otp ? "apply-otp-error otp-hint" : "otp-hint"}
                        maxLength={6}
                        value={otp}
                        readOnly={verificationRequest !== "idle"}
                        onChange={(event) => handleInputChange("otp", event.target.value, setOtp)}
                        className={`${entryInput} font-mono tracking-[0.2em] ${errors.otp ? "border-error" : "border-[#7185a0]"}`}
                      />
                      {errors.otp && <p id="apply-otp-error" role="alert" className="text-sm text-error">{errors.otp}</p>}
                      <p id="otp-hint" className="text-sm text-[#43536e]">Use the six-digit code from your latest email. If it expired, request a new one.</p>
                    </div>
                    <button type="submit" aria-disabled={verificationRequest !== "idle"} className={entryAction}>
                      {verificationRequest === "verifying" ? "Verifying…" : "Verify email"}
                      <span aria-hidden="true" className="text-xl leading-none">→</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-disabled={verificationRequest !== "idle"}
                        className={`min-h-11 rounded-lg px-2 text-sm font-semibold text-secondary underline underline-offset-4 hover:bg-surface-container-low aria-disabled:cursor-wait ${entryFocus}`}
                        onClick={() => {
                          if (activeVerification.current) return;
                          setOtpSent(false);
                          setCodeDeliveryUncertain(false);
                          setOtp("");
                          setErrorMsg("");
                          setErrors({});
                          setVerificationNotice("");
                          focusEntryEmail.current = true;
                        }}
                      >
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSendCode()}
                        aria-disabled={verificationRequest !== "idle" || resendCooldown > 0}
                        className={`min-h-11 rounded-lg px-2 text-sm font-semibold text-secondary underline underline-offset-4 hover:bg-surface-container-low aria-disabled:cursor-not-allowed aria-disabled:text-[#43536e] ${entryFocus}`}
                      >
                        {verificationRequest === "resending" ? "Resending…" : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
            {!registrationNotice && !registrationNoticeLoading && <EntryRecovery />}
          </RegistrationEntryFrame>
        ) : (
          <div className={step < 7 ? "grid overflow-hidden rounded-[18px] border border-[#cbd8e8] bg-[#ffffff] lg:grid-cols-[232px_minmax(0,1fr)]" : "rounded-[18px] border border-[#cbd8e8] bg-[#ffffff]"}>
            {step < 7 && (
              <aside className="hidden bg-[#101f3f] p-7 text-[#f4f8fe] lg:block">
                <p className="text-sm text-[#a9e2fa]">Step {step} of {stepsList.length}</p>
                <h2 className="mb-6 mt-2 font-sans text-3xl font-semibold">Your application</h2>
                <ol aria-label="Application progress" className="space-y-1">
                  {stepsList.map(({ num, label }) => (
                    <li key={num} aria-current={num === step ? "step" : undefined}>
                      {num < step && (num !== 1 || registrationAvailability.status === "open") ? (
                        <button type="button" aria-label={"Back to " + label} onClick={() => goBackToStep(num)}
                          disabled={loading || checkoutBusy || couponBusy}
                          className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-start text-sm text-[#e0e6f1] hover:bg-white/10 focus-visible:outline-white disabled:opacity-60">
                          <HiCheckCircle aria-hidden="true" className="size-4 shrink-0 text-[#a9e2fa]" />{label}
                        </button>
                      ) : (
                        <span className={"flex min-h-11 items-center gap-2 rounded-md px-2 text-sm " + (num === step ? "bg-white/10 font-semibold text-white" : "text-[#d1d7e3]")}>
                          <span aria-hidden="true" className="text-[#a9e2fa]">{String(num).padStart(2, "0")}</span>{label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </aside>
            )}
            <div className="min-w-0 space-y-5 p-4 min-[360px]:p-5 sm:p-9 lg:p-12">
              {step < 7 && (
                <div className="mx-auto max-w-2xl space-y-2 lg:hidden">
                  <p className="text-xs font-semibold text-on-surface-variant">Step {step} of {stepsList.length} · {stepsList[step - 1]?.label}</p>
                  <div aria-hidden="true" className="h-[3px] overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full origin-left rounded-full bg-[#12617e] motion-safe:transition-transform motion-safe:duration-250" style={{ transform: "scaleX(" + step / stepsList.length + ")" }} />
                  </div>
                </div>
              )}
        {/* Error Callout */}
        {errorMsg && (
          <div role="alert" className="rounded-xl border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
            <span className="font-bold block mb-1">Error processing step</span>
            <p>{errorMsg}</p>
          </div>
        )}

        <div role="status" className={saveNotice && !(loading && step >= 2 && step <= 5) ? "text-sm font-semibold text-primary" : "sr-only"}>
          {loading && step >= 2 && step <= 5 ? "Saving your progress…" : saveNotice}
        </div>

        {/* Stateful Card Wrapper */}
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            >
          {/* STEP 2: PROFILE */}
          {step === 2 && (
            <form noValidate onSubmit={(event) => { event.preventDefault(); void saveAllData(3); }} className="space-y-7">
              <div className="space-y-2">
                <h1 ref={focusStepHeading} tabIndex={-1} className={formHeading}>Personal profile</h1>
                <p className="text-sm text-on-surface-variant">Use the name on your government ID and a phone number you use for WhatsApp.</p>
              </div>
              {formFeedback}
              <fieldset disabled={loading} className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                <legend className="sr-only">Personal details</legend>
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="fullName" className={formLabel}>Full legal name</label>
                  <input type="text" autoComplete="name" required value={fullName} {...fieldProps("fullName")}
                    onChange={(event) => handleInputChange("fullName", event.target.value, setFullName)} />
                  {fieldError("fullName")}
                </div>

                <fieldset className="min-w-0 space-y-2 sm:col-span-2">
                  <legend className={formLabel}>WhatsApp phone number</legend>
                  <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div className="min-w-0 space-y-1.5">
                      <label htmlFor="dial-code" className={formPartLabel}>Dialing code</label>
                      <select id="dial-code" autoComplete="tel-country-code" className={formControl} value={selectedCountryCode}
                        onChange={(event) => {
                          dialCodeChosen.current = true;
                          handleInputChange("phone", event.target.value, setSelectedCountryCode);
                        }}>
                        {residenceOptions.map(({ code, name, dialCode }) => (
                          <option key={code} value={code}>{name} ({dialCode})</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <label htmlFor="phone" className={formPartLabel}>Phone number</label>
                      <input type="tel" autoComplete="tel-national" required value={phone} {...fieldProps("phone")}
                        onChange={(event) => handleInputChange("phone", event.target.value, setPhone)} />
                    </div>
                  </div>
                  {fieldError("phone")}
                </fieldset>

                <fieldset className="min-w-0 space-y-2 sm:col-span-2" aria-describedby={errors.dob ? "dob-error" : undefined}>
                  <legend className={`${formLabel} mb-4`}>Date of birth</legend>
                  <div className="grid max-w-md grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.15fr)] gap-2 sm:gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="dob-day" className={formPartLabel}>Day</label>
                      <input type="text" autoComplete="bday-day" inputMode="numeric" maxLength={2} required
                        value={dobDay} {...fieldProps("dob", "dob-day")}
                        onChange={(event) => handleDobPartChange("day", event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="dob-month" className={formPartLabel}>Month</label>
                      <select autoComplete="bday-month" required value={dobMonth} {...fieldProps("dob", "dob-month")}
                        onChange={(event) => handleDobPartChange("month", event.target.value)}>
                        <option value="">Select</option>
                        {birthMonths.map((month, index) => (
                          <option key={month} value={String(index + 1).padStart(2, "0")}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="dob-year" className={formPartLabel}>Year</label>
                      <input type="text" autoComplete="bday-year" inputMode="numeric" maxLength={4} required
                        value={dobYear} {...fieldProps("dob", "dob-year")}
                        onChange={(event) => handleDobPartChange("year", event.target.value)} />
                    </div>
                  </div>
                  {fieldError("dob")}
                </fieldset>

                <div className="min-w-0 space-y-2">
                  <label htmlFor="gender" className={formLabel}>Gender</label>
                  <select required value={gender} {...fieldProps("gender")}
                    onChange={(event) => handleInputChange("gender", event.target.value, setGender)}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {fieldError("gender")}
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="country" className={formLabel}>Country of residence</label>
                  <select autoComplete="country-name" required value={country} {...fieldProps("country")}
                    onChange={(event) => {
                      residenceChosen.current = true;
                      handleInputChange("country", event.target.value, setCountry);
                    }}>
                    <option value="">{geoDetecting ? "Detecting country…" : "Select country"}</option>
                    {country && !residenceOptions.some((option) => option.name === country) && <option value={country}>{country}</option>}
                    {residenceOptions.map(({ code, name }) => <option key={code} value={name}>{name}</option>)}
                  </select>
                  {fieldError("country")}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="stateCity" className={formLabel}>City and state</label>
                  <input type="text" required value={stateCity} {...fieldProps("stateCity")}
                    onChange={(event) => handleInputChange("stateCity", event.target.value, setStateCity)} />
                  {fieldError("stateCity")}
                </div>
              </fieldset>
              {formActions(registrationAvailability.status === "open" ? 1 : undefined)}
            </form>
          )}

          {/* STEP 3: ACADEMIC */}
          {step === 3 && (
            <form noValidate onSubmit={(event) => { event.preventDefault(); if (academicChoices.length) void saveAllData(4); }} className="space-y-7">
              <div className="space-y-2">
                <h1 ref={focusStepHeading} tabIndex={-1} className={formHeading}>Academic background</h1>
                <p className="text-sm text-on-surface-variant">Your education helps IFIP match you with suitable program tracks.</p>
              </div>
              {formFeedback}
              <fieldset disabled={loading} className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                <legend className="sr-only">Education details</legend>
                <fieldset className="min-w-0 space-y-2 sm:col-span-2" aria-describedby={errors.academicStatus ? "academicStatus-error" : undefined}>
                  <legend className={formLabel}>Current academic status</legend>
                  {loadingStatus && statusOptions.length === 0 && <p role="status" className="text-sm text-on-surface-variant">Loading academic status options…</p>}
                  {!loadingStatus && statusOptions.length === 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p role="alert" className="text-sm text-error">
                        {statusError ? "Academic status options couldn’t load." : "No academic status options are available."}
                      </p>
                      <button type="button" onClick={retryStatus} className={formSecondaryAction}>Try loading again</button>
                    </div>
                  )}
                  <div className="grid">
                    {academicChoices.map((status, index) => {
                      const description = STATUS_DESCS[status.label];
                      return (
                        <label key={status.value} className={`flex min-h-12 cursor-pointer items-start gap-3 border-b p-3 text-sm text-on-surface has-checked:bg-[#e1f1fb] ${errors.academicStatus ? "border-error" : "border-outline-variant"}`}>
                          <input
                            id={index === 0 ? "academicStatus" : `academicStatus-${index}`}
                            name="academicStatus"
                            aria-labelledby={`academicStatus-label-${index}`}
                            type="radio"
                            required
                            checked={academicStatus === status.label}
                            onChange={() => handleInputChange("academicStatus", status.label, setAcademicStatus)}
                            aria-describedby={[errors.academicStatus && "academicStatus-error", description && `academicStatus-description-${index}`].filter(Boolean).join(" ") || undefined}
                            className={`mt-0.5 size-4 shrink-0 scroll-mt-28 accent-primary ${entryFocus}`}
                          />
                          <span className="min-w-0 break-words font-semibold">
                            <span id={`academicStatus-label-${index}`}>{status.label}</span>
                            {description && <span id={`academicStatus-description-${index}`} className="mt-0.5 block text-xs font-normal text-on-surface-variant">{description}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldError("academicStatus")}
                </fieldset>

                <div className="min-w-0 space-y-2">
                  <label htmlFor="institution" className={formLabel}>Institution name</label>
                  <input type="text" required value={institution} {...fieldProps("institution")}
                    onChange={(event) => handleInputChange("institution", event.target.value, setInstitution)} />
                  {fieldError("institution")}
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="graduationYear" className={formLabel}>Graduation year <span className="font-normal text-on-surface-variant">(optional)</span></label>
                  <select value={graduationYear} {...fieldProps("graduationYear")}
                    onChange={(event) => handleInputChange("graduationYear", event.target.value, setGraduationYear)}>
                    <option value="">Select year</option>
                    {graduationYear && !graduationYears.includes(graduationYear) && <option value={graduationYear}>{graduationYear}</option>}
                    {graduationYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  {fieldError("graduationYear")}
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="fieldOfStudy" className={formLabel}>Field of study</label>
                  <input type="text" required value={fieldOfStudy} {...fieldProps("fieldOfStudy")}
                    onChange={(event) => handleInputChange("fieldOfStudy", event.target.value, setFieldOfStudy)} />
                  {fieldError("fieldOfStudy")}
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="qualification" className={formLabel}>Highest qualification</label>
                  <select required value={qualification} {...fieldProps("qualification")}
                    onChange={(event) => handleInputChange("qualification", event.target.value, setQualification)}>
                    {qualification && !qualifications.some((option) => option.value === qualification) && <option value={qualification}>{qualification}</option>}
                    {qualifications.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {fieldError("qualification")}
                </div>
              </fieldset>
              {formActions(2, academicChoices.length === 0)}
            </form>
          )}

          {/* STEP 4: INTEREST */}
          {step === 4 && (
            <form noValidate onSubmit={(event) => { event.preventDefault(); if (interestChoices.length) void saveAllData(5); }} className="space-y-7">
              <div className="space-y-2">
                <h1 ref={focusStepHeading} tabIndex={-1} className={formHeading}>Program interest</h1>
                <p className="text-sm text-on-surface-variant">Choose the Islamic finance areas you want to explore during your internship.</p>
              </div>
              {formFeedback}
              {loadingInterests && interestOptions.length === 0 && (
                <p role="status" className="text-sm text-on-surface-variant">Loading program interests…</p>
              )}
              {!loadingInterests && interestOptions.length === 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p role="alert" className="text-sm text-error">
                    {interestError ? "Program interests couldn’t load." : "No program interests are available."}
                    {primaryInterest.length > 0 && " You can continue with your saved choices."}
                  </p>
                  <button type="button" onClick={retryInterests} disabled={loading} className={formSecondaryAction}>Try loading again</button>
                </div>
              )}
              <fieldset disabled={loading || interestChoices.length === 0} className="min-w-0 space-y-5">
                <legend className="sr-only">Areas of interest</legend>
                <fieldset aria-describedby={errors.primaryInterest ? "interest-hint primaryInterest-error" : "interest-hint"} className="@container min-w-0 space-y-2">
                  <legend className={formLabel}>Primary areas of interest</legend>
                  <p id="interest-hint" className="text-sm text-on-surface-variant">Select at least one. You can choose more than one.</p>
                  <div className="grid gap-2 @min-[30rem]:grid-cols-2">
                    {interestChoices.map((interest, index) => (
                      <label key={interest} className={`flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-semibold text-on-surface has-checked:bg-[#e1f1fb] ${errors.primaryInterest ? "border-error" : "border-outline-variant"}`}>
                        <input id={index === 0 ? "primaryInterest" : undefined} type="checkbox" name="primaryInterest" value={interest}
                          aria-describedby={errors.primaryInterest ? "primaryInterest-error" : undefined}
                          checked={primaryInterest.includes(interest)} onChange={() => togglePrimaryInterest(interest)}
                          className={`size-4 shrink-0 scroll-mt-28 accent-primary ${entryFocus}`} />
                        <span className="min-w-0 break-words">{interest}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError("primaryInterest")}
                  {primaryInterest.includes(otherInterest) && (
                    <div className="space-y-2 pt-2">
                      <label htmlFor="otherPrimaryInterest" className={formLabel}>Specify your primary area of interest</label>
                      <input {...fieldProps("otherPrimaryInterest")} type="text" required value={otherPrimaryInterest}
                        onChange={(event) => handleInputChange("otherPrimaryInterest", event.target.value, setOtherPrimaryInterest)} />
                      {fieldError("otherPrimaryInterest")}
                    </div>
                  )}
                </fieldset>
                <div className="space-y-2">
                  <label htmlFor="secondaryInterest" className={formLabel}>Secondary area of interest <span className={optionalLabel}>(optional)</span></label>
                  <select value={secondaryInterest} {...fieldProps("secondaryInterest")} onChange={(event) => {
                    setSecondaryInterest(event.target.value);
                    if (event.target.value !== otherInterest && errors.otherSecondaryInterest) {
                      setErrors((prev) => {
                        const remaining = { ...prev };
                        delete remaining.otherSecondaryInterest;
                        return remaining;
                      });
                    }
                  }}>
                    <option value="">Select an area</option>
                    {secondaryInterestChoices.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                  </select>
                  {secondaryInterest === otherInterest && (
                    <div className="space-y-2 pt-2">
                      <label htmlFor="otherSecondaryInterest" className={formLabel}>Specify your secondary area of interest</label>
                      <input {...fieldProps("otherSecondaryInterest")} type="text" required value={otherSecondaryInterest}
                        onChange={(event) => handleInputChange("otherSecondaryInterest", event.target.value, setOtherSecondaryInterest)} />
                      {fieldError("otherSecondaryInterest")}
                    </div>
                  )}
                </div>
              </fieldset>
              {formActions(3, interestChoices.length === 0)}
            </form>
          )}

          {/* STEP 5: SKILLS & MOTIVATION */}
          {step === 5 && (
            <form noValidate onSubmit={(event) => { event.preventDefault(); void saveAllData(6); }} className="space-y-7">
              <div className="space-y-2">
                <h1 ref={focusStepHeading} tabIndex={-1} className={formHeading}>Skills and motivation</h1>
                <p className="text-sm text-on-surface-variant">Tell us about your experience and what you hope to gain from the program.</p>
              </div>
              {formFeedback}

              <fieldset disabled={loading} className="min-w-0 space-y-4">
                <legend className={formSection}>Experience</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="skills" className={formLabel}>Relevant skills <span className={optionalLabel}>(optional)</span></label>
                    <p id="skills-hint" className="text-sm text-on-surface-variant">Separate skills with commas.</p>
                    <input id="skills" type="text" aria-describedby="skills-hint" className={formControl}
                      value={skillsText} onChange={(event) => setSkillsText(event.target.value)} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="tools" className={formLabel}>Technical tools <span className={optionalLabel}>(optional)</span></label>
                    <p id="tools-hint" className="text-sm text-on-surface-variant">Separate tools with commas.</p>
                    <input id="tools" type="text" aria-describedby="tools-hint" className={formControl}
                      value={toolsText} onChange={(event) => setToolsText(event.target.value)} />
                  </div>
                  <fieldset className="min-w-0 space-y-2 sm:col-span-2">
                    <legend className={formLabel}>Have you had an internship before? <span className={optionalLabel}>(optional)</span></legend>
                    <div className="flex flex-wrap gap-3">
                      {[true, false].map((answer) => (
                        <label key={String(answer)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-outline px-4 text-sm has-checked:border-primary has-checked:bg-primary-fixed/30">
                          <input type="radio" name="priorInternship" checked={hasPriorInternship === answer}
                            onChange={() => setHasPriorInternship(answer)} className={`size-4 accent-primary ${entryFocus}`} />
                          {answer ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {hasPriorInternship && (
                    <div className="min-w-0 space-y-2 sm:col-span-2">
                      <label htmlFor="internship-description" className={formLabel}>What did you do in that internship? <span className={optionalLabel}>(optional)</span></label>
                      <textarea id="internship-description" rows={3} className={formControl}
                        value={priorInternshipDesc} onChange={(event) => setPriorInternshipDesc(event.target.value)} />
                    </div>
                  )}
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="communication" className={formLabel}>Communication skill level</label>
                    <select id="communication" className={formControl} value={commLevel} onChange={(event) => setCommLevel(event.target.value)}>
                      {["Beginner", "Intermediate", "Advanced", "Native"].map((level) => <option key={level}>{level}</option>)}
                    </select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="internship-availability" className={formLabel}>Availability for internship</label>
                    <select id="internship-availability" className={formControl} value={availability} onChange={(event) => setAvailability(event.target.value)}>
                      <option value="Immediately">Immediately (ready to start)</option>
                      {["Within 1 week", "Within 2 weeks", "Within 3 weeks"].map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset disabled={loading} className="min-w-0 space-y-4">
                <legend className={formSection}>Motivation</legend>
                <p id="motivation-hint" className="text-sm text-on-surface-variant">Write at least 10 characters for each answer.</p>
                <div className="space-y-2">
                  <label htmlFor="whyApplying" className={formLabel}>Why are you applying for this program?</label>
                  <textarea rows={4} required minLength={10} value={whyApplying} {...fieldProps("whyApplying", "whyApplying", "motivation-hint")}
                    onChange={(event) => handleInputChange("whyApplying", event.target.value, setWhyApplying)} />
                  {fieldError("whyApplying")}
                </div>
                <div className="space-y-2">
                  <label htmlFor="careerGoals" className={formLabel}>What are your long-term career goals in Islamic finance or related fields?</label>
                  <textarea rows={4} required minLength={10} value={careerGoals} {...fieldProps("careerGoals", "careerGoals", "motivation-hint")}
                    onChange={(event) => handleInputChange("careerGoals", event.target.value, setCareerGoals)} />
                  {fieldError("careerGoals")}
                </div>
              </fieldset>

              <fieldset disabled={loading} className="min-w-0 space-y-4">
                <legend className={formSection}>Links</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="linkedinUrl" className={formLabel}>LinkedIn username <span className={optionalLabel}>(optional)</span></label>
                    <p id="linkedin-hint" className="text-sm text-on-surface-variant">The part after linkedin.com/in/</p>
                    <input type="text" autoCapitalize="none" value={linkedinUrl} {...fieldProps("linkedinUrl", "linkedinUrl", "linkedin-hint")}
                      onChange={(event) => handleInputChange("linkedinUrl", event.target.value, setLinkedinUrl)} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <label htmlFor="portfolioUrl" className={formLabel}>Portfolio link <span className={optionalLabel}>(optional)</span></label>
                    <p id="portfolio-hint" className="text-sm text-on-surface-variant">Include https:// or http://.</p>
                    <input type="url" value={portfolioUrl} {...fieldProps("portfolioUrl", "portfolioUrl", "portfolio-hint")}
                      onChange={(event) => handleInputChange("portfolioUrl", event.target.value, setPortfolioUrl)} />
                    {fieldError("portfolioUrl")}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="lead-source" className={formLabel}>How did you hear about this program?</label>
                  <select id="lead-source" className={formControl} value={leadSource} onChange={(event) => setLeadSource(event.target.value)}>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Twitter (X)">Twitter (X)</option>
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp/Telegram">WhatsApp / Telegram Group</option>
                    <option value="Referral">Referral (friend or colleague)</option>
                    <option value="Campus Ambassador">University / Campus Ambassador</option>
                    <option value="Partner Org">Partner organization</option>
                    <option value="Google Search">Website / Google Search</option>
                    <option value="Event/Webinar">Event / Webinar</option>
                    <option value="Media/Content">IFIP media or content</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </fieldset>
              {formActions(4, false)}
            </form>
          )}

          {/* STEP 6: PAYMENT & DECLARATION */}
          {step === 6 && (
            <div className="space-y-7">
              <div className="space-y-2">
                <h1 ref={focusStepHeading} tabIndex={-1} className={formHeading}>Payment and declaration</h1>
                <p className="text-sm text-on-surface-variant">Review the commitment levy and confirm your application details.</p>
              </div>

              <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="min-w-0 space-y-5">
                  <section aria-labelledby="levy-heading" className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
                    <h3 id="levy-heading" className="font-sans text-2xl text-primary">Commitment levy</h3>
                    {paymentVerified ? (
                      <p className="text-sm text-on-surface-variant"><strong className="text-primary">Payment confirmed.</strong> Submit your application after completing the declaration.</p>
                    ) : (
                      <>
                        {estimatedLevy !== undefined && estimatedTotal !== undefined ? (
                          <dl className="space-y-2 text-sm text-on-surface-variant">
                            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                              <dt>Base estimate</dt>
                              <dd className="font-semibold tabular-nums">{formatLevyAmount(estimatedLevy, levyCurrency)}</dd>
                            </div>
                            {appliedCoupon && (
                              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                                <dt>Coupon discount ({appliedCoupon.discountPercent}%)</dt>
                                <dd className="font-semibold tabular-nums">−{formatLevyAmount(estimatedLevy - estimatedTotal, levyCurrency)}</dd>
                              </div>
                            )}
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-outline-variant pt-3 text-primary">
                              <dt className="font-semibold">Estimated total</dt>
                              <dd className="font-sans text-2xl tabular-nums">{formatLevyAmount(estimatedTotal, levyCurrency)}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-sm text-on-surface-variant" role="status">{pricingFailed ? "The levy estimate is temporarily unavailable." : "Loading levy estimate…"}</p>
                        )}
                        <p className="text-sm leading-relaxed text-on-surface-variant">IFIP confirms the amount and rechecks any coupon when you continue.</p>
                      </>
                    )}
                    <p className="text-sm leading-relaxed text-on-surface-variant">The commitment levy is a non-refundable fee that supports program delivery and administration.</p>
                  </section>

                  {!paymentVerified && (
                    <details open={couponOpen} onToggle={(event) => setCouponOpen(event.currentTarget.open)}
                      className="rounded-xl border border-outline-variant px-4 sm:px-5">
                      <summary ref={couponSummary} className={`min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary ${entryFocus}`}>
                        {appliedCoupon ? "Coupon applied" : "Have a coupon or scholarship code?"}
                      </summary>
                      <div className="space-y-3 border-t border-outline-variant py-4">
                        {appliedCoupon ? (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="min-w-0 break-words text-sm text-primary"><strong>{appliedCoupon.code}</strong> · {appliedCoupon.discountPercent}% discount</p>
                            <button type="button" disabled={checkoutBusy} onClick={handleRemoveCoupon} className={formSecondaryAction}>Remove coupon</button>
                          </div>
                        ) : (
                          <form onSubmit={handleApplyCoupon} className="space-y-2">
                            <label htmlFor="couponCode" className={formLabel}>Coupon code</label>
                            <input id="couponCode" ref={couponField} type="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
                              value={couponInput} readOnly={checkoutBusy || couponBusy}
                              aria-invalid={coupon.status === "error" || undefined}
                              aria-describedby={coupon.status === "error" ? "coupon-error" : undefined}
                              onChange={(event) => {
                                setCouponInput(event.target.value.toUpperCase());
                                setCoupon({ status: "idle" });
                              }}
                              className={formControl} />
                            {coupon.status === "error" && <p id="coupon-error" role="alert" className="text-sm text-error">{coupon.message}</p>}
                            <button type="submit" aria-disabled={couponBusy || checkoutBusy} className={`${formSecondaryAction} aria-disabled:opacity-60`}>
                              {couponBusy ? "Checking code…" : "Apply code"}
                            </button>
                          </form>
                        )}
                      </div>
                    </details>
                  )}
                  <p role="status" className={coupon.status === "removed" ? "text-sm font-semibold text-primary" : "sr-only"}>
                    {coupon.status === "checking" ? "Checking coupon code…" : coupon.status === "applied" ? `${coupon.discountPercent}% discount applied.` : coupon.status === "removed" ? "Coupon removed." : ""}
                  </p>
                </div>

                <form noValidate onSubmit={(event) => { event.preventDefault(); void handleCheckout(); }} className="min-w-0 space-y-5">
                  {formFeedback}
                  <fieldset disabled={checkoutBusy} className="min-w-0 space-y-4">
                    <legend className={formSection}>Declaration</legend>
                    <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed text-on-surface-variant">
                      <li>I confirm that the information provided is accurate and complete.</li>
                      <li>I understand that internship placement is subject to screening and matching after program completion.</li>
                      <li>I agree to participate in assessments and training.</li>
                    </ul>
                    <div className="space-y-2">
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-outline bg-surface-container-lowest p-3 text-sm font-semibold text-on-surface has-checked:border-primary has-checked:bg-primary-fixed/30">
                        <input id="declarationConfirmed" type="checkbox" required checked={declarationConfirmed}
                          aria-invalid={Boolean(errors.declarationConfirmed) || undefined}
                          aria-describedby={errors.declarationConfirmed ? "declarationConfirmed-error" : undefined}
                          onChange={(event) => handleInputChange("declarationConfirmed", event.target.checked, setDeclarationConfirmed)}
                          className={`mt-0.5 size-4 shrink-0 scroll-mt-28 accent-primary ${entryFocus}`} />
                        I acknowledge, declare, and confirm all statements above.
                      </label>
                      {fieldError("declarationConfirmed")}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="signature" className={formLabel}>Full legal name (digital signature)</label>
                      <input type="text" autoComplete="name" required value={signature} {...fieldProps("signature")}
                        onChange={(event) => handleInputChange("signature", event.target.value, setSignature)} />
                      {fieldError("signature")}
                    </div>
                    <p className="text-sm text-on-surface-variant">Declaration date <time dateTime={declarationDate} className="font-semibold">{declarationDate}</time></p>
                  </fieldset>

                  <p role="status" className={checkoutBusy ? "text-sm font-semibold text-primary" : "sr-only"}>
                    {checkout.status === "saving" ? "Saving your declaration…" : checkout.status === "requesting" ? paymentVerified ? "Declaration saved. Submitting your application…" : "Declaration saved. Confirming your checkout details…" : checkout.status === "redirecting" ? "Opening the payment provider…" : ""}
                  </p>

                  {checkout.status === "error" && (
                    <div ref={checkoutError} role="alert" tabIndex={-1} className="scroll-mt-28 space-y-2 rounded-lg border border-error bg-error-container p-4 text-sm text-on-error-container">
                      <p className="font-semibold">{checkout.title}</p>
                      <p>{checkout.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {checkout.canCheckPayment && <Link href="/verify-payment" className={`underline underline-offset-4 ${entryFocus}`}>Check previous payment</Link>}
                        <a href="mailto:ifip.program@gmail.com" className={`underline underline-offset-4 ${entryFocus}`}>Email IFIP support</a>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 border-t border-outline-variant pt-4">
                    {!paymentVerified && (
                      <p className="text-sm text-on-surface-variant">
                        {appliedCoupon?.discountPercent === 100
                          ? "Continue to confirm whether the levy can be waived."
                          : country === "Nigeria" ? "You’ll continue to the payment provider. IFIP checks the payment when you return."
                            : "You’ll get USD bank transfer instructions and a place to submit your receipt."}
                      </p>
                    )}
                    <div className={stepActionRow}>
                      <button type="button" disabled={checkoutBusy || couponBusy} onClick={() => goBackToStep(5)} className={stepBackAction}>
                        <HiOutlineChevronLeft aria-hidden="true" className="size-4" /> Back
                      </button>
                      <button type="submit" aria-disabled={checkoutBusy || couponBusy} className={`${stepForwardAction} aria-disabled:cursor-wait aria-disabled:bg-surface-container-high aria-disabled:text-on-surface-variant`}>
                        {checkoutBusy ? "Please wait…" : paymentVerified ? "Submit application" : appliedCoupon?.discountPercent === 100 ? "Confirm waiver" : country === "Nigeria" ? "Continue to checkout" : "Pay by bank transfer"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {step === 7 && confirmation && (
            <section className="mx-auto max-w-lg space-y-5 py-4" aria-labelledby="confirmation-heading">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <HiShieldCheck aria-hidden="true" className="size-6" />
              </div>
              <h1 id="confirmation-heading" ref={focusStepHeading} tabIndex={-1} className={formHeading}>
                {confirmation.type === "waived" ? "Commitment levy waived" : "Application submitted"}
              </h1>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {confirmation.type === "waived"
                  ? "Your waiver was applied. Check your email for instructions to finish your application or set up your account."
                  : confirmation.setupToken
                    ? "Set a password to access your participant account."
                    : "Check your inbox and spam folder for instructions to set up your account."}
              </p>
              <div className="flex flex-wrap gap-3">
                {confirmation.setupToken && (
                  <Link href={"/set-password?" + new URLSearchParams({ token: confirmation.setupToken })} className={registrationButton}>Set your password</Link>
                )}
                <Link href="/" className={formSecondaryAction}>Return home</Link>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-secondary">
                {!confirmation.setupToken && confirmation.type === "submitted" && (
                  <Link href="/login" className={`inline-flex min-h-11 items-center underline underline-offset-4 ${entryFocus}`}>Sign in</Link>
                )}
                <a href="mailto:ifip.program@gmail.com" className={`inline-flex min-h-11 items-center underline underline-offset-4 ${entryFocus}`}>Email IFIP support</a>
              </div>
            </section>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
            </div>
          </div>
        )}
      </main>

        <footer className={`${entryWidth} flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-4 text-sm leading-relaxed text-[#43536e] min-[681px]:py-6`}>
          <p>Islamic Finance Internship Program</p>
          <nav aria-label="Registration help" className="flex flex-wrap gap-x-4">
            <Link href="/#faq" className={`inline-flex min-h-11 items-center gap-2 underline underline-offset-4 ${entryFocus}`}>Program FAQs</Link>
            <a href="mailto:ifip.program@gmail.com" className={`inline-flex min-h-11 items-center gap-2 underline underline-offset-4 ${entryFocus}`}><TbMail aria-hidden="true" className="size-4 text-[#12617e]" />Email support</a>
            <a href="https://wa.me/2349060356610" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-2 underline underline-offset-4 ${entryFocus}`}><TbBrandWhatsapp aria-hidden="true" className="size-4 text-[#12617e]" />WhatsApp support</a>
          </nav>
        </footer>

    </div>
  );
}
