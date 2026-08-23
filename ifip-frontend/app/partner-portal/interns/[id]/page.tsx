"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineAcademicCap,
  HiOutlineCheckBadge,
  HiOutlineBriefcase,
  HiOutlineDocumentText,
  HiOutlineLink,
  HiOutlineGlobeAlt,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlinePaperAirplane,
  HiOutlineUserCircle,
  HiOutlineXMark,
} from "react-icons/hi2";
import { getInternProfile, expressInterest, InternFullProfile } from "@/lib/api/partner";

export default function InternProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const router = useRouter();

  const [profile, setProfile] = useState<InternFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getInternProfile(userId);
        setProfile(data);
      } catch (err: any) {
        console.error("Failed to load intern profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleExpressInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await expressInterest(userId, note);
      setSuccessMsg("Interest request submitted successfully! IFIP admissions will review your request.");
      setShowNoteModal(false);
      // Refresh profile
      const updated = await getInternProfile(userId);
      setProfile(updated);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to express interest. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-slate-200/70 rounded-lg" />
        <div className="h-48 bg-slate-200/70 rounded-2xl" />
        <div className="h-64 bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <HiOutlineExclamationCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Candidate Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          This candidate profile is not available or not placement-ready.
        </p>
        <Link
          href="/partner-portal/interns"
          className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          <span>Back to Roster</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/partner-portal/interns"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        <span>Back to Intern Pool</span>
      </Link>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center space-x-2 font-medium">
          <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center space-x-2 font-medium">
          <HiOutlineExclamationCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-5">
            {profile.avatarUrl ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 shrink-0">
                <Image src={profile.avatarUrl} alt={profile.fullName} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-800 text-emerald-400 font-bold text-2xl flex items-center justify-center border-2 border-slate-700 shrink-0">
                {profile.fullName?.charAt(0) || "I"}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{profile.fullName}</h1>
                {profile.country && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    {profile.country}
                  </span>
                )}
              </div>

              {/* Assessment Score Badge */}
              <div className="mt-2 flex items-center space-x-2 flex-wrap gap-y-1">
                {profile.assessment.status === "passed" ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <HiOutlineCheckBadge className="w-4 h-4 text-emerald-600" />
                    <span>Passed Evaluation ({profile.assessment.score ?? 100}%)</span>
                  </span>
                ) : profile.assessment.score !== null ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <HiOutlineAcademicCap className="w-4 h-4 text-slate-500" />
                    <span>Evaluation Score ({profile.assessment.score}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    <HiOutlineClock className="w-4 h-4 text-slate-400" />
                    <span>Pending Evaluation</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button / Request Status */}
          <div className="shrink-0">
            {profile.isPlaced ? (
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center space-x-2">
                <HiOutlineCheckCircle className="w-4 h-4 text-slate-500" />
                <span>Candidate Already Placed</span>
              </div>
            ) : profile.interestStatus === "approved" ? (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Placement Approved &amp; Matched</span>
              </div>
            ) : profile.interestStatus === "pending" ? (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center space-x-2">
                <HiOutlineClock className="w-4 h-4 text-amber-600" />
                <span>Interest Request Pending Admin Review</span>
              </div>
            ) : profile.interestStatus === "declined" ? (
              <div className="flex flex-col items-end space-y-2">
                <span className="text-xs text-rose-600 font-semibold">Previous Request Declined</span>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <HiOutlinePaperAirplane className="w-4 h-4" />
                  <span>Re-Express Interest</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNoteModal(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <HiOutlinePaperAirplane className="w-4 h-4" />
                <span>Express Interest in Candidate</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academic & Skills */}
        <div className="lg:col-span-2 space-y-6">
          {/* Motivation Statement */}
          {profile.motivation && (profile.motivation.whyApplying || profile.motivation.careerGoals) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <HiOutlineUserCircle className="w-4 h-4 text-emerald-600" />
                <span>Motivation &amp; Career Statement</span>
              </h2>
              {profile.motivation.whyApplying && (
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-slate-700 mb-1">Why Applying</h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {profile.motivation.whyApplying}
                  </p>
                </div>
              )}
              {profile.motivation.careerGoals && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-1">Career Aspirations</h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {profile.motivation.careerGoals}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Program Interests */}
          {profile.programInterests.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Program Areas of Interest
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.programInterests.map((interest, idx) => {
                  const isMatch = profile.matchedInterests?.includes(interest);
                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        isMatch
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {interest}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Academic Background */}
          {profile.academic && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <HiOutlineAcademicCap className="w-4 h-4 text-emerald-600" />
                <span>Academic Information</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {profile.academic.institution && (
                  <div>
                    <span className="text-slate-400 font-semibold block">Institution</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{profile.academic.institution}</span>
                  </div>
                )}
                {profile.academic.fieldOfStudy && (
                  <div>
                    <span className="text-slate-400 font-semibold block">Field of Study</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{profile.academic.fieldOfStudy}</span>
                  </div>
                )}
                {profile.academic.qualification && (
                  <div>
                    <span className="text-slate-400 font-semibold block">Qualification</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{profile.academic.qualification}</span>
                  </div>
                )}
                {profile.academic.gradYear && (
                  <div>
                    <span className="text-slate-400 font-semibold block">Graduation Year</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{profile.academic.gradYear}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills & Tools */}
          {profile.skills && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <HiOutlineBriefcase className="w-4 h-4 text-emerald-600" />
                <span>Skills &amp; Technical Tools</span>
              </h2>
              <div className="space-y-3">
                {profile.skills.relevantSkills && profile.skills.relevantSkills.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block mb-1.5">Relevant Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.relevantSkills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.skills.tools && profile.skills.tools.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block mb-1.5">Tools &amp; Software</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.tools.map((t, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Professional Documents & Contact Details */}
        <div className="space-y-6">
          {/* Professional Documents */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <HiOutlineDocumentText className="w-4 h-4 text-emerald-600" />
              <span>Professional Credentials</span>
            </h2>
            <div className="space-y-3 text-xs">
              {profile.cvUrl ? (
                <a
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors font-medium"
                >
                  <span className="flex items-center space-x-2">
                    <HiOutlineDocumentText className="w-4 h-4 text-emerald-600" />
                    <span>Curriculum Vitae (CV)</span>
                  </span>
                  <HiOutlineLink className="w-4 h-4 text-slate-400" />
                </a>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 text-slate-400 border border-slate-200 text-center">
                  CV document not attached
                </div>
              )}

              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors font-medium"
                >
                  <span className="flex items-center space-x-2">
                    <HiOutlineGlobeAlt className="w-4 h-4 text-blue-600" />
                    <span>LinkedIn Profile</span>
                  </span>
                  <HiOutlineLink className="w-4 h-4 text-slate-400" />
                </a>
              )}

              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors font-medium"
                >
                  <span className="flex items-center space-x-2">
                    <HiOutlineGlobeAlt className="w-4 h-4 text-emerald-600" />
                    <span>Portfolio / Work Samples</span>
                  </span>
                  <HiOutlineLink className="w-4 h-4 text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* Contact Details Gated Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <HiOutlineEnvelope className="w-4 h-4 text-emerald-600" />
              <span>Contact Information</span>
            </h2>

            {profile.email ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-slate-500 font-semibold block mb-0.5">Email Address</span>
                  <a href={`mailto:${profile.email}`} className="text-emerald-800 font-bold hover:underline">
                    {profile.email}
                  </a>
                </div>
                {profile.phone && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-slate-500 font-semibold block mb-0.5">Phone Number</span>
                    <a href={`tel:${profile.phone}`} className="text-emerald-800 font-bold hover:underline">
                      {profile.phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <HiOutlineLockClosed className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Contact Details Hidden</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Candidate email and phone number are revealed immediately after IFIP admissions approves your interest request.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note Modal for Expressing Interest */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <HiOutlinePaperAirplane className="w-5 h-5 text-emerald-600" />
                <span>Express Interest in {profile.fullName}</span>
              </h2>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Submit your request to IFIP admissions. You may include an optional note explaining why this candidate fits your organization&apos;s opening.
            </p>

            <form onSubmit={handleExpressInterest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Note for IFIP Admin
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g., Fits our Sukuk structuring opening for Q3..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Confirm & Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
