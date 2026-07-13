"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineUsers, 
  HiOutlineCheckCircle, 
  HiOutlineInboxStack,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlinePencilSquare
} from "react-icons/hi2";
import { useContext } from "react";
import { AdminCohortContext } from "./layout";
import { 
  getAdminStats, 
  getCohortConfig, 
  createCohort, 
  updateCohort,
  updateCohortConfig, 
  AdminStats, 
  Cohort 
} from "@/lib/api/services";

export default function AdminDashboardPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const getCohortScopeName = () => {
    if (selectedCohortId === "") return "Global Scope (All Cohorts)";
    if (selectedCohortId === "unassigned") return "Awaiting Cohort Assignment";
    const matched = cohorts.find(c => c._id === selectedCohortId);
    return matched ? matched.name : "Selected Cohort";
  };
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Cohort Config Form state
  const [configDate, setConfigDate] = useState("");
  const [configCap, setConfigCap] = useState(100);
  const [configOverride, setConfigOverride] = useState("default");
  const [updatingConfig, setUpdatingConfig] = useState(false);

  // Cohort Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortStart, setNewCohortStart] = useState("");
  const [newCohortEnd, setNewCohortEnd] = useState("");
  const [newCohortRegStart, setNewCohortRegStart] = useState("");
  const [newCohortRegEnd, setNewCohortRegEnd] = useState("");
  const [newCohortCap, setNewCohortCap] = useState(100);
  const [newCohortStatus, setNewCohortStatus] = useState("upcoming");
  const [creatingCohort, setCreatingCohort] = useState(false);
  const [editingCohortItem, setEditingCohortItem] = useState<Cohort | null>(null);

  const fetchAdminDashboard = async () => {
    try {
      const [statsData, configData] = await Promise.all([
        getAdminStats(selectedCohortId || undefined),
        getCohortConfig()
      ]);
      setStats(statsData);
      
      // Load current config parameters
      if (configData.cohortStartDate) {
        setConfigDate(configData.cohortStartDate.split("T")[0]);
      }
      setConfigCap(configData.cohortCap || 100);
      setConfigOverride(configData.dashboardViewOverride || "default");
    } catch (err) {
      console.error("Failed to load dashboard parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboard();
  }, [selectedCohortId]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingConfig) return;
    setUpdatingConfig(true);
    try {
      await updateCohortConfig({
        startDate: configDate ? new Date(configDate).toISOString() : undefined,
        cohortCap: configCap,
        dashboardViewOverride: configOverride
      });
      alert("System portal configuration saved successfully!");
      fetchAdminDashboard();
    } catch (err) {
      console.error("Failed to save config overrides:", err);
      alert("Failed to save overrides.");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const openCreateModal = () => {
    setEditingCohortItem(null);
    setNewCohortName("");
    setNewCohortStart("");
    setNewCohortEnd("");
    setNewCohortRegStart("");
    setNewCohortRegEnd("");
    setNewCohortCap(100);
    setNewCohortStatus("upcoming");
    setModalOpen(true);
  };

  const openEditModal = (cohort: Cohort) => {
    setEditingCohortItem(cohort);
    setNewCohortName(cohort.name);
    setNewCohortStart(cohort.startDate ? cohort.startDate.split("T")[0] : "");
    setNewCohortEnd(cohort.endDate ? cohort.endDate.split("T")[0] : "");
    setNewCohortRegStart(cohort.registrationStartDate ? cohort.registrationStartDate.split("T")[0] : "");
    setNewCohortRegEnd(cohort.registrationEndDate ? cohort.registrationEndDate.split("T")[0] : "");
    setNewCohortCap(cohort.cohortCap || 100);
    setNewCohortStatus(cohort.status);
    setModalOpen(true);
  };

  const handleSubmitCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName || !newCohortStart || !newCohortEnd || !newCohortRegStart || !newCohortRegEnd || creatingCohort) return;
    
    setCreatingCohort(true);
    try {
      const payload = {
        name: newCohortName,
        startDate: new Date(newCohortStart).toISOString(),
        endDate: new Date(newCohortEnd).toISOString(),
        registrationStartDate: new Date(newCohortRegStart).toISOString(),
        registrationEndDate: new Date(newCohortRegEnd).toISOString(),
        cohortCap: Number(newCohortCap),
        status: newCohortStatus as any
      };

      if (editingCohortItem) {
        await updateCohort(editingCohortItem._id, payload);
        alert("Cohort details updated successfully!");
      } else {
        await createCohort(payload);
        alert("New program cohort created successfully!");
      }
      
      // Reset Modal Form
      setNewCohortName("");
      setNewCohortStart("");
      setNewCohortEnd("");
      setNewCohortRegStart("");
      setNewCohortRegEnd("");
      setNewCohortCap(100);
      setNewCohortStatus("upcoming");
      setEditingCohortItem(null);
      setModalOpen(false);
      
      fetchAdminDashboard();
    } catch (err) {
      console.error("Failed to save cohort:", err);
      alert("Failed to save cohort. Please check parameters.");
    } finally {
      setCreatingCohort(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening control cockpit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Top Header Block */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-8 h-8 text-[#FF9800]" /> Operational Control Cockpit
          </h1>
          <p className="text-slate-500 text-sm">
            Reviewing: <strong className="text-primary">{getCohortScopeName()}</strong> &bull; Configure kickoff milestones, stats, and gating bounds.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/admin/applications"
            className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Review Applications
          </Link>
          <Link 
            href="/admin/modules"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Modules Editor
          </Link>
          <Link 
            href="/admin/placements"
            className="bg-[#00B0FF] hover:bg-[#00B0FF]/90 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Matching Desk
          </Link>
          <Link 
            href="/admin/partners"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm transition-all"
          >
            Manage Partners
          </Link>
          <Link 
            href="/"
            className="border border-[#E7E2D8] bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs px-5 py-3.5 rounded-xl transition-all"
          >
            View Public Site
          </Link>
        </div>
      </div>

      {/* KPI Stats widgets */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Paid</span>
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-[#00B0FF]" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.totalPaid}</div>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Learning</span>
              <HiOutlineUsers className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.activeParticipants}</div>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.completedCount}</div>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Waitlisted Users</span>
              <HiOutlineInboxStack className="w-5 h-5 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.waitlistCount}</div>
          </div>
        </div>
      )}

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Sidebar Configurations and Acquisition Desk (Col-span 1) */}
        <div className="flex flex-col gap-6">
          {/* Global Portal Settings Panel */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-base font-bold text-[#000666] mb-4 pb-2 border-b border-slate-100">
              System Launch Configurations
            </h2>
            <form onSubmit={handleUpdateConfig} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Cohort Kickoff Date
                </label>
                <input 
                  type="date"
                  value={configDate}
                  onChange={(e) => setConfigDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Registration Capacity Limit
                </label>
                <input 
                  type="number"
                  value={configCap}
                  onChange={(e) => setConfigCap(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                  min={1}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Portal View Override Mode
                </label>
                <select
                  value={configOverride}
                  onChange={(e) => setConfigOverride(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none bg-white"
                  required
                >
                  <option value="default">Default (Automatic Date-based Lock)</option>
                  <option value="coming_soon">Force Coming Soon Pre-Launch</option>
                  <option value="unlocked">Force Unlocked Curriculum Dashboard</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updatingConfig}
                className="w-full bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl shadow-md transition-all mt-6"
              >
                {updatingConfig ? "Saving settings..." : "Save System Config"}
              </button>
            </form>
          </div>

          {/* Lead Acquisition Channels Panel */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-base font-bold text-[#000666] mb-4 pb-2 border-b border-slate-100">
              Lead Acquisition Channels
            </h2>
            <div className="space-y-3.5">
              {!stats?.leadSources || stats.leadSources.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4">No registration channels captured.</p>
              ) : (
                stats.leadSources.map((ls, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>{ls.source}</span>
                      <span className="font-mono">{ls.count} leads</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${stats.totalPaid > 0 ? (ls.count / stats.totalPaid) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2. Cohort/Intake Intake Manager Table (Col-span 2) */}
        <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#000666]">
                Intake Cohort Management
              </h2>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#00B0FF] hover:underline"
              >
                <HiOutlinePlus className="w-4 h-4" /> Add Intake Cohort
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Cohort Title</th>
                    <th className="px-4 py-3">Registration Window</th>
                    <th className="px-4 py-3">Training Window</th>
                    <th className="px-4 py-3">Cap</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        No intake cohorts registered.
                      </td>
                    </tr>
                  ) : (
                    cohorts.map((cohort) => (
                      <tr key={cohort._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-[#000666]">{cohort.name}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(cohort.registrationStartDate)} &mdash; {formatDate(cohort.registrationEndDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(cohort.startDate)} &mdash; {formatDate(cohort.endDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono font-bold">
                          {cohort.cohortCap || 100} slots
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                            cohort.status === "active"
                              ? "bg-indigo-50 text-indigo-700"
                              : cohort.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                          }`}>
                            {cohort.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEditModal(cohort)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 font-bold"
                          >
                            <HiOutlinePencilSquare className="w-4 h-4" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E2D8] w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <HiOutlineCalendarDays className="w-5 h-5" /> {editingCohortItem ? "Edit Intake Cohort" : "Add Intake Cohort"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCohort} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Cohort Name / Intake Code
                </label>
                <input 
                  type="text" 
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="e.g. Batch 2026 Fall-A26"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Registration Starts
                  </label>
                  <input 
                    type="date"
                    value={newCohortRegStart}
                    onChange={(e) => setNewCohortRegStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Registration Ends
                  </label>
                  <input 
                    type="date"
                    value={newCohortRegEnd}
                    onChange={(e) => setNewCohortRegEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Training Commences
                  </label>
                  <input 
                    type="date"
                    value={newCohortStart}
                    onChange={(e) => setNewCohortStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Training Concludes
                  </label>
                  <input 
                    type="date"
                    value={newCohortEnd}
                    onChange={(e) => setNewCohortEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Participant Capacity Cap
                  </label>
                  <input 
                    type="number"
                    value={newCohortCap}
                    onChange={(e) => setNewCohortCap(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                    Intake Status
                  </label>
                  <select
                    value={newCohortStatus}
                    onChange={(e) => setNewCohortStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white"
                    required
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCohort}
                  className="bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  {creatingCohort ? "Saving..." : (editingCohortItem ? "Save Changes" : "Save Cohort")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
