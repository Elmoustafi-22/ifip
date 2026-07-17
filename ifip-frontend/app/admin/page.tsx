"use client";

import { useEffect, useState } from "react";
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
  uploadBrochure,
  AdminStats, 
  Cohort 
} from "@/lib/api/services";

export default function AdminDashboardPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cohorts"); // cohorts, system, acquisition

  const getCohortScopeName = () => {
    if (selectedCohortId === "") return "Global Scope (All Cohorts)";
    if (selectedCohortId === "unassigned") return "Awaiting Cohort Assignment";
    const matched = cohorts.find(c => c._id === selectedCohortId);
    return matched ? matched.name : "Selected Cohort";
  };
  const getTopChannel = () => {
    if (!stats?.leadSources || stats.leadSources.length === 0) return { source: "None", count: 0 };
    return [...stats.leadSources].sort((a, b) => b.count - a.count)[0];
  };

  const topChannel = getTopChannel();

  // Active Cohort Config Form state
  const [configDate, setConfigDate] = useState("");
  const [configCap, setConfigCap] = useState(100);
  const [configOverride, setConfigOverride] = useState("default");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
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
      setBrochureUrl(configData.brochureUrl || "");
    } catch (err) {
      console.error("Failed to load dashboard parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboard();
  }, [selectedCohortId]);

  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file only.");
      return;
    }
    setUploadingBrochure(true);
    try {
      const data = await uploadBrochure(file);
      if (data.brochureUrl) {
        setBrochureUrl(data.brochureUrl);
        alert("Curriculum brochure uploaded and updated successfully!");
      }
    } catch (err: any) {
      console.error("Brochure upload failed:", err);
      alert("Failed to upload brochure. Please verify permissions and file size.");
    } finally {
      setUploadingBrochure(false);
    }
  };

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
      alert("System configuration saved successfully!");
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
    <div className="max-w-5xl mx-auto py-8 px-5 sm:px-8 font-sans">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
          <HiOutlineCog6Tooth className="w-7 h-7 text-[#FF9800]" /> Overview
        </h1>
        <p className="text-slate-500 text-sm">
          Reviewing: <strong className="text-[#000666]">{getCohortScopeName()}</strong> &bull; Configure kickoff milestones, stats, and gating bounds.
        </p>
      </div>

      {/* KPI Stats widgets */}
      {stats && (
        <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory gap-4 pb-4 md:pb-0 scrollbar-hide mb-8">
          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Paid</span>
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-[#00B0FF]" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.totalPaid}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Learning</span>
              <HiOutlineUsers className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.activeParticipants}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.completedCount}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Waitlisted Users</span>
              <HiOutlineInboxStack className="w-5 h-5 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.waitlistCount}</div>
          </div>
        </div>
      )}

      {/* Mobile view tab buttons */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab("cohorts")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "cohorts" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Cohorts
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "system" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          System Config
        </button>
        <button
          onClick={() => setActiveTab("acquisition")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "acquisition" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Acquisition
        </button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Sidebar Configurations (Col-span 1 on Desktop, controlled by activeTab on mobile) */}
        <div className={`${activeTab === "system" ? "block" : "hidden"} lg:block`}>
          {/* Global System Settings Panel */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
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
                  Platform View Override Mode
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

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Curriculum Brochure PDF
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleBrochureUpload}
                    disabled={uploadingBrochure}
                    className="text-xs w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
                {uploadingBrochure && (
                  <span className="text-[10px] text-primary font-semibold mt-1 block">Uploading PDF to Cloudinary...</span>
                )}
                {brochureUrl && !uploadingBrochure && (
                  <a
                    href={brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline mt-1 block font-bold"
                  >
                    View Current Brochure PDF →
                  </a>
                )}
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
        </div>

        {/* 2. Acquisition Desk (Col-span 1 on Desktop, controlled by activeTab on mobile) */}
        <div className={`${activeTab === "acquisition" ? "block" : "hidden"} lg:block lg:col-span-1 space-y-6`}>
          {/* Visual KPI Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Finalized</span>
              <div className="mt-2">
                <span className="text-xl font-display font-black text-[#000666]">{stats?.totalPaid || 0}</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Paid Applicants</span>
              </div>
            </div>

            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Waitlist Volume</span>
              <div className="mt-2">
                <span className="text-xl font-display font-black text-amber-600">{stats?.waitlistCount || 0}</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Inquiries</span>
              </div>
            </div>

            <div className="col-span-2 bg-white border border-[#E7E2D8] rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Top Source</span>
                <span className="text-sm font-bold text-[#000666] block mt-1">{topChannel.source}</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1 text-center shrink-0">
                <span className="text-xs font-mono font-bold text-indigo-700">{topChannel.count} leads</span>
              </div>
            </div>
          </div>

          {/* Lead Acquisition Channels Panel */}
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#000666] mb-4 pb-2 border-b border-slate-100">
              Registration Channel Ratios
            </h2>
            <div className="space-y-4">
              {!stats?.leadSources || stats.leadSources.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-4">No registration channels captured.</p>
              ) : (
                stats.leadSources.map((ls, idx) => {
                  const percentage = stats.totalPaid > 0 ? Math.round((ls.count / stats.totalPaid) * 100) : 0;
                  const colors = [
                    "bg-[#00B0FF]", 
                    "bg-indigo-500", 
                    "bg-emerald-500", 
                    "bg-amber-500", 
                    "bg-purple-500", 
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-bold text-slate-700 mb-1.5 items-center">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${barColor}`}></span>
                          {ls.source}
                        </span>
                        <span className="font-mono text-slate-500">{ls.count} leads ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`${barColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. Cohort/Intake Intake Manager Table (Col-span 2 on Desktop, controlled by activeTab on mobile) */}
        <div className={`${activeTab === "cohorts" ? "block" : "hidden"} lg:block bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between`}>
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

            {/* Desktop Cohort Table */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Cohorts Card List */}
            <div className="block md:hidden divide-y divide-slate-100">
              {cohorts.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-6">
                  No intake cohorts registered.
                </p>
              ) : (
                cohorts.map((cohort) => (
                  <div key={cohort._id} className="py-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-[#000666] text-sm">{cohort.name}</span>
                      <span className={`inline-block font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        cohort.status === "active"
                          ? "bg-indigo-50 text-indigo-700"
                          : cohort.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {cohort.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-500 text-xs mt-1">
                      <div>
                        <span className="text-slate-400 font-medium">Registration:</span>{" "}
                        {formatDate(cohort.registrationStartDate)} &mdash; {formatDate(cohort.registrationEndDate)}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Training:</span>{" "}
                        {formatDate(cohort.startDate)} &mdash; {formatDate(cohort.endDate)}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Capacity:</span>{" "}
                        <strong className="text-slate-700 font-mono">{cohort.cohortCap || 100} slots</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-end">
                      <button
                        onClick={() => openEditModal(cohort)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-[#000666] transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 text-xs font-bold"
                      >
                        <HiOutlinePencilSquare className="w-4 h-4" /> Edit details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
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

            <form onSubmit={handleSubmitCohort} className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
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
