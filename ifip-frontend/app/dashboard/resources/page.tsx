"use client";

import { useState, useEffect } from "react";
import { 
  HiOutlineArrowDownTray, 
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentText,
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineClock
} from "react-icons/hi2";
import { getMyApplication, getCohortConfig } from "@/lib/api/services";

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: "guidelines" | "templates" | "supplements";
  fileType: "pdf" | "docx" | "xlsx";
  fileSize: string;
}

const RESOURCES_DATA: ResourceItem[] = [
  {
    id: "res-1",
    title: "AAOIFI Shari'ah Standards Guide",
    description: "Detailed compendium covering the Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI) core standards.",
    category: "guidelines",
    fileType: "pdf",
    fileSize: "4.2 MB"
  },
  {
    id: "res-2",
    title: "IFSB Guiding Principles on Risk Management",
    description: "Regulatory risk assessment framework for institutions offering exclusively Islamic financial services.",
    category: "guidelines",
    fileType: "pdf",
    fileSize: "2.8 MB"
  },
  {
    id: "res-3",
    title: "IFIP Internship Work Journal Template",
    description: "Standardized weekly work journal log required for submission at the end of the placement lifecycle.",
    category: "templates",
    fileType: "docx",
    fileSize: "1.1 MB"
  },
  {
    id: "res-4",
    title: "Research Project Report Structuring Guide",
    description: "Formatting and guidelines manual for composing research projects and case-study reviews.",
    category: "templates",
    fileType: "pdf",
    fileSize: "1.4 MB"
  },
  {
    id: "res-5",
    title: "Shari'ah Audit Checklist Template",
    description: "Practical excel checklist for conducting compliance auditing simulations inside Islamic banks.",
    category: "templates",
    fileType: "xlsx",
    fileSize: "850 KB"
  },
  {
    id: "res-6",
    title: "Recommended Reading List: Islamic Banking Contracts",
    description: "Curated collection of readings and textbooks detailing Mudarabah, Musharakah, and Ijarah agreements.",
    category: "supplements",
    fileType: "pdf",
    fileSize: "980 KB"
  },
  {
    id: "res-7",
    title: "Case Study: Structuring Murabaha vs. Musawamah",
    description: "Comparative structural analysis showing step-by-step transaction flow, cost disclosures, and risk profiles.",
    category: "supplements",
    fileType: "pdf",
    fileSize: "1.7 MB"
  }
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "guidelines" | "templates" | "supplements">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [cohortStartDate, setCohortStartDate] = useState("2026-08-31T00:00:00.000Z");
  const [dashboardViewOverride, setDashboardViewOverride] = useState<string>("default");

  useEffect(() => {
    const fetchResourcesPageData = async () => {
      try {
        const [profile, config] = await Promise.all([
          getMyApplication(),
          getCohortConfig()
        ]);
        setUserData(profile);
        setCohortStartDate(config.cohortStartDate);
        setDashboardViewOverride(config.dashboardViewOverride || "default");
      } catch (err) {
        console.error("Failed to load resources page parameters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResourcesPageData();
  }, []);

  const getIsLaunched = () => {
    if (userData?.role === "admin" || userData?.role === "superadmin") return true;
    if (dashboardViewOverride === "unlocked") return true;
    if (dashboardViewOverride === "coming_soon") return false;
    return new Date() >= new Date(cohortStartDate);
  };

  const isLaunched = getIsLaunched();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "guidelines":
        return <HiOutlineAcademicCap className="w-5 h-5 text-indigo-650" />;
      case "templates":
        return <HiOutlineDocumentText className="w-5 h-5 text-amber-600" />;
      default:
        return <HiOutlineBookOpen className="w-5 h-5 text-emerald-600" />;
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

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case "pdf":
        return <span className="bg-red-50 border border-red-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">PDF</span>;
      case "docx":
        return <span className="bg-blue-50 border border-blue-100 text-sky-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">DOCX</span>;
      default:
        return <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase">XLSX</span>;
    }
  };

  const handleDownload = (res: ResourceItem) => {
    // Generate static file content to trigger downloads since actual files don't live in public folder
    const dummyContent = `Islamic Finance Internship Program\nResource: ${res.title}\nFormat: ${res.fileType.toUpperCase()}\nSize: ${res.fileSize}\n\nThis is a placeholder for the curated study materials.`;
    const blob = new Blob([dummyContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${res.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${res.fileType}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg className="animate-spin w-8 h-8 text-[#000666]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 font-medium text-sm">Loading catalog parameters...</p>
      </div>
    );
  }

  if (!isLaunched) {
    const formatCohortDate = (isoString: string) => {
      try {
        const d = new Date(isoString);
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
            Program handouts, reference textbooks, and journal templates are currently locked. Access will be unlocked on program launch day:{" "}
            <strong className="text-[#000666]">{formatCohortDate(cohortStartDate)}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const filteredResources = RESOURCES_DATA.filter((res) => {
    const matchesCategory = activeTab === "all" || res.category === activeTab;
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#000666] tracking-tight mb-2">Resource Library</h1>
        <p className="text-slate-500 text-sm sm:text-base">Access industry standards, templates, and supplemental reading worksheets.</p>
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
        {/* Search */}
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

        {/* Filters */}
        <div className="flex bg-[#000666]/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto text-[10px] uppercase font-bold shrink-0">
          {(["all", "guidelines", "templates", "supplements"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors text-center shrink-0 flex-1 sm:flex-initial ${
                activeTab === tab 
                  ? "bg-[#000666] text-white" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredResources.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium italic">
            No resources found matching the criteria.
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="bg-white border border-[#E7E2D8] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 hover:translate-y-[-1px]"
            >
              {/* Category Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                res.category === "guidelines" ? "bg-indigo-500" : res.category === "templates" ? "bg-amber-500" : "bg-emerald-500"
              }`} />

              <div>
                {/* Header info */}
                <div className="flex justify-between items-center mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getCategoryColor(res.category)}`}>
                    {getCategoryIcon(res.category)}
                    {res.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getFileTypeBadge(res.fileType)}
                    <span className="text-[10px] text-slate-400 font-bold">{res.fileSize}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#000666] font-display leading-tight mb-2">
                  {res.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  {res.description}
                </p>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-400 font-bold">Standard Reference</span>
                <button
                  onClick={() => handleDownload(res)}
                  className="flex items-center gap-1 bg-[#00B0FF] hover:bg-[#00B0FF]/90 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <HiOutlineArrowDownTray className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
