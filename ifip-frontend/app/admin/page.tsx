"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { 
  HiOutlineUsers, 
  HiOutlineCheckCircle, 
  HiOutlineInboxStack,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlinePencilSquare,
  HiOutlineChartBarSquare,
  HiOutlineArrowTrendingDown,
  HiOutlineFunnel,
  HiChevronRight,
  HiOutlineClock,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { useContext } from "react";
import { AdminCohortContext } from "./layout";
import LevyPricingForm from "@/components/admin/LevyPricingForm";
import ExportApplicantsModal from "@/components/admin/ExportApplicantsModal";
import { 
  getAdminStats, 
  getCohortConfig, 
  createCohort, 
  updateCohort, 
  updateCohortConfig, 
  uploadBrochure,
  getRegistrationApplicants,
  getTaskRewardSummary,
  getAdminWaitlist,
  getCohortWaitlistStatus,
  retryCohortWaitlist,
  AdminStats, 
  AnonApplicant,
  Cohort,
  TaskRewardSummaryRow
} from "@/lib/api/services";

export default function AdminDashboardPage() {
  const { selectedCohortId, setSelectedCohortId, cohorts, upsertCohort, adminRole } = useContext(AdminCohortContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rewardSummary, setRewardSummary] = useState<TaskRewardSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(0);
  const [activeTab, setActiveTab] = useState("cohorts"); // cohorts, system, acquisition, funnel
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Funnel drill-down state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<number | null>(null);
  const [drawerApplicants, setDrawerApplicants] = useState<AnonApplicant[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const getCohortScopeName = () => {
    if (selectedCohortId === "") return "All cohorts";
    if (selectedCohortId === "unassigned") return "Unassigned";
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
  const cohortDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modalOpen && !cohortDialog.current?.open) cohortDialog.current?.showModal();
  }, [modalOpen]);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortStart, setNewCohortStart] = useState("");
  const [newCohortEnd, setNewCohortEnd] = useState("");
  const [newCohortRegStart, setNewCohortRegStart] = useState("");
  const [newCohortRegEnd, setNewCohortRegEnd] = useState("");
  const [newCohortCap, setNewCohortCap] = useState(100);
  const [newCohortTotalWeeks, setNewCohortTotalWeeks] = useState(4);
  const [newCohortStatus, setNewCohortStatus] = useState("upcoming");
  const [creatingCohort, setCreatingCohort] = useState(false);
  const [editingCohortItem, setEditingCohortItem] = useState<Cohort | null>(null);
  const [notifyWaitlist, setNotifyWaitlist] = useState(true);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [cohortMessage, setCohortMessage] = useState("");
  const [savedCohortId, setSavedCohortId] = useState<string | null>(null);
  const [cohortError, setCohortError] = useState("");
  const [announcement, setAnnouncement] = useState<{ cohort: Cohort; counts: Awaited<ReturnType<typeof getCohortWaitlistStatus>> } | null>(null);

  const allMetrics = Object.values(stats?.cohortMetrics ?? {});
  const currentMetrics = selectedCohortId ? [stats?.cohortMetrics?.[selectedCohortId]] : allMetrics;
  const applications = currentMetrics.reduce((total, row) => total + (row?.applications ?? 0), 0);
  const hires = currentMetrics.reduce((total, row) => total + (row?.hires ?? 0), 0);

  async function showWaitlistDelivery(cohort: Cohort, retry = false) {
    setCohortMessage("");
    setSavedCohortId(null);
    try {
      if (retry) await retryCohortWaitlist(cohort._id);
      setAnnouncement({ cohort, counts: await getCohortWaitlistStatus(cohort._id) });
      if (retry) setCohortMessage("Failed sends queued for retry.");
    } catch (err) {
      setCohortMessage(isAxiosError(err) ? err.response?.data?.message || "Could not load delivery status." : "Could not load delivery status.");
    }
  }

  const fetchAdminDashboard = async () => {
    try {
      const [statsData, configData, rewardsData] = await Promise.all([
        getAdminStats(selectedCohortId || undefined),
        getCohortConfig(),
        getTaskRewardSummary()
      ]);
      setStats(statsData);
      setCheckedAt(Date.now());
      setRewardSummary(rewardsData.summary || []);
      
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

  const openFunnelDrawer = async (step: number) => {
    setDrawerStep(step);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await getRegistrationApplicants({ step, limit: 50 });
      setDrawerApplicants(res.applicants);
    } catch {
      setDrawerApplicants([]);
    } finally {
      setDrawerLoading(false);
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
    setCohortError("");
    setNotifyWaitlist(true);
    setRecipientCount(null);
    void getAdminWaitlist({ limit: 1 }).then(result => setRecipientCount(result.total)).catch(() => {});
    setEditingCohortItem(null);
    setNewCohortName("");
    setNewCohortStart("");
    setNewCohortEnd("");
    setNewCohortRegStart("");
    setNewCohortRegEnd("");
    setNewCohortCap(100);
    setNewCohortTotalWeeks(4);
    setNewCohortStatus("upcoming");
    setModalOpen(true);
  };

  const openEditModal = (cohort: Cohort) => {
    setCohortError("");
    setEditingCohortItem(cohort);
    setNewCohortName(cohort.name);
    setNewCohortStart(cohort.startDate ? cohort.startDate.split("T")[0] : "");
    setNewCohortEnd(cohort.endDate ? cohort.endDate.split("T")[0] : "");
    setNewCohortRegStart(cohort.registrationStartDate ? cohort.registrationStartDate.split("T")[0] : "");
    setNewCohortRegEnd(cohort.registrationEndDate ? cohort.registrationEndDate.split("T")[0] : "");
    setNewCohortCap(cohort.cohortCap || 100);
    setNewCohortTotalWeeks(cohort.totalWeeks || 4);
    setNewCohortStatus(cohort.status);
    setModalOpen(true);
  };

  const handleSubmitCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName || !newCohortRegStart || !newCohortRegEnd || creatingCohort) return;
    
    setCreatingCohort(true);
    setCohortError("");
    setSavedCohortId(null);
    try {
      const payload = {
        name: newCohortName,
        startDate: newCohortStart ? new Date(newCohortStart).toISOString() : null,
        endDate: newCohortEnd ? new Date(newCohortEnd).toISOString() : null,
        registrationStartDate: new Date(newCohortRegStart).toISOString(),
        registrationEndDate: new Date(newCohortRegEnd).toISOString(),
        cohortCap: Number(newCohortCap),
        totalWeeks: Number(newCohortTotalWeeks),
        status: newCohortStatus,
      };

      if (editingCohortItem) {
        const res = await updateCohort(editingCohortItem._id, payload);
        if (res?.cohort) upsertCohort(res.cohort);
        setCohortMessage(`${newCohortName.trim()} updated.`);
      } else {
        const res = await createCohort({ ...payload, notifyWaitlist: newCohortStatus === "upcoming" && notifyWaitlist });
        if (res?.cohort) {
          upsertCohort(res.cohort);
          setSavedCohortId(res.cohort._id);
        }
        setCohortMessage(`${newCohortName.trim()} created.${res?.cohort?.notifyWaitlist ? " Waitlist email queued for registration opening." : ""}`);
      }
      
      // Reset Modal Form
      setNewCohortName("");
      setNewCohortStart("");
      setNewCohortEnd("");
      setNewCohortRegStart("");
      setNewCohortRegEnd("");
      setNewCohortCap(100);
      setNewCohortTotalWeeks(4);
      setNewCohortStatus("upcoming");
      setEditingCohortItem(null);
      setModalOpen(false);
      
      fetchAdminDashboard();
    } catch (err) {
      console.error("Failed to save cohort:", err);
      setCohortError(isAxiosError(err) ? err.response?.data?.message || "Could not save the cohort." : "Could not save the cohort.");
    } finally {
      setCreatingCohort(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    } catch {
      return "N/A";
    }
  };

  const formatTrainingWindow = ({ startDate, endDate }: Cohort) => {
    if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    if (startDate) return `Starts ${formatDate(startDate)}`;
    if (endDate) return `Start to be announced · Ends ${formatDate(endDate)}`;
    return "To be announced";
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center  font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-5 sm:px-8 font-sans">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-7 h-7 text-[#FF9800]" /> Overview
          </h1>
          <p className="text-slate-500 text-sm">
            Viewing <strong className="text-[#000666]">{getCohortScopeName()}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-[#000666] px-4 py-2.5 text-sm font-semibold text-white">
          <HiOutlinePlus aria-hidden="true" className="h-4 w-4" /> New cohort
        </button>
        <button
          onClick={() => setExportModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#000666]"
          title="Configure filters and download applicants insights in CSV format (Paid or Unpaid)"
        >
          <HiOutlineArrowDownTray className="w-4 h-4" />
          <span>Export Insights CSV</span>
        </button>
        </div>
      </div>
      {cohortMessage && <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white p-3 text-sm text-slate-700">
        <p role="status">{cohortMessage}</p>
        {savedCohortId && <button type="button" className="font-semibold text-[#000666] underline" onClick={() => {
          setSelectedCohortId(savedCohortId);
          setActiveTab("cohorts");
          document.getElementById("cohort-overview")?.scrollIntoView({ block: "start" });
        }}>View cohort</button>}
      </div>}
      {announcement && <section aria-label="Waitlist delivery" className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-bold">{announcement.cohort.name} waitlist delivery</h2>
        <p>{announcement.counts.pending} pending · {announcement.counts.sending} sending · {announcement.counts.sent} sent · {announcement.counts.failed} failed</p>
        <div className="flex flex-wrap gap-4 text-[#000666]">
          <button type="button" className="underline" onClick={() => showWaitlistDelivery(announcement.cohort)}>Refresh status</button>
          {announcement.counts.failed > 0 && <button type="button" className="underline" onClick={() => showWaitlistDelivery(announcement.cohort, true)}>Retry failed sends</button>}
          <button type="button" className="underline" onClick={() => setAnnouncement(null)}>Dismiss</button>
        </div>
      </section>}

      {/* KPI Stats widgets */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold text-slate-600">Applications started</p>
            <p className="text-2xl font-black text-[#000666]">{applications}</p>
          </div>
          <Link href="/admin/placements" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold text-slate-600">Participants hired</p>
            <p className="text-2xl font-black text-[#000666]">{hires}</p>
          </Link>
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Paid</span>
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-[#00B0FF]" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.totalPaid}</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Learning</span>
              <HiOutlineUsers className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.activeParticipants}</div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.completedCount}</div>
          </div>

          <Link
            href="/admin/waitlist"
            className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors">Program-wide waitlist</span>
              <HiOutlineInboxStack className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.waitlistCount}</div>
          </Link>
        </div>
      )}

      <div className="mb-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#000666]">Programme Task Rewards & Pass-through</h2>
            <p className="text-xs text-slate-500 mt-1">Approved task points accumulate per participant so you can track who is eligible to advance.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-right min-w-[160px]">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold">Qualified</div>
            <div className="text-xl font-black">{rewardSummary.filter((row) => row.status === "qualified").length}</div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Participant</th>
                <th className="px-3 py-2 font-semibold">Passed tasks</th>
                <th className="px-3 py-2 font-semibold">Points</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rewardSummary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-xs italic">
                    No approved task rewards have been recorded yet.
                  </td>
                </tr>
              ) : (
                rewardSummary.map((row, index) => (
                  <tr key={`${row.userId}-${index}`} className="hover:bg-slate-50/60">
                    <td className="px-3 py-3">
                      <div className="font-bold text-[#000666]">{row.fullName}</div>
                      <div className="text-[11px] text-slate-500">{row.email || "No email on record"}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{row.passedModules}</td>
                    <td className="px-3 py-3 font-mono font-bold text-slate-700">{row.totalAwardedPoints}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === "qualified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === "qualified" ? "bg-emerald-500" : "bg-amber-400"}`} />
                        {row.status === "qualified" ? "Qualified" : "In progress"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view tab buttons */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl mb-6 gap-1">
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
          System
        </button>
        <button
          onClick={() => setActiveTab("acquisition")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "acquisition" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Acquisition
        </button>
        <button
          onClick={() => setActiveTab("funnel")}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "funnel" ? "bg-white text-[#000666] shadow-xs" : "text-slate-500"
          }`}
        >
          Funnel
        </button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Sidebar Configurations */}
        <div className={`${activeTab === "system" ? "block" : "hidden"} lg:block`}>
          {/* Global System Settings Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
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
          {adminRole === "superadmin" && <LevyPricingForm />}
        </div>

        {/* 2. Acquisition Desk (Col-span 1 on Desktop, controlled by activeTab on mobile) */}
        <div className={`${activeTab === "acquisition" ? "block" : "hidden"} lg:block lg:col-span-1 space-y-6`}>
          {/* Visual KPI Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Finalized</span>
              <div className="mt-2">
                <span className="text-xl font-display font-black text-[#000666]">{stats?.totalPaid || 0}</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Paid Applicants</span>
              </div>
            </div>

            <Link
              href="/admin/waitlist"
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <span className="text-[9px] uppercase font-bold text-slate-400 group-hover:text-amber-600 transition-colors tracking-wider">Waitlist Volume</span>
              <div className="mt-2">
                <span className="text-xl font-display font-black text-amber-600">{stats?.waitlistCount || 0}</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Inquiries &rarr;</span>
              </div>
            </Link>

            <div className="col-span-2 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
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
        <div id="cohort-overview" className={`${activeTab === "cohorts" ? "block" : "hidden"} min-w-0 scroll-mt-20 lg:block bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm lg:col-span-2`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#000666]">
                Cohorts
              </h2>
            </div>

            {/* Desktop Cohort Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Cohort Title</th>
                    <th className="px-4 py-3">Registration Window</th>
                    <th className="px-4 py-3">Training Window</th>
                    <th className="px-4 py-3">Weeks</th>
                    <th className="px-4 py-3">Seats filled / max</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cohorts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No intake cohorts registered.
                      </td>
                    </tr>
                  ) : (
                    cohorts.map((cohort) => (
                      <tr key={cohort._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-[#000666]">
                          <button type="button" onClick={() => setSelectedCohortId(cohort._id)} className="text-start underline">{cohort.name}</button>
                          <p className="mt-1 font-normal text-slate-600">{stats?.cohortMetrics?.[cohort._id]?.applications ?? 0} started · {stats?.cohortMetrics?.[cohort._id]?.completed ?? 0} completed · {stats?.cohortMetrics?.[cohort._id]?.hires ?? 0} hired</p>
                          {cohort.notifyWaitlist && <button type="button" className="mt-1 underline" onClick={() => showWaitlistDelivery(cohort)}>Waitlist delivery</button>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(cohort.registrationStartDate)} &mdash; {formatDate(cohort.registrationEndDate)}
                          {cohort.status === "upcoming" && checkedAt > 0 && Date.parse(cohort.registrationStartDate) > checkedAt && <p className="mt-1 text-slate-600">Scheduled to open {formatDate(cohort.registrationStartDate)}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatTrainingWindow(cohort)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-semibold">
                          {cohort.totalWeeks || 4} wks
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono font-bold">
                          {stats?.cohortMetrics?.[cohort._id]?.enrolled ?? 0} / {cohort.cohortCap || 100}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full ${
                            cohort.status === "active"
                              ? "bg-indigo-50 text-indigo-700"
                              : cohort.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              cohort.status === "active"
                                ? "bg-indigo-500"
                                : cohort.status === "completed"
                                  ? "bg-emerald-500"
                                  : "bg-amber-400"
                            }`} />
                            {cohort.status.charAt(0).toUpperCase() + cohort.status.slice(1)}
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
                      <button type="button" onClick={() => setSelectedCohortId(cohort._id)} className="min-w-0 break-words text-start text-sm font-bold text-[#000666] underline">{cohort.name}</button>
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
                        {formatTrainingWindow(cohort)} ({cohort.totalWeeks || 4} weeks)
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Capacity:</span>{" "}
                        <strong className="text-slate-700 font-mono">{stats?.cohortMetrics?.[cohort._id]?.enrolled ?? 0} / {cohort.cohortCap || 100} seats</strong>
                      </div>
                      <p>{stats?.cohortMetrics?.[cohort._id]?.applications ?? 0} started · {stats?.cohortMetrics?.[cohort._id]?.completed ?? 0} completed · {stats?.cohortMetrics?.[cohort._id]?.hires ?? 0} hired</p>
                      {cohort.notifyWaitlist && <button type="button" className="font-semibold text-[#000666] underline" onClick={() => showWaitlistDelivery(cohort)}>Waitlist delivery</button>}
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
            {stats?.cohortMetrics?.unassigned && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
              <button type="button" className="font-semibold text-[#000666] underline" onClick={() => setSelectedCohortId("unassigned")}>Unassigned</button>
              <span>{stats.cohortMetrics.unassigned.applications} started · {stats.cohortMetrics.unassigned.enrolled} enrolled · {stats.cohortMetrics.unassigned.hires} hired</span>
            </div>}
          </div>
        </div>
      </div>

      {/* ── Registration Funnel Panel ───────────────────────────────────────── */}
      {(() => {
        const funnel = stats?.registrationFunnel;
        const maxCount = funnel?.totalStarted || 1;
        const convRate = funnel?.conversionRate ?? 0;
        const convColor = convRate >= 60 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
          : convRate >= 30 ? "text-amber-600 bg-amber-50 border-amber-200"
          : "text-rose-600 bg-rose-50 border-rose-200";
        const abandonCount = (funnel?.checkoutStarted ?? 0) - (funnel?.paymentCompleted ?? 0) - (funnel?.fullyConverted ?? 0);

        return (
          <div className={`mt-8 ${activeTab === "funnel" ? "block" : "hidden"} lg:block`}>
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <HiOutlineFunnel className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#000666]">Program-wide registration funnel</h2>
                    <p className="text-[10px] text-slate-400 font-medium">Live pipeline — identities hidden until payment is confirmed</p>
                  </div>
                </div>
                {/* KPI chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border ${convColor}`}>
                    <HiOutlineChartBarSquare className="w-3.5 h-3.5" />
                    {convRate}% converted
                  </span>
                  {(abandonCount > 0) && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600">
                      <HiOutlineArrowTrendingDown className="w-3.5 h-3.5" />
                      {abandonCount} checkout abandoned
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                    {funnel?.inProgress ?? 0} in-progress
                  </span>
                </div>
              </div>

              <div className="p-6">
                {!funnel || funnel.totalStarted === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <HiOutlineFunnel className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No in-progress registrations</p>
                    <p className="text-slate-300 text-xs mt-1">Funnel data will appear once applicants start signing up.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Waterfall Funnel Chart */}
                    <div className="space-y-2">
                      {funnel.byStep.map((s, idx) => {
                        const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
                        const dropFromPrev = idx > 0 ? funnel.byStep[idx - 1].count - s.count : 0;
                        const dropPct = idx > 0 && funnel.byStep[idx - 1].count > 0
                          ? Math.round((dropFromPrev / funnel.byStep[idx - 1].count) * 100)
                          : 0;
                        const isWorstDrop = funnel.dropOffStep === s.step;
                        const barColor = isWorstDrop ? "bg-rose-500" : idx < 2 ? "bg-[#000666]" : idx < 4 ? "bg-indigo-500" : "bg-indigo-300";

                        return (
                          <div key={s.step}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                                  isWorstDrop ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                                }`}>{s.step}</span>
                                <span className={`font-semibold ${isWorstDrop ? "text-rose-600" : "text-slate-700"}`}>{s.label}</span>
                                {isWorstDrop && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Highest Drop-off</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {idx > 0 && dropFromPrev > 0 && (
                                  <span className="text-[10px] font-bold text-rose-400">−{dropFromPrev} ({dropPct}%)</span>
                                )}
                                <button
                                  onClick={() => openFunnelDrawer(s.step)}
                                  className="flex items-center gap-0.5 font-bold text-[#000666] hover:underline tabular-nums"
                                >
                                  {s.count} <HiChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div
                                className={`${barColor} h-full rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Checkout & Payment rows */}
                      {[{
                        label: "Checkout Initiated",
                        count: funnel.checkoutStarted,
                        color: "bg-amber-400",
                        tag: null,
                      }, {
                        label: "Payment Confirmed",
                        count: funnel.fullyConverted,
                        color: "bg-emerald-500",
                        tag: null,
                      }].map((row, idx) => {
                        const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
                        return (
                          <div key={row.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 bg-slate-100 text-slate-500">
                                  {idx === 0 ? "💳" : "✅"}
                                </span>
                                <span className="font-semibold text-slate-600">{row.label}</span>
                              </div>
                              <span className="font-bold text-slate-600 tabular-nums">{row.count}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div
                                className={`${row.color} h-full rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Step breakdown table */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step-by-Step Breakdown</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <th className="text-left px-4 py-2.5">Stage</th>
                            <th className="text-right px-4 py-2.5">Count</th>
                            <th className="text-right px-4 py-2.5">Drop-off</th>
                            <th className="text-right px-4 py-2.5">Health</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {funnel.byStep.map((s, idx) => {
                            const prevCount = idx > 0 ? funnel.byStep[idx - 1].count : s.count;
                            const dropPct = prevCount > 0 ? Math.round(((prevCount - s.count) / prevCount) * 100) : 0;
                            const health = dropPct === 0 ? "🟢" : dropPct < 20 ? "🟡" : "🔴";
                            return (
                              <tr key={s.step} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-2.5">
                                  <span className="font-medium text-slate-700">
                                    <span className="text-slate-400 font-mono mr-1.5">{s.step}.</span>
                                    {s.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-[#000666]">{s.count}</td>
                                <td className="px-4 py-2.5 text-right">
                                  {idx > 0 && dropPct > 0 ? (
                                    <span className={`font-bold ${dropPct >= 30 ? "text-rose-500" : "text-amber-500"}`}>−{dropPct}%</span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-base">{health}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── In-Progress Applicants Slide-In Drawer ─────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl border-l border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="bg-[#000666] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-sm">Step {drawerStep} — In Progress</p>
                <p className="text-white/60 text-[10px] mt-0.5">Identities hidden — payment not yet confirmed</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-white/70 hover:text-white">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy notice */}
            <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-semibold text-amber-700">
                🔒 Applicant names and emails are only revealed once payment is confirmed and the application is fully submitted.
              </p>
            </div>

            {/* Applicant list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4">
              {drawerLoading ? (
                <div className="flex justify-center py-12">
                  <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : drawerApplicants.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">No applicants at this step.</p>
              ) : (
                <div className="space-y-2">
                  {drawerApplicants.map((a) => {
                    const lastSeen = new Date(a.updatedAt);
                    const minutesAgo = Math.round((Date.now() - lastSeen.getTime()) / 60000);
                    const timeLabel = minutesAgo < 60
                      ? `${minutesAgo}m ago`
                      : minutesAgo < 1440
                        ? `${Math.round(minutesAgo / 60)}h ago`
                        : `${Math.round(minutesAgo / 1440)}d ago`;

                    return (
                      <div key={a.ref} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black text-indigo-600 font-mono">{a.ref.slice(0, 3)}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 font-mono"># {a.ref}</p>
                            <p className="text-[10px] text-slate-400">
                              {a.checkoutInitiated ? "Checkout started" : "Form in progress"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <HiOutlineClock className="w-3.5 h-3.5" />
                          {timeLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cohort Modal Overlay */}
      {modalOpen && (
        <dialog ref={cohortDialog} aria-labelledby="cohort-dialog-title" onCancel={event => {
          event.preventDefault();
          if (!creatingCohort) setModalOpen(false);
        }} className="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none overflow-hidden rounded-t-2xl bg-white shadow-xl backdrop:bg-black/40 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-2xl">
          <div className="flex max-h-[90dvh] flex-col overflow-hidden">
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <h3 id="cohort-dialog-title" className="font-bold text-base flex items-center gap-1.5">
                <HiOutlineCalendarDays className="w-5 h-5" /> {editingCohortItem ? "Edit cohort" : "New cohort"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                aria-label="Close cohort form"
                disabled={creatingCohort}
                className="text-white/80 hover:text-white"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCohort} className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label htmlFor="cohort-name" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                  Cohort name
                </label>
                <input 
                  type="text"
                  id="cohort-name"
                  maxLength={120}
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="Intake or cohort name"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="registration-opens" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Registration Starts
                  </label>
                  <input 
                    type="date"
                    id="registration-opens"
                    value={newCohortRegStart}
                    onChange={(e) => setNewCohortRegStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="registration-closes" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Registration Ends
                  </label>
                  <input 
                    type="date"
                    id="registration-closes"
                    value={newCohortRegEnd}
                    onChange={(e) => setNewCohortRegEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="programme-start" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Training starts (optional)
                  </label>
                  <input 
                    type="date"
                    id="programme-start"
                    value={newCohortStart}
                    onChange={(e) => setNewCohortStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="programme-end" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Training ends (optional)
                  </label>
                  <input 
                    type="date"
                    id="programme-end"
                    value={newCohortEnd}
                    onChange={(e) => setNewCohortEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-600">You can add training dates later in Edit cohort.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="programme-duration" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Duration (Weeks)
                  </label>
                  <input 
                    type="number"
                    id="programme-duration"
                    value={newCohortTotalWeeks}
                    onChange={(e) => setNewCohortTotalWeeks(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white font-mono"
                    min={1}
                    max={52}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cohort-capacity" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Maximum seats
                  </label>
                  <input 
                    type="number"
                    id="cohort-capacity"
                    value={newCohortCap}
                    onChange={(e) => setNewCohortCap(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B0FF] bg-white font-mono"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cohort-status" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    Intake Status
                  </label>
                  <select
                    id="cohort-status"
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

              {!editingCohortItem && newCohortStatus === "upcoming" && (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-slate-700">
                  <label className="flex items-start gap-2 font-semibold">
                    <input type="checkbox" className="mt-0.5" checked={notifyWaitlist} onChange={event => setNotifyWaitlist(event.target.checked)} />
                    Notify existing waitlist when registration opens
                  </label>
                  {notifyWaitlist && <>
                    <p>{recipientCount === null ? "Recipients are determined when the cohort is created." : `${recipientCount} currently waitlisted. The cutoff is the time this cohort is created.`}</p>
                    <details><summary className="cursor-pointer font-semibold">Preview email</summary>
                      <p className="mt-2 font-semibold">Registration dates for {newCohortName.trim() || "[cohort name]"}</p>
                      <p className="mt-1">You’re receiving this because you joined the IFIP waitlist.</p>
                      <p className="mt-1">Registration is scheduled from {newCohortRegStart ? formatDate(newCohortRegStart) : "[registration start]"} to {newCohortRegEnd ? formatDate(newCohortRegEnd) : "[registration deadline]"}. Seats are limited.</p>
                      <p className="mt-1">{newCohortStart ? `Training is scheduled to start on ${formatDate(newCohortStart)}.` : "The training start date will be announced later."}</p>
                      <p className="mt-1 font-semibold">Check registration availability</p>
                    </details>
                  </>}
                </div>
              )}
              {cohortError && <p role="alert" className="text-red-700">{cohortError}</p>}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={creatingCohort}
                  className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCohort}
                  className="rounded-xl bg-[#000666] px-6 py-2.5 font-bold text-white hover:bg-[#000666]/90 disabled:opacity-60"
                >
                  {creatingCohort ? "Saving..." : (editingCohortItem ? "Save Changes" : "Save Cohort")}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Export Applicants Insights Modal */}
      <ExportApplicantsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        cohorts={cohorts}
        initialParams={{
          type: "all",
          cohortId: selectedCohortId || undefined,
        }}
        title="Export Applicants Insights (CSV)"
      />
    </div>
  );
}
