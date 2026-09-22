"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiOutlineBriefcase,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineMapPin,
  HiOutlineBuildingOffice2,
  HiOutlineXMark,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import {
  getPartnerJobOpenings,
  createPartnerJobOpening,
  updatePartnerJobOpening,
  deletePartnerJobOpening,
  JobOpeningItem,
  JobWorkMode,
} from "@/lib/api/partner";

export default function PartnerOpeningsPage() {
  const [openings, setOpenings] = useState<JobOpeningItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingOpening, setEditingOpening] = useState<JobOpeningItem | null>(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [workMode, setWorkMode] = useState<JobWorkMode>("Remote");
  const [location, setLocation] = useState("");
  const [slots, setSlots] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete Confirmation State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOpenings = async () => {
    try {
      const res = await getPartnerJobOpenings();
      setOpenings(res.openings || []);
    } catch (err) {
      console.error("Failed to load partner openings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, []);

  const handleOpenAddModal = () => {
    setEditingOpening(null);
    setTitle("");
    setDepartment("");
    setWorkMode("Remote");
    setLocation("");
    setSlots(1);
    setDescription("");
    setQualifications("");
    setApplicationDeadline("");
    setRequirements([]);
    setReqInput("");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEditModal = (op: JobOpeningItem) => {
    setEditingOpening(op);
    setTitle(op.title);
    setDepartment(op.department || "");
    setWorkMode(op.workMode);
    setLocation(op.location || "");
    setSlots(op.slots || 1);
    setDescription(op.description || "");
    setQualifications(op.qualifications || "");
    setApplicationDeadline(
      op.applicationDeadline ? new Date(op.applicationDeadline).toISOString().split("T")[0] : ""
    );
    setRequirements(op.requirements ? [...op.requirements] : []);
    setReqInput("");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleAddRequirement = () => {
    const trimmed = reqInput.trim();
    if (!trimmed) return;
    setRequirements((prev) => [...prev, trimmed]);
    setReqInput("");
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Role title is required.");
      return;
    }
    if ((workMode === "Hybrid" || workMode === "On-site") && !location.trim()) {
      setErrorMsg(`Location is required for ${workMode} openings.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editingOpening) {
        await updatePartnerJobOpening(editingOpening._id, {
          title: title.trim(),
          department: department.trim() || undefined,
          workMode,
          location: location.trim() || undefined,
          slots: Number(slots) || 1,
          description: description.trim() || undefined,
          qualifications: qualifications.trim() || undefined,
          applicationDeadline: applicationDeadline || undefined,
          requirements,
        });
      } else {
        await createPartnerJobOpening({
          title: title.trim(),
          department: department.trim() || undefined,
          workMode,
          location: location.trim() || undefined,
          slots: Number(slots) || 1,
          description: description.trim() || undefined,
          qualifications: qualifications.trim() || undefined,
          applicationDeadline: applicationDeadline || undefined,
          requirements,
        });
      }

      setShowModal(false);
      fetchOpenings();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Failed to save job opening.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deletePartnerJobOpening(deleteTargetId);
      setDeleteTargetId(null);
      fetchOpenings();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to withdraw job opening.");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <HiOutlineClock className="w-3.5 h-3.5 text-amber-600" />
            Pending Administrative Verification
          </span>
        );
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Open for Applications
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <HiOutlineXCircle className="w-3.5 h-3.5 text-rose-600" />
            Requires Revision
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-[#000666]">Job Openings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create placement openings for your organisation. Once verified by administration, candidates can apply directly with tailored CVs.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#000666] text-white text-sm font-semibold rounded-lg hover:bg-[#000666]/90 transition shadow-xs cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4 shrink-0" />
          <span>Post Job Opening</span>
        </button>
      </div>

      {/* Overview Notice */}
      <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 text-xs text-sky-950 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="p-2 bg-sky-100 rounded-lg text-sky-800 shrink-0">
          <HiOutlineBriefcase className="w-5 h-5" />
        </div>
        <div className="leading-relaxed">
          <strong className="font-bold">How Job Postings Work:</strong> When you submit a job opening, our programme administration conducts a swift verification to ensure alignment with candidate coursework. Once declared open, all qualified participants are notified via email and in-app alerts and can apply directly.
        </div>
      </div>

      {/* Openings Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#000666]" />
          <p className="text-sm text-slate-500 mt-3 font-medium">Loading your job openings...</p>
        </div>
      ) : openings.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <HiOutlineBriefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Job Openings Posted Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have not posted any job openings yet. Use the <strong>"Post Job Opening"</strong> button above to submit your first placement opportunity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {openings.map((op) => (
            <div
              key={op._id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition gap-4"
            >
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getStatusBadge(op.status)}
                </div>

                {/* Title & Department */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{op.title}</h3>
                  {op.department && (
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">{op.department}</div>
                  )}
                </div>

                {/* Work mode, location & slots */}
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>{op.workMode}</span>
                  {op.location && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span>{op.location}</span>
                    </>
                  )}
                  <span className="text-slate-300">&bull;</span>
                  <span>{op.slots} {op.slots === 1 ? "Slot" : "Slots"}</span>
                </div>

                {/* Candidate Applications Counter */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Candidate Applications:</span>
                  <span className="font-bold text-[#000666] text-sm">
                    {op.applicationCount || 0}
                  </span>
                </div>

                {/* Admin Feedback (if rejected) */}
                {op.status === "rejected" && op.adminNotes && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-rose-800 flex items-center gap-1">
                      <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
                      Admin Review Feedback:
                    </div>
                    <p className="text-rose-700">{op.adminNotes}</p>
                  </div>
                )}

                {/* Requirements count */}
                {op.requirements && op.requirements.length > 0 && (
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Requirements:</span>{" "}
                    {op.requirements.length} specified
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                {/* Review Applications Link */}
                <Link
                  href={`/partner-portal/openings/${op._id}/applications`}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-[#000666] text-white hover:bg-[#000666]/90 transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <HiOutlineUsers className="w-4 h-4" />
                  Review Applications ({op.applicationCount || 0})
                </Link>

                {/* Edit & Withdraw (if pending) */}
                {op.status === "pending_review" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(op)}
                      className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(op._id)}
                      className="py-1.5 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                      Withdraw
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingOpening ? "Edit Job Opening" : "Post Job Opening"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Role Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Junior Islamic Finance Analyst"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shariah Advisory & Compliance"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Available Positions <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={slots}
                    onChange={(e) => setSlots(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                </div>
              </div>

              {/* Work Mode & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Work Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as JobWorkMode)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Location {workMode !== "Remote" && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={workMode === "Remote" ? "Optional for remote" : "City, Country or Office address"}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required={workMode !== "Remote"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                </div>
              </div>

              {/* Application Deadline */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Application Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Role Overview & Responsibilities
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the tasks, projects, and learning opportunities the intern will undertake..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666] leading-relaxed"
                />
              </div>

              {/* Requirements Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Specific Job Requirements
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Candidates answer these when applying
                  </span>
                </div>

                {requirements.length > 0 && (
                  <ul className="space-y-1.5">
                    {requirements.map((req, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
                      >
                        <span className="flex-1 font-medium">{req}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a requirement (e.g. Strong knowledge of Sukuk structures)..."
                    value={reqInput}
                    onChange={(e) => setReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#000666]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="px-3 py-2 font-bold bg-[#000666] text-white rounded-lg hover:bg-[#000666]/90 cursor-pointer flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-[#000666] hover:bg-[#000666]/90 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting
                    ? "Submitting..."
                    : editingOpening
                    ? "Save Changes"
                    : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Withdraw Job Opening?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to withdraw this job opening? It will be permanently removed from the verification queue.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
