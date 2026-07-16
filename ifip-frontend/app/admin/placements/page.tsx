"use client";

import { useEffect, useState, useContext } from "react";
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
  HiOutlineAcademicCap
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

export default function AdminPlacementsPage() {
  const { selectedCohortId } = useContext(AdminCohortContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [activeTab, setActiveTab] = useState("candidates"); // candidates, partners

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
      
      // Filter applications that are eligible for placements (status completed or active)
      // For this workflow, let's allow matching any active or completed student!
      const eligibleApps = appsData.filter(app => app.status === 'completed' || app.status === 'active');
      setApplications(eligibleApps);
      
      setPartners(partnersData);
      setPlacements(placementsData);
      setCohorts(cohortsData);
    } catch (err) {
      console.error("Failed to load placement cockpit:", err);
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

  // Find existing placement match for a user
  const getUserPlacement = (userId: string) => {
    return placements.find(p => (p.userId?._id || p.userId) === userId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening placement cockpit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
              &larr; Back to Ops Cockpit
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineBriefcase className="w-8 h-8 text-sky-500" /> Placements Matchmaking Desk
          </h1>
          <p className="text-slate-500 text-sm">Match qualified cohort graduates with active institutional partner internship slots.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPartnerModalOpen(true)}
            className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Register Partner Organization
          </button>
        </div>
      </div>

      {/* Mobile view tab buttons */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab("candidates")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "candidates" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Candidates ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("partners")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "partners" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Partners ({partners.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Placements Matching Queue (Col-span 2) */}
        <div className={`${activeTab === "candidates" ? "block" : "hidden"} lg:block lg:col-span-2 space-y-6`}>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-[#000666] text-base">Eligible Candidates</h2>
              <span className="text-xs text-slate-400 font-bold">{applications.length} Candidates Eligible</span>
            </div>

            {/* Desktop Candidates Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Assigned Partner</th>
                    <th className="px-6 py-3.5">Match Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                        No active or completed candidates found in this cohort scope.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => {
                      const match = getUserPlacement(app.userId?._id || app.userId);
                      return (
                        <tr key={app._id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#000666]">{app.fullName}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{app.userId?.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {match ? (
                              <div className="font-bold text-slate-700">
                                {match.partnerOrgId?.name || "Partner Org"}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Unmatched pool</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {match ? (
                              <select
                                value={match.status}
                                onChange={(e) => handleUpdateStatus(match._id, e.target.value)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border focus:outline-none bg-white cursor-pointer ${
                                  match.status === "placed"
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                    : match.status === "interviewing"
                                      ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                                      : match.status === "declined"
                                        ? "bg-rose-50 border-rose-100 text-rose-700"
                                        : "bg-amber-50 border-amber-100 text-amber-700"
                                }`}
                              >
                                <option value="matched">Matched</option>
                                <option value="interviewing">Interviewing</option>
                                <option value="placed">Placed</option>
                                <option value="declined">Declined</option>
                              </select>
                            ) : (
                              <span className="bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded">
                                Talent Pool
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setMatchModalOpen(true);
                              }}
                              className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              {match ? "Rematch &rarr;" : "Match &rarr;"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Candidates Cards List */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {applications.length === 0 ? (
                <p className="px-6 py-12 text-center text-slate-400 text-xs italic">
                  No active or completed candidates found.
                </p>
              ) : (
                applications.map((app) => {
                  const match = getUserPlacement(app.userId?._id || app.userId);
                  return (
                    <div key={app._id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[#000666] text-sm">{app.fullName}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{app.userId?.email}</div>
                        </div>
                        <div>
                          {match ? (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded">
                              Matched
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
                          <span className="text-slate-400 font-medium">Assigned Partner:</span>
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">
                            {match ? (match.partnerOrgId?.name || "Partner Org") : "None"}
                          </span>
                        </div>
                        {match && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Match Status:</span>
                            <select
                              value={match.status}
                              onChange={(e) => handleUpdateStatus(match._id, e.target.value)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border focus:outline-none bg-white cursor-pointer"
                            >
                              <option value="matched">Matched</option>
                              <option value="interviewing">Interviewing</option>
                              <option value="placed">Placed</option>
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
                          className="text-xs font-bold text-sky-600 hover:underline flex items-center"
                        >
                          {match ? "Rematch &rarr;" : "Match &rarr;"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Partners Sidebar slots tracker (Col-span 1) */}
        <div className={`${activeTab === "partners" ? "block" : "hidden"} lg:block space-y-6`}>
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#000666] text-base mb-4 pb-2 border-b border-slate-100">
              Partner Capacities
            </h2>
            <div className="space-y-4">
              {partners.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4">No partners registered yet.</p>
              ) : (
                partners.map((partner) => (
                  <div key={partner._id} className="flex justify-between items-start gap-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <HiOutlineBuildingOffice className="w-4 h-4 text-slate-400 shrink-0" />
                        {partner.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{partner.sectorTags?.join(", ")}</div>
                    </div>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                      partner.activeSlots > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      {partner.activeSlots} slots
                    </span>
                  </div>
                ))
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
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Matching Student</span>
                <span className="font-bold text-[#000666] text-sm">{selectedApp.fullName}</span>
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white text-xs"
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
                  Placement Focus Area
                </label>
                <input 
                  type="text" 
                  value={matchArea}
                  onChange={(e) => setMatchArea(e.target.value)}
                  placeholder="e.g. Shariah Audit, Sukuk Structuring"
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
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMatch}
                  className="bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-[#000666] text-lg">
                Register Partner Organization
              </h2>
              <button onClick={() => setPartnerModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePartner} className="p-6 flex flex-col gap-4 font-sans text-sm max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Organization Name *</label>
                <input type="text" required value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600" placeholder="e.g. Organization Name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Description</label>
                <textarea value={newPartnerDesc} onChange={(e) => setNewPartnerDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600 min-h-[72px]"
                  placeholder="Briefly describe the partner organization..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Website URL</label>
                <input type="url" value={newPartnerWebsite} onChange={(e) => setNewPartnerWebsite(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
                  placeholder="e.g. https://yourorganization.com" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Placement Slots *</label>
                  <input type="number" required min={0} value={newPartnerSlots} onChange={(e) => setNewPartnerSlots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Sector Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
                  <input type="text" value={newPartnerTags} onChange={(e) => setNewPartnerTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
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
                      className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="e.g. https://res.cloudinary.com/..." disabled={!!newPartnerLogoFile} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setPartnerModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E7E2D8] rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={creatingPartner}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:bg-slate-300 flex items-center gap-2 cursor-pointer">
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
