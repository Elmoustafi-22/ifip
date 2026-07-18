"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineShieldCheck,
  HiChevronRight,
  HiCheckCircle,
  HiOutlineChevronLeft,
  HiPaperClip,
  HiLockClosed,
  HiShieldCheck,
  HiBars3,
  HiXMark,
  HiEnvelope,
  HiInformationCircle,
  HiOutlineClock,
  HiShare,
  HiUserGroup,
} from "react-icons/hi2";
import {
  TbBook,
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
import { motion, AnimatePresence } from "framer-motion";

import {
  startApplication,
  verifyOtp,
  getApplicantProfile,
  updateApplicantProfile,
  uploadCv,
  submitApplication,
  resumeApplication,
  initiatePayment,
  checkPaymentStatus,
  getCohortStatus,
  getRegistrationStatus,
  joinWaitlist,
} from "@/lib/api/services";
import { getAccessToken } from "@/lib/api/auth";
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

const STATUS_DESCS: Record<string, string> = {
  "University Student": "Early Years",
  "Penultimate Year Student": "Year before final",
  "Final Year Student": "Graduating 2026",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Steps: 1: VERIFY, 2: PROFILE, 3: ACADEMIC, 4: INTEREST, 5: SKILLS, 6: PAYMENT
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [token, setToken] = useState("");
  const [createdPasswordToken, setCreatedPasswordToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Waitlist/Cohort status state
  const [cohortFull, setCohortFull] = useState(false);
  const [finalizedSeats, setFinalizedSeats] = useState(0);
  const [cohortCap, setCohortCap] = useState(100);
  const [checkingCohortStatus, setCheckingCohortStatus] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistSuccessMsg, setWaitlistSuccessMsg] = useState("");
  const [cohortName, setCohortName] = useState("Batch 2026 Fall-A26");

  // Resume/session restoration states
  const [isResuming, setIsResuming] = useState(false);
  const [isResumeNetworkError, setIsResumeNetworkError] = useState(false);
  const [resumeToken, setResumeToken] = useState("");

  // Step 1 State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
  }, []);

  // Step 2 State (Profile)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [stateCity, setStateCity] = useState("");
  const [dialCodesList, setDialCodesList] = useState<CountryDialCode[]>(DIAL_CODES);
  const [selectedCountryCode, setSelectedCountryCode] = useState("NG");
  const [flagDropdownOpen, setFlagDropdownOpen] = useState(false);
  const [flagSearch, setFlagSearch] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [geoDetecting, setGeoDetecting] = useState(true);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const phoneContainerRef = useRef<HTMLDivElement>(null);
  const countryContainerRef = useRef<HTMLDivElement>(null);

  // Click outside handler to close the flag selector and country dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneContainerRef.current && !phoneContainerRef.current.contains(event.target as Node)) {
        setFlagDropdownOpen(false);
      }
      if (countryContainerRef.current && !countryContainerRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear search queries on dropdown close
  useEffect(() => {
    if (!flagDropdownOpen) setFlagSearch("");
  }, [flagDropdownOpen]);

  useEffect(() => {
    if (!countryDropdownOpen) setCountrySearch("");
  }, [countryDropdownOpen]);

  // Step 3 State (Academic)
  const [academicStatus, setAcademicStatus] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [qualification, setQualification] = useState("Bachelor's Degree");

  // Step 4 State (Interest)
  const [primaryInterest, setPrimaryInterest] = useState<string[]>([]);
  const [secondaryInterest, setSecondaryInterest] = useState("");

  // Step 5 State (Skills & Motivation)
  const [skillsText, setSkillsText] = useState(""); // Comma separated tags
  const [toolsText, setToolsText] = useState("");
  const [hasPriorInternship, setHasPriorInternship] = useState<boolean | null>(null);
  const [priorInternshipDesc, setPriorInternshipDesc] = useState("");
  const [commLevel, setCommLevel] = useState("Intermediate");
  const [availability, setAvailability] = useState("Immediately");
  const [whyApplying, setWhyApplying] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState("");
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
        dataToValidate = { primaryInterest, secondaryInterest };
        break;
      case 5:
        schema = step5SkillsSchema;
        dataToValidate = { 
          whyApplying, 
          careerGoals, 
          cvUrl: cvUrl || (cvFile ? "pending_upload" : ""), 
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
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!formattedErrors[path]) {
          formattedErrors[path] = issue.message;
        }
      });
      setErrors(formattedErrors);

      // Smooth scroll to first error
      setTimeout(() => {
        const errorKeys = Object.keys(formattedErrors);
        if (errorKeys.length > 0) {
          const firstErrorField = document.getElementById(errorKeys[0]);
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
            firstErrorField.focus();
          }
        }
      }, 50);

      return false;
    }

    return true;
  };

  // Check for payment=verified flag set by /verify-payment after successful polling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentFlag = params.get("payment");

    if (paymentFlag === "verified") {
      setPaymentVerified(true);
      setLevyAcknowledged(true);
      // Clean the query param without a reload
      router.replace("/apply");
    }
  }, []);

  // Check cohort capacity on mount or when payment status changes
  useEffect(() => {
    const checkCohortCap = async () => {
      setCheckingCohortStatus(true);
      try {
        const data = await getRegistrationStatus();
        setFinalizedSeats(data.count || 0);
        setCohortCap(data.cap || 100);
        if (data.cohortName) {
          setCohortName(data.cohortName);
        }
        
        // Cohort is full if no active cohort exists OR isFull is true (and user hasn't paid yet)
        if (!paymentVerified) {
          setCohortFull(!data.hasActiveCohort || data.isFull);
        } else {
          setCohortFull(false);
        }
      } catch (err) {
        console.error("Failed to fetch cohort capacity status:", err);
      } finally {
        setCheckingCohortStatus(false);
      }
    };
    checkCohortCap();
  }, [paymentVerified]);

  // Restore token from localStorage on mount and check for resume token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      setResumeToken(urlToken);
      handleResumeApplication(urlToken);
    } else {
      const savedToken = localStorage.getItem("applicantToken");
      if (savedToken) {
        setToken(savedToken);
        fetchCurrentApplicant();
      }
    }
  }, []);

  // Detect user country from IP address on mount (only for fresh sessions)
  useEffect(() => {
    const detectCountry = async () => {
      setGeoDetecting(true);
      try {
        const res = await fetch("/api/geolocation");
        const data = await res.json();
        if (data && data.countryCode) {
          const detectedCode = data.countryCode.toUpperCase();
          
          // Match with local DIAL_CODES list
          const matchedCountry = DIAL_CODES.find(c => c.code === detectedCode);
          if (matchedCountry) {
            setCountry(matchedCountry.name);
            setSelectedCountryCode(matchedCountry.code);

            setDialCodesList(prev => {
              const exists = prev.some(c => c.code === detectedCode);
              if (!exists) {
                return [...prev, matchedCountry];
              }
              return prev;
            });
          } else {
            // Country code not in DIAL_CODES list — default to Nigeria
            setCountry("Nigeria");
            setSelectedCountryCode("NG");
          }
        } else {
          // Detection returned no data — default to Nigeria
          setCountry("Nigeria");
          setSelectedCountryCode("NG");
        }
      } catch (err) {
        console.error("Failed to detect country by IP:", err);
        // Default to Nigeria on error
        setCountry("Nigeria");
        setSelectedCountryCode("NG");
      } finally {
        setGeoDetecting(false);
      }
    };

    // Always run geolocation — gives a sensible default for fresh sessions
    // and a fallback when the saved applicant record has no country saved.
    // Resume/fetch will override this with the actual saved country if present.
    detectCountry();
  }, []);

  const handleResumeApplication = async (tokenToUse: string) => {
    setIsResuming(true);
    setIsResumeNetworkError(false);
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await resumeApplication(tokenToUse);
      const sessionToken = data.sessionToken;
      setToken(sessionToken);
      localStorage.setItem("applicantToken", sessionToken);

      // Prepopulate form fields
      if (data.applicant) {
        const applicant = data.applicant;
        if (applicant.email) setEmail(applicant.email);
        if (applicant.fullName) setFullName(applicant.fullName);
        if (applicant.phone) {
          const parsed = parsePhoneNumber(applicant.phone, dialCodesList);
          setSelectedCountryCode(parsed.countryCode);
          setPhone(parsed.number);
        }
        if (applicant.dob) {
          const dobVal = applicant.dob;
          if (typeof dobVal === "string") {
            setDob(dobVal.substring(0, 10));
          } else if (dobVal instanceof Date) {
            setDob(dobVal.toISOString().substring(0, 10));
          }
        }
        if (applicant.gender) setGender(applicant.gender);
        if (applicant.country) setCountry(applicant.country);
        if (applicant.stateCity) setStateCity(applicant.stateCity);

        if (applicant.academicInfo) {
          if (applicant.academicInfo.status) setAcademicStatus(applicant.academicInfo.status);
          if (applicant.academicInfo.institution) setInstitution(applicant.academicInfo.institution);
          if (applicant.academicInfo.gradYear) setGraduationYear(String(applicant.academicInfo.gradYear));
          if (applicant.academicInfo.fieldOfStudy) setFieldOfStudy(applicant.academicInfo.fieldOfStudy);
          if (applicant.academicInfo.qualification) setQualification(applicant.academicInfo.qualification);
        }

        if (applicant.programInterest) {
          if (applicant.programInterest.primary) setPrimaryInterest(applicant.programInterest.primary);
          if (applicant.programInterest.secondary) setSecondaryInterest(applicant.programInterest.secondary);
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

        if (applicant.cvUrl) setCvUrl(applicant.cvUrl);
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

        // Restore payment-verified state from server — critical for users who
        // paid but closed the browser before clicking "Submit Application".
        // Without this, isPaid=true applicants would see the "Pay Now" button
        // again and risk being charged a second time.
        if (applicant.isPaid) setPaymentVerified(true);

        // Move to the step retrieved from the backend (fall back to step 2 if none)
        const savedStep = applicant.currentStep || 2;
        setStep(savedStep);
      }

      // Clear the query parameter from the browser URL for clean state
      router.replace("/apply");
      setIsResuming(false);
    } catch (err: any) {
      if (err.isNetworkError) {
        setIsResumeNetworkError(true);
        setErrorMsg("Failed to connect to the server. Please check your internet connection.");
      } else {
        // Token expired/invalid - remove query param and exit resume screen to step 1
        router.replace("/apply");
        setIsResuming(false);
        setErrorMsg(err.message || "Failed to resume application. The token might have expired.");
      }
    } finally {
      setLoading(false);
      setGeoDetecting(false);
    }
  };

  const fetchCurrentApplicant = async () => {
    setIsResuming(true);
    setIsResumeNetworkError(false);
    setLoading(true);
    try {
      const data = await getApplicantProfile();
      if (data) {
        // Pre-populate state
        if (data.email) setEmail(data.email);
        if (data.fullName) setFullName(data.fullName);
        if (data.phone) {
          const parsed = parsePhoneNumber(data.phone, dialCodesList);
          setSelectedCountryCode(parsed.countryCode);
          setPhone(parsed.number);
        }
        if (data.dob) {
          const dobStr = typeof data.dob === "string" ? data.dob : data.dob.toISOString();
          setDob(dobStr.substring(0, 10));
        }
        if (data.gender) setGender(data.gender);
        if (data.country) setCountry(data.country);
        if (data.stateCity) setStateCity(data.stateCity);

        if (data.academicInfo) {
          if (data.academicInfo.status) setAcademicStatus(data.academicInfo.status);
          if (data.academicInfo.institution) setInstitution(data.academicInfo.institution);
          if (data.academicInfo.gradYear) setGradYearString(data.academicInfo.gradYear);
          if (data.academicInfo.fieldOfStudy) setFieldOfStudy(data.academicInfo.fieldOfStudy);
          if (data.academicInfo.qualification) setQualification(data.academicInfo.qualification);
        }

        if (data.programInterest) {
          if (data.programInterest.primary) setPrimaryInterest(data.programInterest.primary);
          if (data.programInterest.secondary) setSecondaryInterest(data.programInterest.secondary);
        }

        if (data.skills) {
          if (data.skills.relevantSkills) setSkillsText(data.skills.relevantSkills.join(", "));
          if (data.skills.tools) setToolsText(data.skills.tools.join(", "));
          if (data.skills.hasPriorInternship !== undefined) setHasPriorInternship(data.skills.hasPriorInternship);
          if (data.skills.priorInternshipDesc) setPriorInternshipDesc(data.skills.priorInternshipDesc);
          if (data.skills.commSkillLevel) setCommLevel(data.skills.commSkillLevel);
          if (data.skills.availability) setAvailability(data.skills.availability);
        }

        if (data.motivation) {
          if (data.motivation.whyApplying) setWhyApplying(data.motivation.whyApplying);
          if (data.motivation.careerGoals) setCareerGoals(data.motivation.careerGoals);
        }

        if (data.cvUrl) setCvUrl(data.cvUrl);
        if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
        if (data.portfolioUrl) setPortfolioUrl(data.portfolioUrl);
        if (data.leadSource) setLeadSource(data.leadSource);
        if (data.levyAcknowledged !== undefined) setLevyAcknowledged(data.levyAcknowledged);

        if (data.declaration) {
          if (data.declaration.confirmed !== undefined) setDeclarationConfirmed(data.declaration.confirmed);
          if (data.declaration.signature) setSignature(data.declaration.signature);
          if (data.declaration.date) {
            const declDateVal = data.declaration.date;
            const formattedDate = typeof declDateVal === "string" 
              ? declDateVal.substring(0, 10) 
              : new Date(declDateVal).toISOString().substring(0, 10);
            setDeclarationDate(formattedDate);
          }
        }

        // Restore payment-verified state from server — same fix as handleResumeApplication.
        // Handles the case where the applicantToken is still valid in localStorage
        // and the page auto-loads a paid applicant's record on mount.
        if (data.isPaid) setPaymentVerified(true);

        if (data.currentStep) setStep(data.currentStep);
      }
      setIsResuming(false);
    } catch (err: any) {
      console.error("Error pre-populating form:", err);
      if (err.isNetworkError) {
        setIsResumeNetworkError(true);
        setErrorMsg("Failed to connect to the server. Please check your internet connection.");
      } else {
        // Auth token invalid (401 handled by response interceptor which clears it)
        setIsResuming(false);
      }
    } finally {
      setLoading(false);
      setGeoDetecting(false);
    }
  };

  const handleRetryResume = () => {
    if (resumeToken) {
      handleResumeApplication(resumeToken);
    } else {
      fetchCurrentApplicant();
    }
  };

  const handleCancelResume = () => {
    router.replace("/apply");
    setIsResuming(false);
    setIsResumeNetworkError(false);
    setErrorMsg("");
  };

  const setGradYearString = (year: any) => {
    setGraduationYear(String(year));
  };

  // Step 1: Send OTP code to email
  const handleSendCode = async () => {
    setErrors({});
    setErrorMsg("");
    const validation = step1EmailSchema.safeParse({ email });
    if (!validation.success) {
      setErrors({ email: validation.error.issues[0].message });
      return;
    }
    setLoading(true);
    try {
      await startApplication(email);
      setOtpSent(true);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("full")) {
        setCohortFull(true);
      } else {
        setErrorMsg(err.message || "Failed to send verification code.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Verify OTP code
  const handleVerifyOtp = async () => {
    setErrors({});
    setErrorMsg("");
    const validation = step1OtpSchema.safeParse({ email, otp });
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        formattedErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(formattedErrors);
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      const sessionToken = data.sessionToken;
      setToken(sessionToken);
      localStorage.setItem("applicantToken", sessionToken);

      // Move to Step 2
      setStep(2);
      saveProgressStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

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
    if (!validateStep(currentStep)) {
      return;
    }
    setErrorMsg("");
    setLoading(true);

    let currentCvUrl = cvUrl;

    // If on Step 5 going to Step 6, and a new CV file was selected, upload it first
    if (nextStep === 6 && cvFile) {
      try {
        const uploadData = await uploadCv(cvFile);
        currentCvUrl = uploadData.cvUrl;
        setCvUrl(currentCvUrl);
        setCvFile(null); // Clear cvFile once uploaded successfully
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to upload CV.");
        setLoading(false);
        return;
      }
    }

    const relevantSkills = skillsText.split(",").map(s => s.trim()).filter(Boolean);
    const tools = toolsText.split(",").map(t => t.trim()).filter(Boolean);

    const activeDialInfo = dialCodesList.find(d => d.code === selectedCountryCode);
    const dialCode = activeDialInfo ? activeDialInfo.dialCode : "";
    let cleanPhone = phone.replace(/\s+/g, "");
    if (dialCode && cleanPhone.startsWith(dialCode)) {
      cleanPhone = cleanPhone.substring(dialCode.length);
    }
    const compiledPhone = `${dialCode}${cleanPhone}`;

    const payload = {
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
        primary: primaryInterest,
        secondary: secondaryInterest
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
      cvUrl: currentCvUrl,
      linkedinUrl,
      portfolioUrl,
      leadSource,
      currentStep: nextStep
    };

    try {
      await updateApplicantProfile(payload);
      setStep(nextStep);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save progress.");
    } finally {
      setLoading(false);
    }
  };

  // Step 5 CV change handler
  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setErrorMsg("Please upload a PDF file only.");
        return;
      }
      setCvFile(file);
      setErrorMsg(""); // Clear any previous errors
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cvUrl;
        return copy;
      });
    }
  };

  // Final submit application
  const handleSubmitApplication = async () => {
    if (!validateStep(6)) {
      return;
    }
    setErrorMsg("");
    setLoading(true);

    const payload = {
      levyAcknowledged: levyAcknowledged === true,
      declaration: {
        confirmed: declarationConfirmed,
        signature,
        date: declarationDate ? new Date(declarationDate) : new Date()
      }
    };

    try {
      // First save Step 6 confirmation parameters to Applicant
      await updateApplicantProfile(payload);

      // Call Direct Submit Endpoint
      const res = await submitApplication();
      if (res.setPasswordToken) {
        setCreatedPasswordToken(res.setPasswordToken);
      }

      // Success - clean up local token and route to success page/info screen
      localStorage.removeItem("applicantToken");
      setStep(7); // Show success screen
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  // Step 6 Pay redirect handler
  const handlePayRedirect = async () => {
    if (!validateStep(6)) {
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        levyAcknowledged: true,
        declaration: {
          confirmed: declarationConfirmed,
          signature,
          date: declarationDate ? new Date(declarationDate) : new Date()
        }
      };
      await updateApplicantProfile(payload);

      const data = await initiatePayment();
      if (data.authorizationUrl) {
        // Persist polling credentials so /verify-payment can use them after redirect
        localStorage.setItem("paymentReference", data.reference);
        localStorage.setItem("paymentPollingToken", data.pollingToken);
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("Unable to obtain checkout authorization URL.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize payment gateway. Please try again.");
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError("");
    setWaitlistSuccessMsg("");
    if (!waitlistEmail) {
      setWaitlistError("Please enter your academic or professional email address.");
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await joinWaitlist(waitlistEmail);
      setWaitlistSuccessMsg(res.message || "Successfully joined the waitlist!");
      setWaitlistJoined(true);
    } catch (err: any) {
      setWaitlistError(err.message || "Failed to join waitlist. Please try again.");
    } finally {
      setWaitlistLoading(false);
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
    if (errors.primaryInterest && updated.length > 0) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.primaryInterest;
        return copy;
      });
    }
  };

  const stepsList = [
    { num: 1, label: "Verify" },
    { num: 2, label: "Profile" },
    { num: 3, label: "Academic" },
    { num: 4, label: "Interest" },
    { num: 5, label: "Skills" },
    { num: 6, label: "Payment" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-academic-cream font-sans">
      {/* Navigation Header — mirrors landing page */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo (Mobile & Desktop) */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logos/logo-full-color.png"
              alt="IFIP Logo"
              width={160}
              height={44}
              priority
              className="h-8 md:h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <Link href="/#curriculum" className="text-on-surface/80 hover:text-primary transition-colors">Curriculum</Link>
            <Link href="/#process" className="text-on-surface/80 hover:text-primary transition-colors">Process</Link>
            <Link href="/#partners" className="text-on-surface/80 hover:text-primary transition-colors">Partners</Link>
            <Link href="/#faq" className="text-on-surface/80 hover:text-primary transition-colors">FAQ</Link>
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
            href="/#curriculum"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Curriculum
          </Link>
          <Link
            href="/#process"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Process
          </Link>
          <Link
            href="/#partners"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            Partners
          </Link>
          <Link
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-semibold border-b border-outline-variant/20 pb-2"
          >
            FAQ
          </Link>
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

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col gap-8">

        {checkingCohortStatus ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <svg className="animate-spin w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : isResuming ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center font-sans animate-fadeIn">
            {isResumeNetworkError ? (
              <div className="bg-white border border-outline-variant/30 rounded-[16px] shadow-md p-8 sm:p-12 max-w-md w-full mx-auto flex flex-col items-center gap-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-2 animate-pulse">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-display font-bold text-primary">Connection Issue</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                  We are having trouble connecting to our server to resume your application. Your progress is safe. Please check your internet connection and try again.
                </p>
                <div className="w-full mt-4">
                  <button
                    onClick={handleRetryResume}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold text-sm py-3.5 rounded-[6px] shadow-md hover-lift transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      "Retry Connection"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-outline-variant/30 rounded-[16px] shadow-md p-12 max-w-md w-full mx-auto flex flex-col items-center gap-4 text-center">
                <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p className="text-sm font-semibold text-on-surface-variant font-medium">Resuming your application, please wait...</p>
              </div>
            )}
          </div>
        ) : cohortFull ? (
          <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto py-4 font-sans animate-fadeIn">
            {/* Admissions update badge */}
            <div className="bg-[#FF9800]/10 border border-[#FF9800]/20 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-[#FF9800] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#FF9800] animate-pulse"></span>
              Admissions Update
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl sm:text-4xl font-display font-black text-primary leading-tight">
                {cohortName || "The Current Cohort"} is Now <span className="text-[#FF9800]">Full</span>
              </h1>
              <p className="text-sm md:text-base text-on-surface-variant max-w-2xl leading-relaxed mt-2 font-medium">
                We are humbled by the extraordinary interest in the Islamic Finance Internship Preparatory &amp; Placement Program. We have reached our maximum capacity of finalized applications for the current cycle.
              </p>
            </div>

            {/* Main Waitlist Info Container */}
            <div className="w-full max-w-xl mx-auto text-left mt-4">
              {/* Join Waitlist Form */}
              <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-level1 p-8 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5 border-b border-outline-variant/20 pb-4">
                  <h3 className="text-lg font-bold font-display text-primary">Secure Early Access</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Join our exclusive waitlist to be notified first when the Batch 2026 Fall-B26 or Fall-A27 applications open.
                  </p>
                </div>

                {waitlistJoined ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col items-center text-center gap-3 animate-fadeIn">
                    <HiCheckCircle className="w-12 h-12 text-emerald-500" />
                    <h4 className="text-sm font-bold text-emerald-900">You are on the list!</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed max-w-xs font-medium">
                      {waitlistSuccessMsg} We will keep you updated on admissions timelines and exclusive preview contents.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleJoinWaitlist} noValidate className="flex flex-col gap-4">
                    {waitlistError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
                        {waitlistError}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="wl-email" className="text-[10px] uppercase font-bold text-primary tracking-wide">
                        Academic/Professional Email
                      </label>
                      <div className="relative">
                        <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50 pointer-events-none" />
                        <input
                          id="wl-email"
                          type="email"
                          placeholder="name@university.edu"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-outline-variant/40 rounded-[6px] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-slate-50/40"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={waitlistLoading}
                      className="w-full bg-[#000666] hover:bg-[#000666]/90 disabled:bg-[#000666]/40 text-white font-bold text-sm py-3.5 rounded-[6px] shadow-md hover-lift transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {waitlistLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Joining Waitlist...
                        </>
                      ) : (
                        "Notify Me"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Member Privileges */}
            <div className="w-full flex flex-col gap-8 border-t border-outline-variant/30 pt-10 mt-6 text-left">
              <h3 className="text-xl font-display font-bold text-primary text-center">Waitlist Member Privileges</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-primary shrink-0">
                    <HiOutlineClock className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-primary">Priority Selection</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Be the first to receive invitation links 48 hours before public launch.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-primary shrink-0">
                    <TbBook className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-primary">Module Previews</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Get exclusive access to the &apos;Ethical Frameworks&apos; introductory reading list.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-primary shrink-0">
                    <HiOutlineShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-primary">Industry Updates</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Monthly insights on Shariah-compliant finance trends and placements.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-4">
              <span className="text-xs text-on-surface-variant/80 font-medium">
                Stay connected for off-cycle placement opportunities.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="flex-1 sm:flex-initial p-3 bg-slate-100 hover:bg-slate-200 rounded-[6px] text-primary transition-colors flex items-center justify-center gap-1.5 text-xs font-bold"
                  aria-label="Share page"
                >
                  <HiShare className="w-4 h-4" />
                </button>
                <a
                  href="mailto:ifip.program@gmail.com"
                  className="flex-1 sm:flex-initial text-center border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-xs px-6 py-3 rounded-[6px] transition-colors"
                >
                  Contact Admissions
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Page Title */}
        {step < 7 && (
          <div className="text-center flex flex-col items-center gap-2">
            <h1 className="text-3xl font-display font-bold text-primary">Program Application</h1>
            <p className="text-sm text-on-surface-variant max-w-lg">
              Complete the details below to join the Batch 2026-A Islamic Finance Program.
            </p>
            {step < 6 && (
              <div className="mt-2 bg-emerald-500/5 border border-emerald-500/15 px-4 py-2 rounded-lg text-xs text-emerald-600 font-semibold flex items-center gap-2">
                <HiOutlineShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Your application progress is automatically saved as you fill out each section.</span>
              </div>
            )}
          </div>
        )}

        {/* Step Progress Tracker */}
        {step < 7 && (
          <div className="flex items-center justify-between w-full max-w-2xl mx-auto relative px-2">
            {/* Background progress line */}
            <div className="absolute left-8 right-8 top-5 h-[2px] bg-slate-200 -z-10"></div>
            {/* Active progress line */}
            <div
              className="absolute left-8 top-5 h-[2px] bg-primary -z-10 transition-all duration-300"
              style={{ width: `${((step - 1) / 5) * 100}%` }}
            ></div>

            {stepsList.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2">
                <button
                  disabled={s.num > step && !token}
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center border transition-all duration-300 ${s.num === step
                    ? "bg-primary text-white border-primary ring-4 ring-primary/10"
                    : s.num < step
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-on-surface-variant border-outline-variant/30"
                    }`}
                >
                  {s.num < step ? "✓" : s.num}
                </button>
                <span className={`text-[10px] uppercase font-bold tracking-wider hidden sm:block ${s.num === step ? "text-primary font-black" : "text-on-surface-variant/80"
                  }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error Callout */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-6 py-4 rounded-xl shadow-sm text-left">
            <span className="font-bold block mb-1">Error processing step</span>
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Stateful Card Wrapper */}
        <div className="bg-white border border-outline-variant/30 rounded-[16px] shadow-md p-4 sm:p-8 md:p-12 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* STEP 1: VERIFY */}
              {step === 1 && (
            <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0122 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>

              <h2 className="text-2xl font-display font-bold text-primary">Verify Your Email</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Enter your email to receive a 6-digit verification code. No password required to apply.
              </p>

              {!otpSent ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendCode();
                  }}
                  className="w-full flex flex-col gap-4 text-left font-sans mt-4"
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                      Email Address
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => handleInputChange("email", e.target.value, setEmail)}
                        className={`flex-1 border rounded-[6px] px-4 py-3 text-sm focus:outline-none transition-colors ${
                          errors.email
                            ? "border-red-300 focus:border-red-500 bg-red-50/10"
                            : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="bg-primary hover:bg-primary/95 text-white font-bold text-sm px-6 py-3 rounded-[6px] transition-all cursor-pointer whitespace-nowrap disabled:bg-slate-300"
                      >
                        {loading ? "Sending..." : "Send Code"}
                      </button>
                    </div>
                    {errors.email && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
                    )}
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyOtp();
                  }}
                  className="w-full flex flex-col gap-4 text-left font-sans mt-4"
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                      Email Address
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        disabled
                        className="flex-1 border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none bg-slate-100 text-on-surface-variant cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/95 text-white font-bold text-sm px-6 py-3 rounded-[6px] transition-all cursor-pointer whitespace-nowrap disabled:bg-slate-300"
                      >
                        {loading ? "Sending..." : "Resend Code"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                      6-Digit OTP Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="* * * * * *"
                      value={otp}
                      onChange={(e) => handleInputChange("otp", e.target.value, setOtp)}
                      className={`w-full text-center tracking-[1em] font-mono border rounded-[6px] px-4 py-3 text-base focus:outline-none ${
                        errors.otp
                          ? "border-red-300 focus:border-red-500 bg-red-50/10"
                          : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                      }`}
                    />
                    {errors.otp && (
                      <span className="text-red-500 text-xs mt-1 block text-center tracking-normal font-sans">{errors.otp}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full bg-impact-orange hover:bg-impact-orange/95 text-white font-bold text-base py-4 rounded-[6px] shadow-md hover-lift transition-all cursor-pointer mt-2 disabled:bg-slate-300"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: PROFILE */}
          {step === 2 && (
            <div className="flex flex-col gap-8 text-left font-sans">
              <div className="border-b border-outline-variant/20 pb-4">
                <span className="text-xs uppercase font-bold text-vibrant-blue tracking-widest">Step 2 of 6: Identity & Residency</span>
                <h2 className="text-2xl font-display font-bold text-primary mt-1">Personal Profile</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Full Legal Name</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full legal name exactly as it appears on your government ID"
                    value={fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value, setFullName)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.fullName
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  />
                  {errors.fullName && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.fullName}</span>
                  )}
                </div>

                <div className="relative" ref={phoneContainerRef}>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Phone Number (WhatsApp Active)</label>
                  
                  <div className={`flex items-stretch border rounded-[6px] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-visible ${
                    errors.phone
                      ? "border-red-300 bg-red-50/10"
                      : "border-outline-variant/40 bg-slate-50/50"
                  }`}>
                    {/* Flag Dropdown Trigger */}
                    <button
                      type="button"
                      onClick={() => setFlagDropdownOpen(!flagDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 border-r border-outline-variant/40 hover:bg-slate-100/80 active:bg-slate-200/50 transition-colors select-none cursor-pointer text-sm font-semibold text-primary"
                    >
                      <span className="text-lg leading-none">
                        {dialCodesList.find(d => d.code === selectedCountryCode)?.flag || "🇳🇬"}
                      </span>
                      <span className="text-xs font-bold font-sans">
                        {dialCodesList.find(d => d.code === selectedCountryCode)?.dialCode || "+234"}
                      </span>
                      <svg className="w-3.5 h-3.5 text-on-surface-variant/80 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Phone Input Box */}
                    <input
                      id="phone"
                      type="tel"
                      placeholder="800 000 0000"
                      value={phone}
                      onChange={(e) => handleInputChange("phone", e.target.value, setPhone)}
                      className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm focus:outline-none focus:ring-0 placeholder:text-on-surface-variant/50"
                    />
                  </div>

                  {errors.phone && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.phone}</span>
                  )}

                  {/* Flag List Dropdown Menu */}
                  {flagDropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-xl z-[999] w-[min(288px,90vw)] flex flex-col overflow-hidden">
                      {/* Search Box */}
                      <div className="p-2 border-b border-outline-variant/20 bg-slate-50/50">
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={flagSearch}
                          onChange={(e) => setFlagSearch(e.target.value)}
                          className="w-full border border-outline-variant/40 rounded-[6px] px-3 py-1.5 text-xs focus:outline-none focus:border-primary bg-white font-sans text-primary font-medium"
                          autoFocus
                        />
                      </div>
                      
                      {/* Scrollable list */}
                      <div className="max-h-52 overflow-y-auto py-1 flex flex-col scrollbar-thin">
                        {dialCodesList
                          .filter((item) => 
                            item.name.toLowerCase().includes(flagSearch.toLowerCase()) || 
                            item.dialCode.includes(flagSearch) ||
                            item.code.toLowerCase().includes(flagSearch.toLowerCase())
                          )
                          .map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountryCode(item.code);
                                setFlagDropdownOpen(false);
                                document.getElementById("phone")?.focus();
                              }}
                              className={`flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer text-sm font-sans ${
                                selectedCountryCode === item.code ? "bg-slate-50 text-vibrant-blue font-bold" : "text-primary font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg leading-none">{item.flag}</span>
                                <span className="truncate max-w-[150px]">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-on-surface-variant/80">{item.dialCode}</span>
                            </button>
                          ))}
                        {dialCodesList.filter((item) => 
                          item.name.toLowerCase().includes(flagSearch.toLowerCase()) || 
                          item.dialCode.includes(flagSearch) ||
                          item.code.toLowerCase().includes(flagSearch.toLowerCase())
                        ).length === 0 && (
                          <span className="text-xs text-on-surface-variant/60 text-center py-4 font-sans font-medium">
                            No countries found
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => handleInputChange("dob", e.target.value, setDob)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.dob
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  />
                  {errors.dob && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.dob}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Gender</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => handleInputChange("gender", e.target.value, setGender)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.gender
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.gender}</span>
                  )}
                </div>

                <div ref={countryContainerRef} className="relative">
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Country of Residence</label>
                  {/* Searchable country dropdown */}
                  <button
                    id="country"
                    type="button"
                    onClick={() => setCountryDropdownOpen(prev => !prev)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none transition-colors ${
                      errors.country
                        ? "border-red-300 bg-red-50/10"
                        : countryDropdownOpen
                          ? "border-primary ring-1 ring-primary bg-slate-50/50"
                          : "border-outline-variant/40 bg-slate-50/50 hover:border-primary/50"
                    }`}
                  >
                    <span className={country ? "text-on-surface" : "text-on-surface-variant/50"}>
                      {country
                        ? (() => {
                            const found = DIAL_CODES.find(c => c.name === country);
                            return found ? `${found.flag} ${country}` : country;
                          })()
                        : geoDetecting ? "Detecting location..." : "Select Country of Residence"
                      }
                    </span>
                    <svg className={`w-4 h-4 text-on-surface-variant transition-transform ${countryDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {countryDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden">
                      {/* Search input */}
                      <div className="p-2 border-b border-outline-variant/20">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary bg-slate-50"
                        />
                      </div>
                      {/* Country list */}
                      <div className="max-h-52 overflow-y-auto">
                        {/* Nigeria pinned first if search is empty or matches */}
                        {["Nigeria", ...DIAL_CODES.filter(c => c.name !== "Nigeria").sort((a, b) => a.name.localeCompare(b.name)).map(c => c.name)]
                          .filter(name => name.toLowerCase().includes(countrySearch.toLowerCase()))
                          .map(name => {
                            const info = DIAL_CODES.find(c => c.name === name);
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  handleInputChange("country", name, setCountry);
                                  setCountryDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                                  country === name
                                    ? "bg-primary/5 text-primary font-bold"
                                    : "hover:bg-slate-50 text-on-surface"
                                }`}
                              >
                                <span className="text-base leading-none">{info?.flag}</span>
                                <span>{name}</span>
                                {country === name && (
                                  <svg className="w-4 h-4 ml-auto text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })
                        }
                        {["Nigeria", ...DIAL_CODES.filter(c => c.name !== "Nigeria").map(c => c.name)]
                          .filter(name => name.toLowerCase().includes(countrySearch.toLowerCase()))
                          .length === 0 && (
                          <span className="text-xs text-on-surface-variant/60 text-center py-4 block font-sans font-medium">
                            No countries found
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {errors.country && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.country}</span>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-primary block mb-2">State / City</label>
                  <input
                    id="stateCity"
                    type="text"
                    placeholder="e.g. Your City, Region"
                    value={stateCity}
                    onChange={(e) => handleInputChange("stateCity", e.target.value, setStateCity)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.stateCity
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  />
                  {errors.stateCity && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.stateCity}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm px-4 py-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => saveAllData(3)}
                  disabled={loading || !fullName || !phone || !dob || !gender || !stateCity}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white font-bold text-sm px-8 py-3 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300"
                >
                  {loading ? "Saving..." : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ACADEMIC */}
          {step === 3 && (
            <div className="flex flex-col gap-8 text-left font-sans">
              <div className="border-b border-outline-variant/20 pb-4">
                <span className="text-xs uppercase font-bold text-vibrant-blue tracking-widest">Step 3 of 6: Academic Information</span>
                <h2 className="text-2xl font-display font-bold text-primary mt-1">Academic Background</h2>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Providing accurate educational details helps us tailor your internship matching and verify eligibility for program tracks.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-primary block mb-3">Current Academic Status</label>
                <div id="academicStatus" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {loadingStatus ? (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400 animate-pulse font-medium">
                      Loading academic status options...
                    </div>
                  ) : statusError && statusOptions.length === 0 ? (
                    <div className="col-span-full py-6 flex flex-col items-center justify-center gap-3 text-center border border-red-200/50 bg-red-50/20 rounded-xl p-4">
                      <p className="text-xs text-red-600 font-semibold">Failed to load academic status options due to poor connection.</p>
                      <button 
                        type="button" 
                        onClick={retryStatus}
                        className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary/95 cursor-pointer shadow-sm transition-colors"
                      >
                        Retry Loading
                      </button>
                    </div>
                  ) : (
                    statusOptions.map((status) => {
                      const desc = STATUS_DESCS[status.label] || "Applicant status";
                      return (
                        <button
                          key={status.value}
                          onClick={() => handleInputChange("academicStatus", status.label, setAcademicStatus)}
                          className={`p-4 border rounded-xl text-left flex flex-col gap-1 cursor-pointer transition-all ${academicStatus === status.label
                            ? "border-vibrant-blue bg-vibrant-blue/5 shadow-sm"
                            : "border-outline-variant/30 bg-white hover:bg-slate-50"
                            }`}
                        >
                          <span className="text-sm font-bold text-primary">{status.label}</span>
                          <span className="text-[10px] text-on-surface-variant font-medium">({desc})</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {errors.academicStatus && (
                  <span className="text-red-500 text-xs mt-2 block">{errors.academicStatus}</span>
                )}
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Institution Name</label>
                  <input
                    id="institution"
                    type="text"
                    placeholder="e.g. Your University or College"
                    value={institution}
                    onChange={(e) => handleInputChange("institution", e.target.value, setInstitution)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.institution
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  />
                  {errors.institution && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.institution}</span>
                  )}
                </div>
 
                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Graduation Year (if applicable)</label>
                  <select
                    id="graduationYear"
                    value={graduationYear}
                    onChange={(e) => handleInputChange("graduationYear", e.target.value, setGraduationYear)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.graduationYear
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  >
                    <option value="">Select Graduation Year (if applicable)</option>
                    {Array.from({ length: 2035 - 2010 + 1 }, (_, i) => String(2010 + i)).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  {errors.graduationYear && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.graduationYear}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Field of Study / Discipline</label>
                  <input
                    id="fieldOfStudy"
                    type="text"
                    placeholder="e.g. Economics or Finance"
                    value={fieldOfStudy}
                    onChange={(e) => handleInputChange("fieldOfStudy", e.target.value, setFieldOfStudy)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.fieldOfStudy
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  />
                  {errors.fieldOfStudy && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.fieldOfStudy}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Highest Qualification Obtained</label>
                  <select
                    id="qualification"
                    value={qualification}
                    onChange={(e) => handleInputChange("qualification", e.target.value, setQualification)}
                    className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                      errors.qualification
                        ? "border-red-300 focus:border-red-500 bg-red-50/10"
                        : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                    }`}
                  >
                    <option value="Undergraduate">Undergraduate Student</option>
                    <option value="Diploma">Diploma / ND / HND</option>
                    <option value="Bachelor's Degree">Bachelor's Degree (B.Sc, B.A, etc.)</option>
                    <option value="Master's Degree">Master's Degree (M.Sc, MBA, etc.)</option>
                    <option value="Doctorate">PhD / Doctorate</option>
                  </select>
                  {errors.qualification && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.qualification}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm px-4 py-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => saveAllData(4)}
                  disabled={loading || !academicStatus || !institution || !fieldOfStudy || !qualification}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white font-bold text-sm px-8 py-3 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300"
                >
                  {loading ? "Saving..." : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: INTEREST */}
          {step === 4 && (
            <div className="flex flex-col gap-8 text-left font-sans">
              <div className="border-b border-outline-variant/20 pb-4">
                <span className="text-xs uppercase font-bold text-vibrant-blue tracking-widest">Step 4 of 6: Program Focus</span>
                <h2 className="text-2xl font-display font-bold text-primary mt-1">Program Interest</h2>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  To better align your internship placement, please specify which sectors of Islamic Finance resonate most with your career goals.
                </p>
              </div>

              {interestError && interestOptions.length === 0 ? (
                <div className="col-span-full py-8 flex flex-col items-center justify-center gap-3 text-center border border-red-200/50 bg-red-50/20 rounded-xl p-6">
                  <p className="text-sm text-red-600 font-semibold">Failed to load areas of interest due to poor connection.</p>
                  <button 
                    type="button" 
                    onClick={retryInterests}
                    className="px-6 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/95 cursor-pointer shadow-md transition-colors"
                  >
                    Retry Loading Options
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">Primary Area of Interest (Select the one that applies to you) *</label>
                    <select
                      id="primaryInterest"
                      value={primaryInterest[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = val ? [val] : [];
                        setPrimaryInterest(updated);
                        if (errors.primaryInterest && updated.length > 0) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.primaryInterest;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                        errors.primaryInterest
                          ? "border-red-300 focus:border-red-500 bg-red-50/10"
                          : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                      }`}
                    >
                      <option value="">
                        {loadingInterests ? "Loading options..." : "Select Primary Area of Interest..."}
                      </option>
                      {!loadingInterests &&
                        interestOptions.map((option) => (
                          <option key={option.value} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                    {errors.primaryInterest && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.primaryInterest}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">Secondary Area of Interest (Optional)</label>
                    <select
                      value={secondaryInterest}
                      onChange={(e) => setSecondaryInterest(e.target.value)}
                      className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                    >
                      <option value="">
                        {loadingInterests ? "Loading options..." : "Select an optional second focus..."}
                      </option>
                      {!loadingInterests &&
                        interestOptions.map((option) => (
                          <option key={option.value} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                    <span className="text-[10px] text-on-surface-variant/80 mt-1 block">Choosing a secondary area helps us understand the breadth of your profile.</span>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm px-4 py-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => saveAllData(5)}
                  disabled={loading || primaryInterest.length === 0}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white font-bold text-sm px-8 py-3 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300"
                >
                  {loading ? "Saving..." : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SKILLS & MOTIVATION */}
          {step === 5 && (
            <div className="flex flex-col gap-8 text-left font-sans">
              <div className="border-b border-outline-variant/20 pb-4">
                <span className="text-xs uppercase font-bold text-vibrant-blue tracking-widest">Step 5 of 6: Attributes & CV Upload</span>
                <h2 className="text-2xl font-display font-bold text-primary mt-1">Skills & Motivation</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase text-primary flex items-end mb-2 min-h-[32px]">Relevant Skills (e.g. Excel, Power BI, Figma, Research, Writing, etc.)</label>
                  <input
                    type="text"
                    placeholder="e.g. Financial Analysis, Shariah Audit, Excel"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                  />
                  <span className="text-[9px] text-on-surface-variant/80 mt-1 block">Separate multiple skills with commas.</span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary flex items-end mb-2 min-h-[32px]">Technical Tools You Can Use</label>
                  <input
                    type="text"
                    placeholder="e.g. Excel, Power BI, Bloomberg Terminal, etc."
                    value={toolsText}
                    onChange={(e) => setToolsText(e.target.value)}
                    className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                  />
                  <span className="text-[9px] text-on-surface-variant/80 mt-1 block">List software tools you are proficient in.</span>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-primary block mb-3">Previous Internship Experience</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={hasPriorInternship === true}
                        onChange={() => setHasPriorInternship(true)}
                        className="w-4 h-4 text-primary"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={hasPriorInternship === false}
                        onChange={() => setHasPriorInternship(false)}
                        className="w-4 h-4 text-primary"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {hasPriorInternship && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase text-primary block mb-2">If yes, describe briefly</label>
                    <textarea
                      rows={3}
                      placeholder="Outline your roles, duties, and lessons learned..."
                      value={priorInternshipDesc}
                      onChange={(e) => setPriorInternshipDesc(e.target.value)}
                      className="w-full border border-outline-variant/40 rounded-[6px] p-4 text-sm focus:outline-none focus:border-primary bg-slate-50/50 font-sans"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Communication Skill Level</label>
                  <select
                    value={commLevel}
                    onChange={(e) => setCommLevel(e.target.value)}
                    className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Native">Native</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-primary block mb-2">Availability for Internship</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                  >
                    <option value="Immediately">Immediately (Ready to start)</option>
                    <option value="Within 1 week">Within 1 week</option>
                    <option value="Within 2 weeks">Within 2 weeks</option>
                    <option value="Within 3 weeks">Within 3 weeks</option>
                  </select>
                </div>

                 <div className="md:col-span-2 bg-[#000666]/5 rounded-2xl p-6 flex flex-col gap-4 border border-[#000666]/10">
                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">Why are you applying for this program?</label>
                    <textarea
                      id="whyApplying"
                      rows={4}
                      placeholder="Describe your interest in Islamic Finance and how this program aligns with your ethics..."
                      value={whyApplying}
                      onChange={(e) => handleInputChange("whyApplying", e.target.value, setWhyApplying)}
                      className={`w-full border rounded-[6px] p-4 text-sm focus:outline-none ${
                        errors.whyApplying
                          ? "border-red-300 focus:border-red-500 bg-red-50/10"
                          : "border-outline-variant/40 focus:border-primary bg-white"
                      }`}
                    />
                    {errors.whyApplying && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.whyApplying}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">What are your long-term career goals in Islamic finance or related fields?</label>
                    <textarea
                      id="careerGoals"
                      rows={4}
                      placeholder="Where do you see yourself in 5 years within the financial sector?"
                      value={careerGoals}
                      onChange={(e) => handleInputChange("careerGoals", e.target.value, setCareerGoals)}
                      className={`w-full border rounded-[6px] p-4 text-sm focus:outline-none ${
                        errors.careerGoals
                          ? "border-red-300 focus:border-red-500 bg-red-50/10"
                          : "border-outline-variant/40 focus:border-primary bg-white"
                      }`}
                    />
                    {errors.careerGoals && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.careerGoals}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="text-xs font-bold uppercase text-primary block">Upload CV (PDF required)</label>
                  <div
                    id="cvUrl"
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-white text-center hover:bg-slate-50 transition-colors relative cursor-pointer min-h-[140px] ${
                      errors.cvUrl ? "border-red-300" : "border-outline-variant/40"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleCvChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="p-3 bg-primary/5 rounded-full text-primary">
                      <HiPaperClip className="w-6 h-6" />
                    </div>
                    {cvFile ? (
                      <span className="text-sm font-bold text-primary">{cvFile.name}</span>
                    ) : cvUrl ? (
                      <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 justify-center">
                        <HiCheckCircle className="w-5 h-5" /> CV Uploaded
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant font-semibold">Click to browse or drag and drop</span>
                    )}
                  </div>
                  {errors.cvUrl && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.cvUrl}</span>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">LinkedIn Profile URL (optional but recommended)</label>
                    <div className="flex">
                      <span className="bg-slate-100 border border-r-0 border-outline-variant/40 rounded-l-[6px] px-3 py-3 text-xs font-semibold text-on-surface-variant flex items-center">
                        linkedin.com/in/
                      </span>
                      <input
                        id="linkedinUrl"
                        type="text"
                        placeholder="username"
                        value={linkedinUrl}
                        onChange={(e) => handleInputChange("linkedinUrl", e.target.value, setLinkedinUrl)}
                        className={`flex-1 border rounded-r-[6px] px-4 py-3 text-sm focus:outline-none ${
                          errors.linkedinUrl
                            ? "border-red-300 focus:border-red-500 bg-red-50/10"
                            : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-primary block mb-2">Portfolio link (if applicable)</label>
                    <input
                      id="portfolioUrl"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      value={portfolioUrl}
                      onChange={(e) => handleInputChange("portfolioUrl", e.target.value, setPortfolioUrl)}
                      className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                        errors.portfolioUrl
                          ? "border-red-300 focus:border-red-500 bg-red-50/10"
                          : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                      }`}
                    />
                    {errors.portfolioUrl && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.portfolioUrl}</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-primary block mb-2">How did you hear about this program?</label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-50/50"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Twitter (X)">Twitter (X)</option>
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp/Telegram">WhatsApp / Telegram Group</option>
                    <option value="Referral">Referral (Friend or Colleague)</option>
                    <option value="Campus Ambassador">University / Campus Ambassador</option>
                    <option value="Partner Org">Partner Organization (Stecs, Halvest, EthicalVest, etc.)</option>
                    <option value="Google Search">Website / Google Search</option>
                    <option value="Event/Webinar">Event / Webinar</option>
                    <option value="Media/Content">IFIP Media / Content (blog, video, article)</option>
                    <option value="Other">Other (Specify)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm px-4 py-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <HiOutlineChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => saveAllData(6)}
                  disabled={loading || !whyApplying || !careerGoals || (!cvFile && !cvUrl)}
                  className="flex-1 sm:flex-none bg-primary hover:bg-primary/95 text-white font-bold text-sm px-8 py-3 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300"
                >
                  {loading ? "Saving..." : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PAYMENT & DECLARATION */}
          {step === 6 && (
            <div className="flex flex-col lg:flex-row gap-8 text-left font-sans">

              {/* Fee Sidebar */}
              <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
                <div className="bg-[#000666]/5 border border-[#000666]/15 rounded-2xl p-6 flex flex-col gap-6">
                  <h3 className="text-xs uppercase font-bold text-primary tracking-widest border-b border-primary/10 pb-3">Fee Summary</h3>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Applicant Origin</span>
                    <span className="text-sm font-bold text-primary block">
                      {country === "Nigeria" ? "Nigeria (West Africa)" : "International Origin"}
                    </span>
                  </div>

                  <div className="bg-white border border-outline-variant/20 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Commitment Levy</span>
                    <span className="text-3xl font-display font-black text-primary">
                      {country === "Nigeria" ? "₦20,000" : "$30"}
                    </span>
                  </div>

                  <p className="text-[10px] text-on-surface-variant/85 leading-relaxed">
                    * The Commitment Levy is a non-refundable administrative fee ensuring high-quality module delivery and program administration.
                  </p>
                </div>

                <div className="bg-primary text-white/90 rounded-2xl p-6 flex items-start gap-3 relative overflow-hidden">
                  <HiLockClosed className="w-5 h-5 shrink-0 text-sky-400 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-white">Secure Application</span>
                    <span className="text-[10px] leading-relaxed text-white/80">
                      Direct admissions pathway is encrypted and protected.
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Action Container */}
              <div className="flex-1 flex flex-col gap-6">
                {/* 1. Payment/Declaration Info Banners */}
                {paymentVerified ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
                    <HiShieldCheck className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold text-emerald-900">Levy Paid & Verified</h4>
                      <p className="text-xs text-emerald-700 font-medium">
                        Your commitment levy of {country === "Nigeria" ? "₦20,000" : "$30"} has been successfully processed and verified. Please finalize your submission below.
                      </p>
                    </div>
                  </div>
                ) : declarationConfirmed && signature ? (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 flex items-start gap-4 animate-fadeIn">
                    <HiInformationCircle className="w-8 h-8 text-primary shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold text-primary">Declaration & Signature Saved</h4>
                      <p className="text-xs text-primary/80 font-medium">
                        Your declaration details have been saved. Please click the button below to pay the commitment levy and complete your application.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* 2. Declaration & Signature Block (Always visible) */}
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Section 7. Declaration */}
                  <div className="bg-[#e8e8ed]/35 border border-outline-variant/30 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold font-display text-primary">7. Declaration</h3>
                    
                    <ul className="list-disc pl-5 text-xs text-on-surface-variant flex flex-col gap-2 mb-4 leading-relaxed font-medium">
                      <li>I confirm that the information provided is accurate and complete.</li>
                      <li>I understand that internship placement is subject to screening and matching after program completion.</li>
                      <li>I agree to participate in assessments and training.</li>
                    </ul>

                    <label id="declarationConfirmed" className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declarationConfirmed}
                        onChange={(e) => handleInputChange("declarationConfirmed", e.target.checked, setDeclarationConfirmed)}
                        className={`w-5 h-5 text-primary rounded mt-0.5 ${
                          errors.declarationConfirmed ? "border-red-300" : "border-outline-variant/50"
                        }`}
                      />
                      <span className="text-xs text-primary font-bold leading-relaxed">
                        I acknowledge, declare, and confirm all statements above.
                      </span>
                    </label>
                    {errors.declarationConfirmed && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.declarationConfirmed}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-primary flex items-end mb-2 min-h-[32px]">Typed Full Name (Digital Signature)</label>
                      <input
                        id="signature"
                        type="text"
                        placeholder="Type your full legal name"
                        value={signature}
                        onChange={(e) => handleInputChange("signature", e.target.value, setSignature)}
                        className={`w-full border rounded-[6px] px-4 py-3 text-sm focus:outline-none ${
                          errors.signature
                            ? "border-red-300 focus:border-red-500 bg-red-50/10"
                            : "border-outline-variant/40 focus:border-primary bg-slate-50/50"
                        }`}
                      />
                      {errors.signature && (
                        <span className="text-red-500 text-xs mt-1 block">{errors.signature}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-primary flex items-end mb-2 min-h-[32px]">Date</label>
                      <input
                        type="date"
                        value={declarationDate}
                        onChange={(e) => handleInputChange("declarationDate", e.target.value, setDeclarationDate)}
                        disabled
                        className="w-full border border-outline-variant/40 rounded-[6px] px-4 py-3 text-sm focus:outline-none focus:border-primary bg-slate-100 text-on-surface-variant font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Back and Action Buttons */}
                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-8 mt-6 gap-3">
                  <button
                    onClick={() => setStep(5)}
                    className="border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm px-4 py-2.5 rounded-[6px] flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <HiOutlineChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  {!paymentVerified ? (
                    <button
                      onClick={handlePayRedirect}
                      disabled={loading || !declarationConfirmed || !signature}
                      className="bg-impact-orange hover:bg-impact-orange/95 text-white font-bold text-sm px-6 py-2.5 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300 whitespace-nowrap shrink-0 font-sans"
                    >
                      {loading ? "Processing..." : "Submit & Pay"}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitApplication}
                      disabled={loading || !declarationConfirmed || !signature}
                      className="bg-impact-orange hover:bg-impact-orange/95 text-white font-bold text-sm px-6 py-2.5 rounded-[6px] cursor-pointer shadow-md hover-lift transition-all disabled:bg-slate-300 whitespace-nowrap shrink-0 font-sans"
                    >
                      {loading ? "Submitting..." : "Submit Application"}
                    </button>
                  )}
                </div>
                {errorMsg && (
                  <div className="mt-4 text-center sm:text-right">
                    <span className="text-red-500 text-xs font-bold inline-block max-w-md">{errorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: SUCCESS SCREEN */}
          {step === 7 && (
            <div className="flex flex-col items-center text-center gap-6 max-w-lg mx-auto py-8 font-sans animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                <HiShieldCheck className="w-12 h-12" />
              </div>

              <h2 className="text-3xl font-display font-bold text-primary">Application Submitted!</h2>
              <p className="text-base text-primary/80 leading-relaxed font-semibold">
                Your application has been received successfully.
              </p>

              {createdPasswordToken ? (
                <>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    You can now set a secure password for your participant account and access your dashboard.
                  </p>

                  <div className="w-full flex flex-col gap-3 mt-4">
                    <Link
                      href={`/set-password?token=${createdPasswordToken}`}
                      className="w-full bg-primary hover:bg-primary/95 text-white font-bold text-sm py-4 rounded-[6px] shadow-md hover-lift transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <HiLockClosed className="w-4 h-4" />
                      Set Password &amp; Login Now
                    </Link>
                  </div>

                  <div className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl p-4 mt-4 flex items-start gap-3 text-left">
                    <HiEnvelope className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      <strong>Email Backup:</strong> We have also sent a confirmation link to your email. You can use it to set your password later if you need to close this page.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    We have emailed you a confirmation link. Please check your inbox (and spam folder) for instructions to <strong>set your password</strong> and log in to your cohort dashboard.
                  </p>

                  <div className="w-full bg-slate-50 border border-outline-variant/30 rounded-xl p-4 mt-4 flex items-start gap-3 text-left">
                    <HiInformationCircle className="w-5 h-5 text-vibrant-blue shrink-0 mt-0.5" />
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      If you do not see the email, please check your spam folder or contact technical support.
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 w-full">
                <Link
                  href="/"
                  className="flex-1 w-full border border-outline-variant/40 hover:bg-slate-50 text-primary font-bold text-sm py-4 rounded-[6px] hover-lift transition-all cursor-pointer"
                >
                  Return to Home
                </Link>
                {!createdPasswordToken && (
                  <Link
                    href="/login"
                    className="flex-1 w-full bg-primary hover:bg-primary/95 text-white font-bold text-sm py-4 rounded-[6px] shadow-sm hover-lift transition-all cursor-pointer"
                  >
                    Go to Dashboard Login
                  </Link>
                )}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-outline-variant/30 py-8 px-6 md:px-12 mt-auto text-xs text-on-surface-variant font-sans flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} IFIP. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Program FAQs</a>
        </div>
      </footer>
      {/* Sticky Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-outline-variant/30 px-6 py-2 flex items-center justify-between shadow-lg font-sans">
        <Link href="/" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        {isLoggedIn ? (
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Workspace</span>
          </Link>
        ) : (
          <Link href="/apply" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Apply</span>
          </Link>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/modules" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Modules</span>
          </Link>
        ) : (
          <Link href="/#faq" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">FAQ</span>
          </Link>
        )}
        {isLoggedIn ? (
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Profile</span>
          </Link>
        ) : (
          <Link href="/login" className="flex flex-col items-center gap-1 text-primary/70 hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider">Login</span>
          </Link>
        )}
      </div>
    </div>
  );
}
