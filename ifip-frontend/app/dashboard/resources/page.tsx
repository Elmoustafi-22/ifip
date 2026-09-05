"use client";

import { useState, useEffect } from "react";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentText,
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineClock,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineLink,
  HiOutlinePlayCircle,
} from "react-icons/hi2";
import {
  getMyApplication,
  getCohortConfig,
  getResources,
  Resource,
} from "@/lib/api/services";

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "guidelines" | "templates" | "supplements">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [profile, config] = await Promise.all([
          getMyApplication(),
          getCohortConfig(),
        ]);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
      } catch (err) {
        console.error("Failed to load page parameters:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const getIsLaunched = () => {
    if (userData?.role === "admin" || userData?.role === "superadmin") return true;
    if (dashboardViewOverride === "unlocked") return true;
    if (dashboardViewOverride === "coming_soon") return false;
    return new Date() >= new Date(cohortStartDate);
  };

  const isLaunched = getIsLaunched();

  // Fetch resources from API once launched
  useEffect(() => {
    if (!isLaunched) return;
    const fetchResources = async () => {
      setResourcesLoading(true);
      try {
        const params: any = {};
        if (activeTab !== "all") params.category = activeTab;
        const res = await getResources(params);
        setResources(res);
      } catch (err) {
        console.error("Failed to fetch resources:", err);
      } finally {
        setResourcesLoading(false);
      }
    };
    fetchResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLaunched, activeTab]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "guidelines":
        return <HiOutlineAcademicCap className="w-4 h-4 text-indigo-600" />;
      case "templates":
        return <HiOutlineDocumentText className="w-4 h-4 text-amber-600" />;
      default:
        return <HiOutlineBookOpen className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "guidelines":
        return "bg-indigo-50 border-indigo-100 text-indigo-700";
      case "templates":
        return "bg-amber-50 border-amber-100 text-amber-700";
      default:
        return "bg-emerald-50 border-emerald-100 text-emerald-700";
    }
  };

  const getCategoryAccent = (category: string) => {
    switch (category) {
      case "guidelines": return "bg-indigo-500";
      case "templates": return "bg-amber-500";
      default: return "bg-emerald-500";
    }
  };

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case "pdf":
        return <span className="bg-red-50 border border-red-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">PDF</span>;
      case "docx":
        return <span className="bg-blue-50 border border-blue-100 text-sky-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">DOCX</span>;
      case "xlsx":
        return <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">XLSX</span>;
      case "link":
        return <span className="bg-purple-50 border border-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase flex items-center gap-0.5"><HiOutlineLink className="w-3 h-3" />Link</span>;
      case "video":
        return <span className="bg-orange-50 border border-orange-200 text-orange-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase flex items-center gap-0.5"><HiOutlinePlayCircle className="w-3 h-3" />Video</span>;
      default:
        return <span className="bg-slate-50 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{type.toUpperCase()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading…</p>
      </div>
    );
  }

  if (!isLaunched) {
    const formatCohortDate = (isoString: string) => {
      try {
        return new Date(isoString).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });
      } catch {
        return "August 31, 2026";
      }
    };
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/50 p-6 md:p-12 lg:p-16 flex flex-col items-center text-center mx-auto shadow-sm select-none">
          <svg className="w-16 h-16 text-sky-400/70 mb-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12M6 22h12M6 2c0 4 3 6 3 10s-3 6-3 10M18 2c0 4-3 6-3 10s3 6 3 10M9 8h6M10 16h4" />
          </svg>
          <div className="bg-[#000666] text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest select-none mb-6">
            <HiOutlineClock className="w-3.5 h-3.5" /> Coming Soon
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-black text-[#000666] mb-4">Resource Center</h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-8 font-medium">
            Program handouts, reference textbooks, and journal templates are currently locked. Access will be
            unlocked on program launch day:{" "}
            <strong className="text-[#000666]">{formatCohortDate(cohortStartDate)}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Resource Library</h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Access industry standards, templates, and supplemental reading worksheets.
        </p>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E7E2D8] bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#000666]/30 text-slate-800"
          />
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex bg-[#000666]/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto text-[10px] uppercase font-bold shrink-0">
          {(["all", "guidelines", "templates", "supplements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors text-center shrink-0 flex-1 sm:flex-initial ${
                activeTab === tab ? "bg-[#000666] text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {resourcesLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <svg className="animate-spin w-6 h-6 text-[#000666]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-slate-500 text-sm font-medium">Loading resources…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredResources.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 font-medium italic">
              No resources found matching the criteria.
            </div>
          ) : (
            filteredResources.map((res) => (
              <div
                key={res._id}
                className="bg-white border border-[#E7E2D8] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 hover:translate-y-[-1px]"
              >
                {/* Category accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${getCategoryAccent(res.category)}`} />

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getCategoryColor(res.category)}`}>
                      {getCategoryIcon(res.category)}
                      {res.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getFileTypeBadge(res.fileType)}
                      {res.fileSize && <span className="text-[10px] text-slate-400 font-bold">{res.fileSize}</span>}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#000666] font-display leading-tight mb-2">
                    {res.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    {res.description}
                  </p>
                </div>

                {/* Action */}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    {res.category === "guidelines"
                      ? "Standard Reference"
                      : res.category === "templates"
                      ? "Downloadable Template"
                      : "Supplemental Reading"}
                  </span>
                  {res.fileUrl && (
                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                        res.fileType === "video"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-[#000666] hover:bg-[#000666]/90 text-white"
                      }`}
                    >
                      {res.fileType === "video" ? (
                        <HiOutlinePlayCircle className="w-4 h-4" />
                      ) : res.fileType === "link" ? (
                        <HiOutlineLink className="w-4 h-4" />
                      ) : (
                        <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                      )}
                      {res.fileType === "video" ? "Watch Recording" : res.fileType === "link" ? "Open Link" : "Open"}
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
