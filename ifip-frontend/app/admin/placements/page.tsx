"use client";

import { useEffect, useState, useContext, useMemo } from "react";
import Link from "next/link";
import { 
  HiOutlineUser, 
  HiOutlineBriefcase, 
  HiOutlineBuildingOffice, 
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineSparkles,
  HiOutlineChevronRight,
  HiOutlineAcademicCap,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineVideoCamera,
  HiOutlineCheck,
} from "react-icons/hi2";
import { 
  getAdminStats, 
  getAdminApplications, 
  getPartners, 
  getAdminPlacements, 
  createPlacementMatch, 
  updatePlacementStatus, 
  createPartner,
  getAdminCohorts,
  uploadLogo,
  AdminStats, 
  Cohort, 
  PartnerOrganization, 
  Placement 
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

const COHORT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

type FilterTab = "all" | "matched" | "unmatched" | "interviewing" | "placed";

export default function AdminPlacementsPage() {
  const { selectedCohortId } = useContext(AdminCohortContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search state
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>("all");

  // Match Modal state
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [matchPartnerId, setMatchPartnerId] = useState("");
  const [matchArea, setMatchArea] = useState("");
  const [matchNotes, setMatchNotes] = useState("");
  const [submittingMatch, setSubmittingMatch] = useState(false);

  // New Partner Modal state
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerDesc, setNewPartnerDesc] = useState("");
  const [newPartnerSlots, setNewPartnerSlots] = useState(5);
  const [newPartnerTags, setNewPartnerTags] = useState("");
  const [newPartnerWebsite, setNewPartnerWebsite] = useState("");
  const [newPartnerLogoUrl, setNewPartnerLogoUrl] = useState("");
  const [newPartnerLogoFile, setNewPartnerLogoFile] = useState<File | null>(null);
  const [newPartnerCohorts, setNewPartnerCohorts] = useState<string[]>([]);
  const [cohorts, setCohorts] = useState<{ _id: string; name: string; status: string }[]>([]);
  const [creatingPartner, setCreatingPartner] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchPlacementsData = async () => {
    try {
      const [statsData, appsData, partnersData, placementsData, cohortsData] = await Promise.all([
        getAdminStats(selectedCohortId || undefined),
        getAdminApplications(undefined, undefined, selectedCohortId || undefined),
        getPartners(),
        getAdminPlacements(),
        getAdminCohorts()
      ]);
      setStats(statsData);
      
      // Candidates eligible for the Matching Desk are those promoted to placement_ready
      const eligibleApps = appsData.filter(app => app.status === 'placement_ready');
      setApplications(eligibleApps);
      
      setPartners(partnersData);
      setPlacements(placementsData);
      setCohorts(cohortsData);
    } catch (err) {
      console.error("Failed to load placement dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCohort = (cohortId: string) => {
    setNewPartnerCohorts((prev) =>
      prev.includes(cohortId) ? prev.filter((id) => id !== cohortId) : [...prev, cohortId]
    );
  };

  useEffect(() => {
    fetchPlacementsData();
  }, [selectedCohortId]);

  // Helper to find existing placement match for a candidate user
  const getUserPlacement = (userId: string) => {
    return placements.find(p => {
      const pUserId = p.userId?._id ? p.userId._id.toString() : p.userId?.toString();
      return pUserId === userId.toString();
    });
  };

  // Metrics calculation
  const counts = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    let interviewing = 0;
    let placed = 0;

    applications.forEach(app => {
      const userId = app.userId?._id || app.userId;
      const match = getUserPlacement(userId);
      if (!match) {
        unmatched++;
      } else {
        matched++;
        if (match.status === 'interviewing') interviewing++;
        if (match.status === 'placed' || match.partnerOutcome === 'offer_extended') placed++;
      }
    });

    const totalPartnerSlots = partners.reduce((acc, p) => acc + (p.activeSlots || 0), 0);

    return {
      total: applications.length,
      matched,
      unmatched,
      interviewing,
      placed,
      totalPartnerSlots
    };
  }, [applications, placements, partners]);

  // Filtered applications based on tabs, search query, and partner filter
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const userId = app.userId?._id || app.userId;
      const match = getUserPlacement(userId);

      // Tab filter
      if (activeFilterTab === "matched" && !match) return false;
      if (activeFilterTab === "unmatched" && match) return false;
      if (activeFilterTab === "interviewing" && (!match || match.status !== "interviewing")) return false;
      if (activeFilterTab === "placed" && (!match || (match.status !== "placed" && match.partnerOutcome !== "offer_extended"))) return false;

      // Specific partner filter
      if (selectedPartnerFilter !== "all") {
        if (!match) return false;
        const partnerId = match.partnerOrgId?._id ? match.partnerOrgId._id.toString() : match.partnerOrgId?.toString();
        if (partnerId !== selectedPartnerFilter) return false;
      }

      // Search query (candidate name or email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = app.fullName?.toLowerCase().includes(q);
        const emailMatch = app.userId?.email?.toLowerCase().includes(q) || app.email?.toLowerCase().includes(q);
        const partnerNameMatch = match?.partnerOrgId?.name?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !partnerNameMatch) return false;
      }

      return true;
    });
  }, [applications, placements, activeFilterTab, selectedPartnerFilter, searchQuery]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !matchPartnerId || submittingMatch) return;
    
    setSubmittingMatch(true);
    try {
      await createPlacementMatch({
        userId: selectedApp.userId?._id || selectedApp.userId,
        partnerOrgId: matchPartnerId,
        areaOfInterest: matchArea || undefined,
        notes: matchNotes || undefined
      });
      alert("Placement match created successfully!");
      setMatchModalOpen(false);
      setSelectedApp(null);
      setMatchPartnerId("");
      setMatchArea("");
      setMatchNotes("");
      fetchPlacementsData();
    } catch (err) {
      console.error(err);
      alert("Failed to register placement match.");
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleUpdateStatus = async (placementId: string, status: string) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await updatePlacementStatus(placementId, status);
      alert("Placement status updated successfully.");
      fetchPlacementsData();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName || creatingPartner) return;
    
    setCreatingPartner(true);
    let finalLogoUrl = newPartnerLogoUrl;
    try {
      if (newPartnerLogoFile) {
        try {
          const uploadRes = await uploadLogo(newPartnerLogoFile);
          finalLogoUrl = uploadRes.url;
        } catch {
          alert("Logo upload failed. Please verify it is a valid image file.");
          setCreatingPartner(false);
          return;
        }
      }
      const sectorTags = newPartnerTags ? newPartnerTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0) : [];
      await createPartner({
        name: newPartnerName,
        description: newPartnerDesc || undefined,
        activeSlots: newPartnerSlots,
        sectorTags,
        logoUrl: finalLogoUrl || undefined,
        website: newPartnerWebsite || undefined,
        cohorts: newPartnerCohorts
      });
      alert("Partner Organization registered successfully!");
      setNewPartnerName("");
      setNewPartnerDesc("");
      setNewPartnerSlots(5);
      setNewPartnerTags("");
      setNewPartnerWebsite("");
      setNewPartnerLogoUrl("");
      setNewPartnerLogoFile(null);
      setNewPartnerCohorts([]);
      setPartnerModalOpen(false);
      fetchPlacementsData();
    } catch (err) {
      console.error(err);
      alert("Failed to create partner.");
    } finally {
      setCreatingPartner(false);
    }
  };

  const calculateMatchScore = (app: any, partner: PartnerOrganization) => {
    if (!app || !partner) return { score: 20, rating: "Alternative Pool", badgeColor: "bg-slate-50 text-slate-500 border-slate-200", matches: [] };
    
    const candidateInterests = app.programInterest?.primary || [];
    const candidateSkills = app.skills?.relevantSkills || [];
    const partnerSectors = partner.sectorTags || [];

    const matches: string[] = [];

    partnerSectors.forEach((sector: string) => {
      const isInterest = candidateInterests.some((interest: string) => interest.toLowerCase().trim() === sector.toLowerCase().trim());
      const isSkill = candidateSkills.some((skill: string) => skill.toLowerCase().trim() === sector.toLowerCase().trim());
      if (isInterest || isSkill) {
        matches.push(sector);
      }
    });

    if (matches.length >= 2) {
      return { score: 100, rating: "Strong Match", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", matches };
    } else if (matches.length === 1) {
      return { score: 60, rating: "Good Match", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", matches };
    } else {
      return { score: 20, rating: "Alternative Pool", badgeColor: "bg-slate-50 text-slate-500 border-slate-200", matches };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening placement dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E7E2D8] pb-6">
        <div>
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline flex items-center gap-1">
              &larr; Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <HiOutlineBriefcase className="w-6 h-6" />
            </div>
            <span>Placements Matchmaking Desk</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track candidates matched to partner institutions, manage talent pipeline, and oversee interview outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/partner-interests"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs tracking-wider uppercase px-4 py-3 rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
          >
            <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
            <span>Partner Requests</span>
          </Link>
          <button
            onClick={() => setPartnerModalOpen(true)}
            className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-5 py-3 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4 text-sky-300" />
            <span>Register Partner Org</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <button
          onClick={() => { setActiveFilterTab("all"); setSelectedPartnerFilter("all"); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilterTab === "all"
              ? "bg-white border-[#000666] shadow-sm ring-2 ring-[#000666]/10"
              : "bg-white/70 border-[#E7E2D8] hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Eligible Pool</span>
            <HiOutlineUserGroup className="w-4 h-4 text-[#000666]" />
          </div>
          <div className="text-2xl font-black text-[#000666]">{counts.total}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Placement-ready interns</p>
        </button>

        <button
          onClick={() => { setActiveFilterTab("matched"); setSelectedPartnerFilter("all"); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilterTab === "matched"
              ? "bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/10"
              : "bg-white/70 border-[#E7E2D8] hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Matched</span>
            <HiOutlineBriefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{counts.matched}</div>
          <p className="text-[10px] text-indigo-500 mt-0.5">Assigned to a company</p>
        </button>

        <button
          onClick={() => { setActiveFilterTab("interviewing"); setSelectedPartnerFilter("all"); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilterTab === "interviewing"
              ? "bg-white border-amber-500 shadow-sm ring-2 ring-amber-500/10"
              : "bg-white/70 border-[#E7E2D8] hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Interviewing</span>
            <HiOutlineClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{counts.interviewing}</div>
          <p className="text-[10px] text-amber-500 mt-0.5">Interview scheduled</p>
        </button>

        <button
          onClick={() => { setActiveFilterTab("placed"); setSelectedPartnerFilter("all"); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeFilterTab === "placed"
              ? "bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/10"
              : "bg-white/70 border-[#E7E2D8] hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed</span>
            <HiOutlineCheckBadge className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{counts.placed}</div>
          <p className="text-[10px] text-emerald-600 mt-0.5">Placement Confirmed</p>
        </button>

        <button
          onClick={() => { setActiveFilterTab("unmatched"); setSelectedPartnerFilter("all"); }}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
            activeFilterTab === "unmatched"
              ? "bg-white border-slate-600 shadow-sm ring-2 ring-slate-500/10"
              : "bg-white/70 border-[#E7E2D8] hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Talent Pool</span>
            <span className="text-xs font-mono font-bold text-slate-400">{counts.totalPartnerSlots} slots open</span>
          </div>
          <div className="text-2xl font-black text-slate-700">{counts.unmatched}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting partner match</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main Content Area (Col-span 3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl shadow-xs overflow-hidden">
            {/* Filter Tabs Navigation */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setActiveFilterTab("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                    activeFilterTab === "all"
                      ? "bg-[#000666] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>All Candidates</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeFilterTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {counts.total}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterTab("matched")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                    activeFilterTab === "matched"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-indigo-700 hover:bg-indigo-50"
                  }`}
                >
                  <span>Matched to Company</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeFilterTab === "matched" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    {counts.matched}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterTab("unmatched")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                    activeFilterTab === "unmatched"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>Talent Pool (Unmatched)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeFilterTab === "unmatched" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {counts.unmatched}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilterTab("placed")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                    activeFilterTab === "placed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <span>Placement Confirmed</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeFilterTab === "placed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {counts.placed}
                  </span>
                </button>
              </div>

              {/* Counter label */}
              <div className="text-xs font-bold text-slate-400 shrink-0">
                Showing {filteredApplications.length} of {applications.length}
              </div>
            </div>

            {/* Search & Partner Quick Filter Bar */}
            <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <HiOutlineMagnifyingGlass className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search candidate name, email, or company..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 focus:outline-none focus:border-[#000666]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <HiOutlineXMark className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 shrink-0 font-medium">
                  <HiOutlineFunnel className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Partner:</span>
                </div>
                <select
                  value={selectedPartnerFilter}
                  onChange={(e) => setSelectedPartnerFilter(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#000666] cursor-pointer"
                >
                  <option value="all">All Partner Organizations</option>
                  {partners.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>

                {(selectedPartnerFilter !== "all" || searchQuery || activeFilterTab !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedPartnerFilter("all");
                      setSearchQuery("");
                      setActiveFilterTab("all");
                    }}
                    className="text-[11px] text-rose-600 font-bold hover:underline px-2 py-1 shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Assigned Company</th>
                    <th className="px-6 py-3.5">Interview / Stage</th>
                    <th className="px-6 py-3.5">Match Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="font-semibold text-slate-600">No candidates match the selected filters.</p>
                          <p className="text-[11px] text-slate-400">Try changing the tab filter, search term, or selected partner.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => {
                      const match = getUserPlacement(app.userId?._id || app.userId);
                      return (
                        <tr key={app._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-[#000666]/10 text-[#000666] font-bold text-xs flex items-center justify-center shrink-0">
                                {app.fullName?.charAt(0) || "C"}
                              </div>
                              <div>
                                <div className="font-bold text-[#000666] text-xs sm:text-sm">{app.fullName}</div>
                                <div className="text-slate-400 text-[11px] mt-0.5">{app.userId?.email || app.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {match ? (
                              <div>
                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  <HiOutlineBuildingOffice className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{match.partnerOrgId?.name || "Partner Org"}</span>
                                </div>
                                {match.role && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                    <span>{match.role}</span>
                                    {match.workType && (
                                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                        {match.workType}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Unmatched pool</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {match?.interviewScheduledAt ? (
                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-700 flex items-center space-x-1">
                                  <HiOutlineCalendarDays className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="text-[11px]">
                                    {new Date(match.interviewScheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  {match.interviewFormat || "Video"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">&mdash;</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {match ? (
                              <select
                                value={match.status}
                                onChange={(e) => handleUpdateStatus(match._id, e.target.value)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none bg-white cursor-pointer ${
                                  match.status === "placed"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : match.status === "interviewing"
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : match.status === "declined"
                                        ? "bg-rose-50 border-rose-200 text-rose-700"
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                }`}
                              >
                                <option value="matched">Matched</option>
                                <option value="interviewing">Interviewing</option>
                                <option value="placed">Placement Confirmed</option>
                                <option value="declined">Declined</option>
                              </select>
                            ) : (
                              <span className="bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
                                In Talent Pool
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setMatchModalOpen(true);
                              }}
                              className="inline-flex items-center space-x-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <span>{match ? "Rematch" : "Match"}</span>
                              <HiOutlineChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {filteredApplications.length === 0 ? (
                <p className="px-6 py-12 text-center text-slate-400 text-xs italic">
                  No candidates match your current filter.
                </p>
              ) : (
                filteredApplications.map((app) => {
                  const match = getUserPlacement(app.userId?._id || app.userId);
                  return (
                    <div key={app._id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[#000666] text-sm">{app.fullName}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{app.userId?.email || app.email}</div>
                        </div>
                        <div>
                          {match ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              match.status === "placed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : match.status === "interviewing"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}>
                              {match.status === "placed" ? "Confirmed" : match.status === "interviewing" ? "Interviewing" : "Matched"}
                            </span>
                          ) : (
                            <span className="bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Talent Pool
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Assigned Company:</span>
                          <span className="font-bold text-slate-700 truncate max-w-[160px]">
                            {match ? (match.partnerOrgId?.name || "Partner Org") : "None"}
                          </span>
                        </div>
                        {match && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                            <span className="text-slate-400 font-medium">Match Status:</span>
                            <select
                              value={match.status}
                              onChange={(e) => handleUpdateStatus(match._id, e.target.value)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border focus:outline-none bg-white cursor-pointer"
                            >
                              <option value="matched">Matched</option>
                              <option value="interviewing">Interviewing</option>
                              <option value="placed">Placement Confirmed</option>
                              <option value="declined">Declined</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setMatchModalOpen(true);
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>{match ? "Rematch" : "Match"}</span>
                          <HiOutlineChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Partners Capacities Sidebar (Col-span 1) */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="font-bold text-[#000666] text-sm flex items-center gap-1.5">
                <HiOutlineBuildingOffice className="w-4 h-4 text-sky-600" />
                <span>Partner Capacities</span>
              </h2>
              <span className="text-[10px] font-bold font-mono bg-sky-50 text-sky-700 px-2 py-0.5 rounded">
                {partners.length} Orgs
              </span>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {partners.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4">No partners registered yet.</p>
              ) : (
                partners.map((partner) => {
                  const partnerMatches = placements.filter(p => {
                    const pOrgId = p.partnerOrgId?._id ? p.partnerOrgId._id.toString() : p.partnerOrgId?.toString();
                    return pOrgId === partner._id.toString();
                  });
                  const isSelected = selectedPartnerFilter === partner._id;

                  return (
                    <div
                      key={partner._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPartnerFilter("all");
                        } else {
                          setSelectedPartnerFilter(partner._id);
                          setActiveFilterTab("matched");
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-500/20 shadow-2xs"
                          : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-slate-800 text-xs line-clamp-1">
                          {partner.name}
                        </div>
                        <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded shrink-0 ${
                          partner.activeSlots > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {partner.activeSlots} slots
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {partner.sectorTags?.join(", ") || "General Finance"}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-2 border-t border-slate-200/60">
                        <span>Matched: <strong className="text-slate-700">{partnerMatches.length}</strong></span>
                        <span className="text-sky-600 font-bold hover:underline">
                          {isSelected ? "Clear filter" : "Filter matched &rarr;"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Matchmaking Modal Overlay */}
      {matchModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <HiOutlineSparkles className="w-5 h-5 text-[#FF9800]" /> Match Candidate
              </h3>
              <button 
                onClick={() => {
                  setMatchModalOpen(false);
                  setSelectedApp(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Matching Student</span>
                <span className="font-bold text-[#000666] text-sm">{selectedApp.fullName}</span>
                <span className="text-slate-400 text-xs block">{selectedApp.userId?.email || selectedApp.email}</span>
              </div>

              {/* Recommendations list */}
              {(() => {
                const partnerScores = partners
                  .map((p) => ({ partner: p, result: calculateMatchScore(selectedApp, p) }))
                  .filter((item) => item.partner.activeSlots > 0)
                  .sort((a, b) => b.result.score - a.result.score);
                
                const topPicks = partnerScores.slice(0, 3);
                if (topPicks.length === 0) return null;
                
                return (
                  <div className="bg-sky-50/30 border border-sky-100 rounded-xl p-4 space-y-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-sky-700 flex items-center gap-1.5 mb-1.5">
                      <HiOutlineSparkles className="w-3.5 h-3.5 text-[#FF9800]" /> Recommended Employers
                    </span>
                    <div className="space-y-2 text-xs">
                      {topPicks.map(({ partner, result }) => (
                        <div key={partner._id} className="flex items-center justify-between border-b border-sky-100/30 pb-1.5 last:border-b-0 last:pb-0">
                          <div>
                            <span className="font-bold text-[#000666]">{partner.name}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {result.matches.length > 0 
                                ? `Matches: ${result.matches.join(", ")}` 
                                : "General compatibility placement"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-white shadow-2xs font-mono">
                              Slots: {partner.activeSlots}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${result.badgeColor}`}>
                              {result.rating}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Select Partner Organization
                </label>
                <select
                  value={matchPartnerId}
                  onChange={(e) => setMatchPartnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs cursor-pointer"
                  required
                >
                  <option value="">Choose employer...</option>
                  {partners
                    .map((p) => ({ partner: p, result: calculateMatchScore(selectedApp, p) }))
                    .sort((a, b) => b.result.score - a.result.score)
                    .map(({ partner, result }) => (
                      <option key={partner._id} value={partner._id} disabled={partner.activeSlots <= 0}>
                        {result.score >= 60 ? "⭐ " : ""}{partner.name} ({partner.activeSlots} slots) &mdash; {result.rating}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Placement Focus Area / Role
                </label>
                <input 
                  type="text" 
                  value={matchArea}
                  onChange={(e) => setMatchArea(e.target.value)}
                  placeholder="e.g. Islamic Banking Analyst, Shariah Audit"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Onboarding Notes / Instructions
                </label>
                <textarea 
                  value={matchNotes}
                  onChange={(e) => setMatchNotes(e.target.value)}
                  placeholder="Insert schedule info or instructions..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs h-20 bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMatchModalOpen(false);
                    setSelectedApp(null);
                  }}
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMatch}
                  className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {submittingMatch ? "Matching..." : "Confirm Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Modal Overlay */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] sm:max-h-none flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-[#000666] text-lg">
                Register Partner Organization
              </h2>
              <button onClick={() => setPartnerModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePartner} className="p-6 flex flex-col gap-4 font-sans text-sm max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Organization Name *</label>
                <input type="text" required value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-xs" placeholder="e.g. Organization Name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Description</label>
                <textarea value={newPartnerDesc} onChange={(e) => setNewPartnerDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 min-h-[72px] text-xs"
                  placeholder="Briefly describe the partner organization..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Website URL</label>
                <input type="url" value={newPartnerWebsite} onChange={(e) => setNewPartnerWebsite(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-xs"
                  placeholder="e.g. https://yourorganization.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Placement Slots *</label>
                  <input type="number" required min={0} value={newPartnerSlots} onChange={(e) => setNewPartnerSlots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Sector Tags <span className="font-normal text-slate-400">(csv)</span></label>
                  <input type="text" value={newPartnerTags} onChange={(e) => setNewPartnerTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-xs"
                    placeholder="e.g. Finance, Advisory" />
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <HiOutlineAcademicCap className="w-4 h-4 text-[#000666]" /> Assign to Cohort(s)
                </label>
                {cohorts.length === 0 ? (
                  <p className="text-xs text-slate-400">No cohorts available. Create a cohort first in the admin panel.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cohorts.map((cohort) => (
                      <label key={cohort._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-all">
                        <input type="checkbox" checked={newPartnerCohorts.includes(cohort._id)} onChange={() => toggleCohort(cohort._id)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                        <span className="flex-1 text-sm font-medium text-slate-700">{cohort.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${COHORT_STATUS_COLORS[cohort.status] || "bg-slate-100 text-slate-500"}`}>
                          {cohort.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
                <label className="font-bold text-slate-700">Organization Logo</label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium">Upload Logo File (Recommended):</span>
                    <input type="file" accept="image/*" onChange={(e) => setNewPartnerLogoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium">Or enter image URL manually:</span>
                    <input type="text" value={newPartnerLogoUrl} onChange={(e) => setNewPartnerLogoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="e.g. https://res.cloudinary.com/..." disabled={!!newPartnerLogoFile} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setPartnerModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={creatingPartner}
                  className="px-5 py-2.5 bg-[#000666] hover:bg-[#000666]/90 text-white font-bold rounded-xl shadow-sm disabled:bg-slate-300 flex items-center gap-2 cursor-pointer">
                  {creatingPartner && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
