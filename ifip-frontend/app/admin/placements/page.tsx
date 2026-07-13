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
  HiOutlineChevronRight
} from "react-icons/hi2";
import { 
  getAdminStats, 
  getAdminApplications, 
  getPartners, 
  getAdminPlacements, 
  createPlacementMatch, 
  updatePlacementStatus, 
  createPartner,
  AdminStats, 
  Cohort, 
  PartnerOrganization, 
  Placement 
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

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
  const [creatingPartner, setCreatingPartner] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchPlacementsData = async () => {
    try {
      const [statsData, appsData, partnersData, placementsData] = await Promise.all([
        getAdminStats(selectedCohortId || undefined),
        getAdminApplications(undefined, undefined, selectedCohortId || undefined),
        getPartners(),
        getAdminPlacements()
      ]);
      setStats(statsData);
      
      // Filter applications that are eligible for placements (status completed or active)
      // For this workflow, let's allow matching any active or completed student!
      const eligibleApps = appsData.filter(app => app.status === 'completed' || app.status === 'active');
      setApplications(eligibleApps);
      
      setPartners(partnersData);
      setPlacements(placementsData);
    } catch (err) {
      console.error("Failed to load placement cockpit:", err);
    } finally {
      setLoading(false);
    }
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
    try {
      await createPartner({
        name: newPartnerName,
        description: newPartnerDesc || undefined,
        activeSlots: newPartnerSlots,
        sectorTags: newPartnerTags ? newPartnerTags.split(",").map(t => t.trim()) : []
      });
      alert("Partner Organization registered successfully!");
      setNewPartnerName("");
      setNewPartnerDesc("");
      setNewPartnerSlots(5);
      setNewPartnerTags("");
      setPartnerModalOpen(false);
      fetchPlacementsData();
    } catch (err) {
      console.error(err);
      alert("Failed to create partner.");
    } finally {
      setCreatingPartner(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Placements Matching Queue (Col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-[#000666] text-base">Eligible Candidates</h2>
              <span className="text-xs text-slate-400 font-bold">{applications.length} Candidates Eligible</span>
            </div>

            <div className="overflow-x-auto">
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
          </div>
        </div>

        {/* Partners Sidebar slots tracker (Col-span 1) */}
        <div className="space-y-6">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between">
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

            <form onSubmit={handleCreateMatch} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Matching Student</span>
                <span className="font-bold text-[#000666] text-sm">{selectedApp.fullName}</span>
              </div>

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
                  {partners.map((partner) => (
                    <option key={partner._id} value={partner._id} disabled={partner.activeSlots <= 0}>
                      {partner.name} ({partner.activeSlots} slots left)
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

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <HiOutlinePlus className="w-5 h-5" /> Register Partner Org
              </h3>
              <button 
                onClick={() => setPartnerModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Organization Title
                </label>
                <input 
                  type="text" 
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="e.g. Islamic Development Bank"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Description
                </label>
                <textarea 
                  value={newPartnerDesc}
                  onChange={(e) => setNewPartnerDesc(e.target.value)}
                  placeholder="Corporate description..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Available Slots
                  </label>
                  <input 
                    type="number"
                    value={newPartnerSlots}
                    onChange={(e) => setNewPartnerSlots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Sectors (comma separated)
                  </label>
                  <input 
                    type="text"
                    value={newPartnerTags}
                    onChange={(e) => setNewPartnerTags(e.target.value)}
                    placeholder="FinTech, Banking"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPartner}
                  className="bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  {creatingPartner ? "Creating..." : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
