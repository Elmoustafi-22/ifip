"use client";

import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineGlobeAlt,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentList,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineEnvelope,
  HiOutlinePhone,
} from "react-icons/hi2";
import {
  getAdminPartnersV2,
  createPartnerV2,
  updatePartnerV2,
  deletePartnerV2,
  uploadLogo,
  getAdminCohorts,
  getAdminPartnerApplications,
  reviewPartnerApplication,
  PartnerApplicationRecord,
} from "@/lib/api/services";
import { AdminCohortContext } from "../layout";

interface PartnerOrg {
  _id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  sectorTags: string[];
  activeSlots: number;
  website?: string;
  contactEmail?: string;
  contactPerson?: string;
  contactPhone?: string;
  status?: string;
  cohorts: string[];
  hasOpenings?: boolean;
  openings?: Array<{ role: string; mode: string; location?: string; count: number }>;
  createdAt: string;
}

interface CohortOption {
  _id: string;
  name: string;
  status: string;
}

const COHORT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

const APPLICATION_STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: <HiOutlineClock className="w-3.5 h-3.5" />,
    label: "Pending Review",
  },
  approved: {
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: <HiOutlineCheckCircle className="w-3.5 h-3.5" />,
    label: "Approved",
  },
  declined: {
    badge: "bg-red-100 text-red-600 border border-red-200",
    icon: <HiOutlineXCircle className="w-3.5 h-3.5" />,
    label: "Declined",
  },
};

type Tab = "organizations" | "applications";
type AppFilter = "all" | "pending" | "approved" | "declined";

export default function AdminPartnersPage() {
  const { selectedCohortId } = useContext(AdminCohortContext);
  const [activeTab, setActiveTab] = useState<Tab>("organizations");

  // ── Organizations tab state ───────────────────────────────────────────────
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerOrg | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [activeSlots, setActiveSlots] = useState(5);
  const [sectorTagsInput, setSectorTagsInput] = useState("");
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [contactPhone, setContactPhone] = useState("");
  const [hasOpenings, setHasOpenings] = useState(false);
  const [openings, setOpenings] = useState<Array<{ role: string; mode: string; location: string; count: number }>>([
    { role: "", mode: "Remote", location: "", count: 1 }
  ]);

  const addOpening = () => {
    setOpenings((prev) => [...prev, { role: "", mode: "Remote", location: "", count: 1 }]);
  };

  const removeOpening = (index: number) => {
    setOpenings((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOpeningField = (index: number, field: string, value: any) => {
    setOpenings((prev) =>
      prev.map((op, i) => (i === index ? { ...op, [field]: value } : op))
    );
  };

  // ── Applications tab state ────────────────────────────────────────────────
  const [applications, setApplications] = useState<PartnerApplicationRecord[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [reviewingApp, setReviewingApp] = useState<PartnerApplicationRecord | null>(null);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "decline" | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchPartners = async () => {
    try {
      setOrgLoading(true);
      const data = await getAdminPartnersV2();
      setPartners(data);
    } catch (err) {
      console.error("Failed to load partner organizations:", err);
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchCohorts = async () => {
    try {
      const data = await getAdminCohorts();
      setCohorts(data);
    } catch (err) {
      console.error("Failed to load cohorts:", err);
    }
  };

  const fetchApplications = async (status?: string) => {
    try {
      setAppLoading(true);
      const data = await getAdminPartnerApplications(status === "all" ? undefined : status);
      setApplications(data);
    } catch (err) {
      console.error("Failed to load partner applications:", err);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchCohorts();
  }, []);

  useEffect(() => {
    if (activeTab === "applications") {
      fetchApplications(appFilter);
    }
  }, [activeTab, appFilter]);

  // ── Organizations CRUD handlers ───────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingPartner(null);
    setName(""); setDescription(""); setWebsite(""); setLogoUrl("");
    setActiveSlots(5); setSectorTagsInput(""); setSelectedCohorts([]); setLogoFile(null);
    setContactPhone("");
    setHasOpenings(false);
    setOpenings([{ role: "", mode: "Remote", location: "", count: 1 }]);
    setModalOpen(true);
  };

  const handleOpenEdit = (partner: PartnerOrg) => {
    setEditingPartner(partner);
    setName(partner.name);
    setDescription(partner.description || "");
    setWebsite(partner.website || "");
    setLogoUrl(partner.logoUrl || "");
    setActiveSlots(partner.activeSlots);
    setSectorTagsInput(partner.sectorTags ? partner.sectorTags.join(", ") : "");
    setSelectedCohorts(partner.cohorts || []);
    setLogoFile(null);
    setContactPhone(partner.contactPhone || "");
    setHasOpenings(partner.hasOpenings || false);
    setOpenings(partner.openings && partner.openings.length > 0 ? partner.openings.map(op => ({
      role: op.role,
      mode: op.mode,
      location: op.location || "",
      count: op.count
    })) : [{ role: "", mode: "Remote", location: "", count: 1 }]);
    setModalOpen(true);
  };

  const toggleCohort = (cohortId: string) => {
    setSelectedCohorts((prev) =>
      prev.includes(cohortId) ? prev.filter((id) => id !== cohortId) : [...prev, cohortId]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partner organization? This will clear its placement references.")) return;
    try {
      await deletePartnerV2(id);
      alert("Partner organization deleted successfully.");
      fetchPartners();
    } catch (err) {
      console.error("Failed to delete partner:", err);
      alert("Failed to delete partner organization.");
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || submitting) return;

    if (hasOpenings) {
      for (let i = 0; i < openings.length; i++) {
        const op = openings[i];
        if (!op.role.trim()) {
          alert(`Please specify the role title for opening #${i + 1}.`);
          return;
        }
        if (op.count < 1) {
          alert(`Please specify a valid count for opening #${i + 1}.`);
          return;
        }
        if ((op.mode === "On-site" || op.mode === "Hybrid") && !op.location.trim()) {
          alert(`Please specify the location for opening #${i + 1} (${op.mode}).`);
          return;
        }
      }
    }

    setSubmitting(true);
    let finalLogoUrl = logoUrl;
    try {
      if (logoFile) {
        try {
          const uploadRes = await uploadLogo(logoFile);
          finalLogoUrl = uploadRes.url;
        } catch {
          alert("Logo upload failed. Please verify it is a valid image file.");
          setSubmitting(false);
          return;
        }
      }
      const sectorTags = sectorTagsInput.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
      
      let computedSlots = Number(activeSlots);
      if (hasOpenings) {
        computedSlots = openings.reduce((sum, item) => sum + item.count, 0);
      }

      const payload = {
        name, description: description || undefined, website: website || undefined,
        logoUrl: finalLogoUrl || undefined, activeSlots: computedSlots, sectorTags, cohorts: selectedCohorts,
        contactPhone: contactPhone || undefined,
        hasOpenings,
        openings: hasOpenings ? openings.map(op => ({
          role: op.role.trim(),
          mode: op.mode,
          location: (op.mode === "On-site" || op.mode === "Hybrid") ? op.location.trim() : undefined,
          count: Number(op.count)
        })) : undefined
      };
      if (editingPartner) {
        await updatePartnerV2(editingPartner._id, payload);
        alert("Partner organization updated successfully.");
      } else {
        await createPartnerV2(payload);
        alert("New partner organization added successfully.");
      }
      setModalOpen(false);
      fetchPartners();
    } catch (err) {
      console.error("Failed to save partner details:", err);
      alert("Failed to save partner organization details.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCohortLabel = (cohortId: string) => {
    const found = cohorts.find((c) => c._id === cohortId);
    return found ? found.name : cohortId;
  };

  // ── Application review handlers ───────────────────────────────────────────

  const openReviewDrawer = (app: PartnerApplicationRecord) => {
    setReviewingApp(app);
    setAdminNotes(app.adminNotes || "");
    setReviewAction(null);
    setReviewDrawerOpen(true);
  };

  const handleReview = async (action: "approve" | "decline") => {
    if (!reviewingApp) return;
    setReviewAction(action);
    setReviewSubmitting(true);
    try {
      await reviewPartnerApplication(reviewingApp._id, action, adminNotes || undefined);
      alert(
        action === "approve"
          ? `${reviewingApp.companyName} has been approved and added as an active partner organization.`
          : `${reviewingApp.companyName}'s application has been declined.`
      );
      setReviewDrawerOpen(false);
      setReviewingApp(null);
      // Refresh both tabs
      fetchApplications(appFilter);
      if (action === "approve") fetchPartners();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Review action failed. Please try again.");
    } finally {
      setReviewSubmitting(false);
      setReviewAction(null);
    }
  };

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (orgLoading && partners.length === 0 && activeTab === "organizations") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center bg-[#FDFBF7] font-sans">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Opening partners directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans bg-[#FDFBF7]">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="mb-2">
            <Link href="/admin" className="text-xs font-bold text-[#000666] hover:underline">
              ← Return to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-1 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
            <HiOutlineBriefcase className="w-8 h-8 text-emerald-600 shrink-0" />
            <span>Placement Partners Desk</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Manage partner organizations and review incoming partnership applications.
          </p>
        </div>
        {activeTab === "organizations" && (
          <button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4" /> Add Partner Org
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-8 bg-white border border-[#E7E2D8] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("organizations")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
            activeTab === "organizations"
              ? "bg-[#000666] text-white shadow-sm"
              : "text-slate-500 hover:text-[#000666]"
          }`}
        >
          <HiOutlineBriefcase className="w-4 h-4" />
          Active Partners
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer relative ${
            activeTab === "applications"
              ? "bg-[#000666] text-white shadow-sm"
              : "text-slate-500 hover:text-[#000666]"
          }`}
        >
          <HiOutlineClipboardDocumentList className="w-4 h-4" />
          Applications
          {pendingCount > 0 && activeTab !== "applications" && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB: Organizations ─────────────────────────────────────────────── */}
      {activeTab === "organizations" && (
        <>
          {partners.length === 0 ? (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-12 text-center shadow-sm">
              <p className="text-slate-400 font-medium mb-2">No partner organizations registered in the database.</p>
              <p className="text-xs text-slate-400">Click &quot;Add Partner Org&quot; to begin building your ecosystem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <div
                  key={partner._id}
                  className="bg-white border border-[#E7E2D8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-2 relative overflow-hidden shrink-0">
                        {partner.logoUrl ? (
                          <Image src={partner.logoUrl} alt={`${partner.name} Logo`} fill className="object-contain p-1" sizes="64px" unoptimized />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase">No Logo</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#000666] text-base leading-tight mb-1 truncate">{partner.name}</h3>
                        {partner.website && (
                          <a href={partner.website} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1 font-medium">
                            <HiOutlineGlobeAlt className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{partner.website.replace(/https?:\/\//, "")}</span>
                          </a>
                        )}
                        {partner.contactPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mt-1">
                            <HiOutlinePhone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{partner.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3 min-h-[40px]">
                      {partner.description || "No description provided."}
                    </p>
                    {partner.cohorts && partner.cohorts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {partner.cohorts.map((cohortId, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#000666]/10 text-[#000666] rounded-full text-[10px] font-bold">
                            <HiOutlineAcademicCap className="w-3 h-3" />
                            {getCohortLabel(cohortId)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {partner.sectorTags && partner.sectorTags.length > 0 ? (
                        partner.sectorTags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{tag}</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">No sector tags</span>
                      )}
                    </div>
                    {partner.hasOpenings && partner.openings && partner.openings.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Openings:</p>
                        <div className="flex flex-col gap-1">
                          {partner.openings.map((op, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                              <span className="font-semibold text-slate-700 truncate max-w-[140px]" title={op.role}>{op.role}</span>
                              <span className="text-[9px] text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 shrink-0">{op.mode} {op.location ? `(${op.location})` : ""}</span>
                              <span className="text-[#000666] font-bold text-[10px] shrink-0 ml-1">x{op.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-medium">
                      Active Slots: <strong className="text-[#000666]">{partner.activeSlots}</strong>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(partner)}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer" title="Edit Partner">
                        <HiOutlinePencilSquare className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(partner._id)}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-red-600 transition-colors cursor-pointer" title="Delete Partner">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: Applications ─────────────────────────────────────────────── */}
      {activeTab === "applications" && (
        <div>
          {/* Filter bar */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["all", "pending", "approved", "declined"] as AppFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setAppFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize border ${
                  appFilter === f
                    ? "bg-[#000666] text-white border-[#000666]"
                    : "bg-white text-slate-500 border-[#E7E2D8] hover:border-[#000666]/30 hover:text-[#000666]"
                }`}
              >
                {f === "all" ? "All Applications" : f}
                {f === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-400 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {appLoading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-7 h-7 text-[#000666]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white border border-[#E7E2D8] rounded-2xl p-12 text-center shadow-sm">
              <HiOutlineClipboardDocumentList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium mb-1">No partner applications found.</p>
              <p className="text-xs text-slate-400">Applications submitted via the public form will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {applications.map((app) => {
                const styles = APPLICATION_STATUS_STYLES[app.status];
                return (
                  <div
                    key={app._id}
                    className="bg-white border border-[#E7E2D8] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Logo + Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                          {app.logoUrl ? (
                            <Image src={app.logoUrl} alt={app.companyName} fill className="object-contain p-1" sizes="48px" unoptimized />
                          ) : (
                            <HiOutlineBriefcase className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[#000666] text-base">{app.companyName}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${styles.badge}`}>
                              {styles.icon}
                              {styles.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <HiOutlineEnvelope className="w-3.5 h-3.5" /> {app.contactEmail}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <HiOutlinePhone className="w-3.5 h-3.5" /> {app.contactPhone}
                            </span>
                            {app.website && (
                              <a href={app.website} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600">
                                <HiOutlineGlobeAlt className="w-3.5 h-3.5" />
                                {app.website.replace(/https?:\/\//, "")}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Right: Tags + Action */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {app.sectorTags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{tag}</span>
                          ))}
                          {app.sectorTags.length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[10px] font-bold">+{app.sectorTags.length - 3}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={() => openReviewDrawer(app)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#000666] hover:bg-[#000555] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                    {app.description && (
                      <p className="mt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3 line-clamp-2">
                        {app.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Partner Org Modal ─────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] sm:max-h-none flex flex-col">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-[#000666] text-lg">
                {editingPartner ? "Edit Partner Organization" : "Register Partner Organization"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleOrgSubmit} className="p-6 flex flex-col gap-4 font-sans text-sm max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Organization Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600" placeholder="e.g. Organization Name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600 min-h-[72px]"
                  placeholder="Briefly describe the partner organization..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Website URL</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
                  placeholder="e.g. https://yourorganization.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700">Contact Phone Number</label>
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
                  placeholder="e.g. +234 800 000 0000" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Placement Slots *</label>
                  <input type="number" required min={0} value={activeSlots} onChange={(e) => setActiveSlots(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
                    disabled={hasOpenings} />
                  {hasOpenings && (
                    <span className="text-[10px] text-slate-400 mt-1">Slots are calculated automatically from the active openings counts.</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700">Sector Tags <span className="font-normal text-slate-400">(comma-separated)</span></label>
                  <input type="text" value={sectorTagsInput} onChange={(e) => setSectorTagsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600"
                    placeholder="e.g. Finance, Advisory" />
                </div>
              </div>

              {/* Admin Openings Editor */}
              <div className="flex flex-col gap-3 p-4 border border-slate-200 bg-slate-50/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#000666]">Internship / Job Openings</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Specify individual openings for this partner.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasOpenings}
                      onChange={(e) => setHasOpenings(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#000666]"></div>
                  </label>
                </div>

                {hasOpenings && (
                  <div className="flex flex-col gap-3 mt-2 border-t border-slate-200 pt-3">
                    {openings.map((op, index) => (
                      <div key={index} className="flex flex-col gap-2 p-3 border border-slate-200 bg-white rounded-lg relative">
                        {openings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOpening(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-[10px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening #{index + 1}</h5>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">Role Title *</label>
                            <input
                              type="text"
                              required
                              value={op.role}
                              onChange={(e) => updateOpeningField(index, "role", e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded text-xs"
                              placeholder="e.g. Associate Analyst"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">Count *</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={op.count}
                              onChange={(e) => updateOpeningField(index, "count", e.target.value === "" ? "" : Number(e.target.value))}
                              className="px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">Mode *</label>
                            <select
                              value={op.mode}
                              onChange={(e) => updateOpeningField(index, "mode", e.target.value)}
                              className="px-2 py-1 border border-slate-200 bg-white rounded text-xs"
                            >
                              <option value="Remote">Remote</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="On-site">On-site</option>
                            </select>
                          </div>
                          {(op.mode === "On-site" || op.mode === "Hybrid") && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500">Location *</label>
                              <input
                                type="text"
                                required
                                value={op.location || ""}
                                onChange={(e) => updateOpeningField(index, "location", e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs"
                                placeholder="e.g. Lagos, Nigeria"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOpening}
                      className="self-start text-[11px] font-bold text-[#000666] hover:underline"
                    >
                      + Add another opening
                    </button>
                  </div>
                )}
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
                        <input type="checkbox" checked={selectedCohorts.includes(cohort._id)} onChange={() => toggleCohort(cohort._id)}
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
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium">Or enter image URL manually:</span>
                    <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:border-emerald-600 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="e.g. https://res.cloudinary.com/..." disabled={!!logoFile} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E7E2D8] rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:bg-slate-300 flex items-center gap-2 cursor-pointer">
                  {submitting && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {editingPartner ? "Save Changes" : "Register Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Review Drawer ──────────────────────────────────────────────────── */}
      {reviewDrawerOpen && reviewingApp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-[#000666] text-lg">Review Application</h2>
                <p className="text-xs text-slate-400 mt-0.5">{reviewingApp.companyName}</p>
              </div>
              <button onClick={() => { setReviewDrawerOpen(false); setReviewingApp(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Company + Logo */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                  {reviewingApp.logoUrl ? (
                    <Image src={reviewingApp.logoUrl} alt={reviewingApp.companyName} fill className="object-contain p-2" sizes="80px" unoptimized />
                  ) : (
                    <HiOutlineBriefcase className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-[#000666] text-xl mb-1">{reviewingApp.companyName}</h3>
                  {reviewingApp.website && (
                    <a href={reviewingApp.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 mb-2">
                      <HiOutlineGlobeAlt className="w-3.5 h-3.5" />
                      {reviewingApp.website.replace(/https?:\/\//, "")}
                    </a>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${APPLICATION_STATUS_STYLES[reviewingApp.status].badge}`}>
                    {APPLICATION_STATUS_STYLES[reviewingApp.status].icon}
                    {APPLICATION_STATUS_STYLES[reviewingApp.status].label}
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Person</p>
                  <p className="font-bold text-slate-700 text-sm">{reviewingApp.contactPerson}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${reviewingApp.contactEmail}`} className="font-bold text-[#000666] text-sm hover:underline">
                    {reviewingApp.contactEmail}
                  </a>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="font-bold text-slate-700 text-sm">{reviewingApp.contactPhone}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Intern Slots</p>
                  <p className="font-bold text-slate-700 text-sm">{reviewingApp.activeSlots || "Not specified"}</p>
                </div>
              </div>

              {/* Description */}
              {reviewingApp.description && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the Organization</p>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4">{reviewingApp.description}</p>
                </div>
              )}

              {/* Submitted Openings (Review) */}
              {reviewingApp.hasOpenings && reviewingApp.openings && reviewingApp.openings.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Submitted Internship Openings</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 font-bold text-[#000666]">Role</th>
                          <th className="p-3 font-bold text-[#000666]">Mode</th>
                          <th className="p-3 font-bold text-[#000666]">Location</th>
                          <th className="p-3 font-bold text-[#000666] text-center">Slots</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewingApp.openings.map((op, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-700">{op.role}</td>
                            <td className="p-3 text-slate-600">{op.mode}</td>
                            <td className="p-3 text-slate-500">{op.location || "—"}</td>
                            <td className="p-3 text-[#000666] font-bold text-center">{op.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sector Tags */}
              {reviewingApp.sectorTags.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sector Focus</p>
                  <div className="flex flex-wrap gap-2">
                    {reviewingApp.sectorTags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-[#000666]/10 text-[#000666] rounded-full text-xs font-bold">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted On */}
              <p className="text-xs text-slate-400">
                Submitted on{" "}
                <strong>
                  {new Date(reviewingApp.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </strong>
              </p>

              {/* Previous admin notes */}
              {reviewingApp.adminNotes && reviewingApp.status !== "pending" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 mb-1">Previous Admin Notes</p>
                  <p className="text-sm text-slate-600">{reviewingApp.adminNotes}</p>
                </div>
              )}

              {/* Action area — only show for pending applications */}
              {reviewingApp.status === "pending" && (
                <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">
                      Admin Notes <span className="font-normal text-slate-400">(optional — included in decline email)</span>
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Add a reason for your decision, feedback for the applicant, or internal notes..."
                      className="w-full px-4 py-3 border border-[#E7E2D8] rounded-xl text-sm focus:outline-none focus:border-[#000666] resize-none transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview("decline")}
                      disabled={reviewSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {reviewSubmitting && reviewAction === "decline" ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <HiOutlineXCircle className="w-4 h-4" />
                      )}
                      Decline Application
                    </button>
                    <button
                      onClick={() => handleReview("approve")}
                      disabled={reviewSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {reviewSubmitting && reviewAction === "approve" ? (
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <HiOutlineCheckCircle className="w-4 h-4" />
                      )}
                      Approve & Add Partner
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    Approving will create an active partner organization and email the applicant.
                  </p>
                </div>
              )}

              {/* Already reviewed notice */}
              {reviewingApp.status !== "pending" && (
                <div className={`rounded-xl p-4 ${reviewingApp.status === "approved" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  <p className={`text-sm font-bold ${reviewingApp.status === "approved" ? "text-emerald-700" : "text-red-600"}`}>
                    This application was {reviewingApp.status}
                    {reviewingApp.reviewedAt ? ` on ${new Date(reviewingApp.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
                  </p>
                  {reviewingApp.adminNotes && (
                    <p className="text-xs text-slate-600 mt-1">{reviewingApp.adminNotes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
