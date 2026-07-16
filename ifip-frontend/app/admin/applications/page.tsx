"use strict";

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  HiOutlineUser, 
  HiOutlineBriefcase, 
  HiOutlineCheckCircle, 
  HiOutlineMagnifyingGlass,
  HiOutlineBookOpen,
  HiOutlineXMark,
  HiOutlineInboxStack,
  HiOutlineUsers,
  HiOutlineSparkles,
  HiOutlineClipboardDocumentCheck
} from "react-icons/hi2";
import { useContext } from "react";
import { AdminCohortContext } from "../layout";
import { 
  getAdminStats, 
  getAdminApplications, 
  assignCohort, 
  withdrawApplication, 
  AdminStats, 
  Cohort 
} from "@/lib/api/services";

export default function AdminApplicationsPage() {
  const { selectedCohortId, cohorts } = useContext(AdminCohortContext);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Selected candidate modal state
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [assigningCohortId, setAssigningCohortId] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [statsData, appsData] = await Promise.all([
        getAdminStats(selectedCohortId || undefined),
        getAdminApplications(statusFilter || undefined, search || undefined, selectedCohortId || undefined)
      ]);
      setStats(statsData);
      setApplications(appsData);
    } catch (err) {
      console.error("Failed to load admin parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [search, statusFilter, selectedCohortId]);

  const handleAssignCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !assigningCohortId || updating) return;
    
    setUpdating(true);
    try {
      await assignCohort(selectedApp._id, assigningCohortId);
      alert("Cohort assigned and workspace unlocked successfully.");
      setSelectedApp(null);
      fetchAdminData();
    } catch (err) {
      console.error("Failed to assign cohort:", err);
      alert("Failed to assign cohort. Please check parameters.");
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdraw = async (appId: string) => {
    if (!confirm("Are you sure you want to withdraw this participant?") || updating) return;
    
    setUpdating(true);
    try {
      await withdrawApplication(appId);
      alert("Participant withdrawn successfully.");
      setSelectedApp(null);
      fetchAdminData();
    } catch (err) {
      console.error("Failed to withdraw candidate:", err);
      alert("Failed to process withdrawal.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening review dashboards...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Back to standard admin dashboard links */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin"
            className="text-xs font-bold text-[#000666] hover:underline"
          >
            &larr; Back to Admin Cockpit
          </Link>
          <span className="text-slate-300 text-xs">|</span>
          <Link 
            href="/dashboard"
            className="text-xs font-bold text-slate-400 hover:underline"
          >
            Go to Participant Workspace
          </Link>
        </div>
        <span className="bg-orange-100 text-[#FF9800] text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-orange-200">
          Admin Panel
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Cohort Review & Applications Queue</h1>
        <p className="text-slate-500 text-sm">Review committed applicants, manage assignments, and track registrations.</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory gap-4 pb-4 md:pb-0 scrollbar-hide mb-8">
          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Paid</span>
              <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-[#00B0FF]" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.totalPaid}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active</span>
              <HiOutlineUsers className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.activeParticipants}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.completedCount}</div>
          </div>

          <div className="min-w-[160px] md:min-w-0 flex-shrink-0 snap-center bg-white border border-[#E7E2D8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Waitlist</span>
              <HiOutlineInboxStack className="w-5 h-5 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-[#000666]">{stats.waitlistCount}</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#00B0FF]"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="payment_confirmed">Paid, Unassigned</option>
            <option value="active">Active Participant</option>
            <option value="completed">Curriculum Completed</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Applicant Detail</th>
                <th className="px-6 py-4">Selected Tracks</th>
                <th className="px-6 py-4">Admission Status</th>
                <th className="px-6 py-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No paid applications found matching parameters.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#000666]">{app.fullName || "Draft Profile"}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{app.userId?.email || "No Email"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {app.programInterest?.primary?.map((track: string, index: number) => (
                          <span key={index} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {track}
                          </span>
                        )) || <span className="text-slate-400 text-xs">None</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {app.status === "payment_confirmed" && (
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          Paid, Awaiting Intake
                        </span>
                      )}
                      {app.status === "active" && (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          Active Training
                        </span>
                      )}
                      {app.status === "completed" && (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                          Course Completed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setAssigningCohortId(app.cohortId || "");
                        }}
                        className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-4.5 py-2 rounded-xl transition-all shadow-sm"
                      >
                        Review Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white">
          {applications.length === 0 ? (
            <p className="px-6 py-12 text-center text-slate-400 text-xs italic">
              No paid applications found matching parameters.
            </p>
          ) : (
            applications.map((app) => (
              <div key={app._id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#000666] text-sm">{app.fullName || "Draft Profile"}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">{app.userId?.email || "No Email"}</p>
                  </div>
                  <div>
                    {app.status === "payment_confirmed" && (
                      <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Paid
                      </span>
                    )}
                    {app.status === "active" && (
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {app.status === "completed" && (
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Interests</span>
                  <div className="flex flex-wrap gap-1">
                    {app.programInterest?.primary?.map((track: string, index: number) => (
                      <span key={index} className="bg-slate-100 text-slate-600 text-[9px] font-medium px-2 py-0.5 rounded-full">
                        {track}
                      </span>
                    )) || <span className="text-slate-300 text-xs italic">None</span>}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setAssigningCohortId(app.cohortId || "");
                    }}
                    className="bg-[#000666] hover:bg-[#000666]/90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Review Profile &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Applicant Profile Overlay Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-[#E7E2D8] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#000666] text-white py-4 px-6 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">{selectedApp.fullName || "Candidate Details"}</h3>
                <p className="text-xs text-sky-200 mt-0.5">{selectedApp.userId?.email}</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Status Header info */}
              <div className="bg-[#FDFBF7] border border-[#E7E2D8] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Verification Reference</span>
                  <div className="font-mono text-xs text-[#000666] mt-0.5">{selectedApp._id}</div>
                </div>
                <span className="text-xs capitalize font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1">
                  Status: {selectedApp.status.replace("_", " ")}
                </span>
              </div>

              {/* Academic Info */}
              <div>
                <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                  <HiOutlineBookOpen className="w-4 h-4" /> Academic Credentials
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Institution</span>
                    <div className="font-bold text-slate-700">{selectedApp.academicInfo?.institution || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Field of Study</span>
                    <div className="font-bold text-slate-700">{selectedApp.academicInfo?.fieldOfStudy || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Qualification</span>
                    <div className="font-bold text-slate-700">{selectedApp.academicInfo?.qualification || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Graduation Year</span>
                    <div className="font-bold text-slate-700">{selectedApp.academicInfo?.gradYear || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Career Interests & Skills */}
              <div>
                <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                  <HiOutlineSparkles className="w-4 h-4" /> Interest Tracks & Skills
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Primary Interests</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApp.programInterest?.primary?.map((track: string, index: number) => (
                        <span key={index} className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {track}
                        </span>
                      )) || <span className="text-slate-400">None</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-medium">Core Professional Skills</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApp.skills?.relevantSkills?.map((skill: string, index: number) => (
                        <span key={index} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {skill}
                        </span>
                      )) || <span className="text-slate-400">None</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate Motivation */}
              {selectedApp.motivation?.whyApplying && (
                <div>
                  <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                    <HiOutlineUser className="w-4 h-4" /> Personal Motivation
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 italic leading-relaxed">
                    "{selectedApp.motivation.whyApplying}"
                  </div>
                </div>
              )}

              {/* CV File Link */}
              {selectedApp.cvUrl && (
                <div>
                  <h4 className="font-bold text-[#000666] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1">
                    <HiOutlineBriefcase className="w-4 h-4" /> Curriculum Vitae (CV)
                  </h4>
                  <a 
                    href={selectedApp.cvUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#00B0FF] font-bold hover:underline"
                  >
                    📄 View PDF Attachment &rarr;
                  </a>
                </div>
              )}

              {/* Action Controls Section */}
              <div className="border-t border-[#E7E2D8] pt-6 flex flex-col gap-4">
                <form onSubmit={handleAssignCohort} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                      Assign Student Intake Cohort
                    </label>
                    <select
                      value={assigningCohortId}
                      onChange={(e) => setAssigningCohortId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none bg-white"
                      required
                    >
                      <option value="">Choose active cohort...</option>
                      {cohorts.map((cohort) => (
                        <option key={cohort._id} value={cohort._id}>
                          {cohort.name} ({cohort.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full sm:w-auto bg-[#FF9800] hover:bg-[#FF9800]/95 text-white font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl shadow-sm transition-all"
                  >
                    Confirm Cohort
                  </button>
                </form>

                <div className="border-t border-slate-100 pt-4 flex justify-between">
                  <button
                    onClick={() => handleWithdraw(selectedApp._id)}
                    disabled={updating}
                    className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                  >
                    Withdraw Participant
                  </button>
                  
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs px-4 py-2"
                  >
                    Cancel Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
