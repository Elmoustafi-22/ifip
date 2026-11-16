"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { isAxiosError } from "axios";
import { motion, useReducedMotion } from "framer-motion";
import type { IconType } from "react-icons";
import {
  TbArrowLeft, TbArrowRight, TbBriefcase, TbBuilding, TbCheck, TbChevronDown,
  TbClipboardCheck, TbMail, TbPhoto, TbPlus, TbUser,
} from "react-icons/tb";
import RegistrationSupportFooter from "@/components/RegistrationSupportFooter";
import { useHomepageSession } from "@/components/home/MobileBottomNav";
import { submitPartnerApplication, uploadLogo } from "@/lib/api/services";
import { useFormOptions } from "@/lib/hooks/useFormOptions";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#12617e]";
const control = `w-full min-w-0 min-h-12 rounded-lg border border-[#7185a0] bg-white px-3 py-2.5 text-base text-[#101f3f] ${focus}`;
const textLink = `inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4 ${focus}`;
const action = `inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#101f3f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#24395f] motion-safe:transition-colors disabled:cursor-wait disabled:opacity-70 ${focus}`;

function PartnerShell({ children }: { children: ReactNode }) {
  const loggedIn = useHomepageSession();

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef4fa] font-sans text-[#101f3f]">
      <header className="border-b border-[#cbd8e8] bg-white">
        <div className="relative mx-auto flex min-h-[68px] max-w-[1200px] flex-wrap items-center justify-between gap-x-3 px-4 py-2 sm:px-7">
          <Link href="/" aria-label="IFIP homepage" className={focus}>
            <Image src="/images/logos/logo-full-color.png" width={160} height={44} alt="" priority className="h-9 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 text-sm">
            <details className="relative" onKeyDown={(event) => {
              if (event.key !== "Escape" || !event.currentTarget.open) return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }}>
              <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-sm font-semibold [&::-webkit-details-marker]:hidden ${focus}`}>
                Program <TbChevronDown className="size-4" aria-hidden="true" />
              </summary>
              <nav aria-label="Program links" className="absolute end-0 top-full z-10 grid w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-[#cbd8e8] bg-white p-2 shadow-lg">
                <Link className={`${textLink} px-2`} href="/#curriculum">Curriculum</Link>
                <Link className={`${textLink} px-2`} href="/#process">Process</Link>
                <Link className={`${textLink} px-2`} href="/#partners">Partners</Link>
                <Link className={`${textLink} px-2`} href="/#faq">FAQ</Link>
                {loggedIn
                  ? <Link className={`${textLink} px-2`} href="/dashboard/settings">Profile</Link>
                  : <Link className={`${textLink} px-2`} href="/apply">Apply as an intern</Link>}
              </nav>
            </details>
            <Link className={textLink} href={loggedIn ? "/dashboard" : "/login"}>{loggedIn ? "Workspace" : "Sign in"}</Link>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <RegistrationSupportFooter />
    </div>
  );
}

function FormSection({ id, title, description, icon: Icon, children }: {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-[#cbd8e8] bg-white p-4 sm:p-7">
      <div className="mb-5 flex items-start gap-3 border-b border-[#cbd8e8] pb-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e1f1fb] text-[#12617e]"><Icon className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 id={id} className="font-sans text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#43536e]">{description}</p>
        </div>
      </div>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}{optional && <span className="font-normal text-[#43536e]"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

type Opening = { role: string; mode: string; location: string; count: number | "" };
const newOpening = (): Opening => ({ role: "", mode: "Remote", location: "", count: 1 });
const needsLocation = (mode: string) => mode === "On-site" || mode === "Hybrid";

export default function PartnerApplyPage() {
  const { options: sectors, loading: loadingSectors, error: sectorError, retry: retrySectors } = useFormOptions("sector_tags");
  const reducedMotion = useReducedMotion();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [activeSlots, setActiveSlots] = useState<number | "">("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOpenings, setHasOpenings] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>(() => [newOpening()]);
  const fileInput = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const submission = useRef(false);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  useEffect(() => {
    if (error) errorMessage.current?.focus();
  }, [error]);

  useEffect(() => {
    return () => { if (logoPreview) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  function changeLogo(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    if (!file && fileInput.current) fileInput.current.value = "";
    setError(null);
  }

  function updateOpening<K extends keyof Opening>(index: number, field: K, value: Opening[K]) {
    setOpenings((current) => current.map((opening, position) => position === index ? { ...opening, [field]: value } : opening));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.current) return;
    setError(null);

    if (!companyName.trim() || !contactPerson.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError("Fill in all required fields.");
      return;
    }

    const organizationDescription = description.trim();
    if (!organizationDescription) {
      setError("Describe your organization before submitting.");
      return;
    }

    if (hasOpenings) {
      if (!openings.length) {
        setError("Add at least one opening.");
        return;
      }
      for (const [index, opening] of openings.entries()) {
        if (!opening.role.trim()) {
          setError(`Enter a role title for opening ${index + 1}.`);
          return;
        }
        if (Number(opening.count) < 1) {
          setError(`Enter at least one role for opening ${index + 1}.`);
          return;
        }
        if (needsLocation(opening.mode) && !opening.location.trim()) {
          setError(`Enter a location for opening ${index + 1}.`);
          return;
        }
      }
    }

    submission.current = true;
    setSubmitting(true);
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        try {
          logoUrl = (await uploadLogo(logoFile)).url;
        } catch {
          setError("The logo couldn’t upload. Try again or remove the logo to continue.");
          return;
        }
      }

      await submitPartnerApplication({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        website: website.trim() || undefined,
        description: organizationDescription,
        activeSlots: activeSlots !== "" ? Number(activeSlots) : undefined,
        sectorTags: selectedSectors.length > 0 ? selectedSectors : undefined,
        logoUrl,
        hasOpenings,
        openings: hasOpenings ? openings.map((opening) => ({
          role: opening.role.trim(),
          mode: opening.mode,
          location: needsLocation(opening.mode) ? opening.location.trim() : undefined,
          count: Number(opening.count),
        })) : undefined,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      setError((isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
        "We couldn’t submit your application. Your entries are still here. Try again.");
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PartnerShell>
        <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-16">
          <motion.section
            aria-labelledby="partner-success"
            className="rounded-2xl border border-[#cbd8e8] bg-white p-5 sm:p-9"
            initial={reducedMotion ? false : { y: 10, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.24 }}
          >
            <span className="mb-4 grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><TbCheck className="size-6" aria-hidden="true" /></span>
            <h1 id="partner-success" ref={successHeading} tabIndex={-1} className="font-sans text-3xl font-bold tracking-tight">Application received</h1>
            <p className="mt-3 break-words text-[#43536e]">
              We received the partnership application for <strong>{companyName.trim()}</strong>. We’ll contact you at <strong>{contactEmail.trim()}</strong> within 3–5 business days.
            </p>
            <div className="my-5 rounded-xl bg-[#eef4fa] p-4">
              <h2 className="font-sans text-base font-semibold">What happens next?</h2>
              <ol className="mt-2 list-decimal space-y-2 ps-5 text-sm text-[#43536e]">
                <li>The IFIP team reviews your application.</li>
                <li>You receive an email with the decision and next steps.</li>
                <li>If approved, your organization is listed and eligible for intern placements.</li>
              </ol>
            </div>
            <Link href="/" className={textLink}><TbArrowLeft className="size-4" aria-hidden="true" />Back to homepage</Link>
          </motion.section>
        </div>
      </PartnerShell>
    );
  }

  return (
    <PartnerShell>
      <div className="mx-auto grid max-w-[1200px] items-start gap-5 px-4 py-5 sm:px-7 sm:py-9 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.4fr)] lg:gap-8">
        <aside aria-labelledby="partner-application" className="rounded-2xl bg-[#101f3f] p-5 text-white sm:p-7 lg:p-8">
          <p className="mb-3 text-xs font-semibold tracking-widest text-[#a9e2fa] uppercase">IFIP partnerships</p>
          <h1 id="partner-application" className="font-sans text-[clamp(1.9rem,5vw,3.1rem)] leading-[1.08] font-bold tracking-tight">Become an IFIP partner.</h1>
          <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-[#d1dff2] sm:text-base">Tell us about your organization and how you’d like to host Islamic finance interns.</p>
          <ul className="mt-7 hidden space-y-3 border-t border-[#476181] pt-5 text-sm text-[#d1dff2] lg:block">
            <li className="flex items-center gap-3"><TbBuilding className="size-5 text-[#a9e2fa]" aria-hidden="true" />Describe your organization</li>
            <li className="flex items-center gap-3"><TbBriefcase className="size-5 text-[#a9e2fa]" aria-hidden="true" />Share openings, if available</li>
            <li className="flex items-center gap-3"><TbMail className="size-5 text-[#a9e2fa]" aria-hidden="true" />Provide a primary contact</li>
          </ul>
        </aside>

        <form onSubmit={handleSubmit} aria-label="Partnership application" className="grid min-w-0 gap-4 sm:gap-5">
          <fieldset disabled={submitting} className="grid min-w-0 gap-4 sm:gap-5">
            <legend className="sr-only">Application details</legend>
            <FormSection id="organization-title" title="Organization details" description="Tell us about your company and its area of focus." icon={TbBuilding}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="partner-company-name" label="Company name">
                  <input id="partner-company-name" name="companyName" autoComplete="organization" className={control} required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </Field>
                <Field id="partner-website" label="Website URL" optional>
                  <input id="partner-website" name="website" autoComplete="url" type="url" placeholder="https://example.com" className={control} value={website} onChange={(e) => setWebsite(e.target.value)} />
                </Field>
              </div>
              <Field id="partner-description" label="About the organization">
                <textarea id="partner-description" name="description" rows={4} required className={control} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <fieldset className="min-w-0">
                <legend className="text-sm font-semibold">Sectors and areas of focus <span className="font-normal text-[#43536e]">(optional)</span></legend>
                <p className="mt-1 mb-2 text-sm text-[#43536e]">Select all that apply.</p>
                {loadingSectors ? (
                  <p role="status" className="text-sm text-[#43536e]">Loading sectors…</p>
                ) : sectorError && !sectors.length ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p role="status">Sectors couldn’t load.</p>
                    <button type="button" onClick={retrySectors} className={textLink}>Try again</button>
                  </div>
                ) : sectors.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sectors.map(({ label, value }) => (
                      <label key={value} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-[#7185a0] px-3 py-2 text-sm has-checked:bg-[#e1f1fb]">
                        <input type="checkbox" name="sectorTags" value={label} checked={selectedSectors.includes(label)}
                          onChange={() => setSelectedSectors((current) => current.includes(label) ? current.filter((sector) => sector !== label) : [...current, label])}
                          className={`size-4 shrink-0 accent-[#101f3f] ${focus}`} />
                        <span className="min-w-0 break-words">{label}</span>
                      </label>
                    ))}
                  </div>
                ) : <p className="text-sm text-[#43536e]">No sectors are available.</p>}
              </fieldset>
              <Field id="partner-logo" label="Company logo" optional>
                <div className="grid min-w-0 gap-3 rounded-xl border border-dashed border-[#7185a0] bg-[#f8fbfe] p-3">
                  {logoPreview ? (
                    <div className="relative size-16"><Image src={logoPreview} alt="Selected company logo" fill unoptimized className="object-contain" /></div>
                  ) : <TbPhoto className="size-6 text-[#12617e]" aria-hidden="true" />}
                  <input ref={fileInput} id="partner-logo" type="file" accept="image/*" aria-describedby="partner-logo-hint"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) changeLogo(file); }}
                    className={`block min-h-11 w-full min-w-0 text-sm file:me-2 file:rounded-md file:border-0 file:bg-[#e1f1fb] file:px-2.5 file:py-2 file:font-semibold file:text-[#101f3f] ${focus}`} />
                  <p id="partner-logo-hint" className="text-sm text-[#43536e]">PNG, JPG or SVG. Up to 5 MB.</p>
                  {logoFile && <button type="button" onClick={() => { changeLogo(null); fileInput.current?.focus(); }} className={`${textLink} w-fit text-sm`}>Remove logo</button>}
                </div>
              </Field>
            </FormSection>

            <FormSection id="placement-title" title="Placement opportunities" description="Share your capacity and any roles you already have in mind." icon={TbBriefcase}>
              <Field id="partner-active-slots" label="Approximate number of intern slots" optional>
                <input id="partner-active-slots" name="activeSlots" type="number" min={0} className={control}
                  value={activeSlots} onChange={(e) => setActiveSlots(e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border border-[#7185a0] px-3 py-2 text-sm font-semibold has-checked:bg-[#e1f1fb]">
                <input type="checkbox" className={`size-4 shrink-0 accent-[#101f3f] ${focus}`} checked={hasOpenings}
                  onChange={(e) => setHasOpenings(e.target.checked)} />
                Add specific internship or job openings
              </label>
              {hasOpenings && (
                <div className="grid gap-3">
                  {openings.map((opening, index) => (
                    <section key={index} aria-labelledby={`opening-${index}-title`} className="grid min-w-0 gap-3 rounded-xl border border-[#cbd8e8] bg-[#eef4fa] p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-3">
                        <h3 id={`opening-${index}-title`} className="font-sans text-sm font-semibold">Opening {index + 1}</h3>
                        {openings.length > 1 && <button type="button" onClick={() => setOpenings((current) => current.filter((_, position) => position !== index))}
                          aria-label={`Remove opening ${index + 1}`} className={`${textLink} text-sm text-red-800`}>Remove</button>}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field id={`role-${index}`} label="Role title">
                          <input id={`role-${index}`} className={control} required value={opening.role} onChange={(e) => updateOpening(index, "role", e.target.value)} />
                        </Field>
                        <Field id={`count-${index}`} label="Number of roles">
                          <input id={`count-${index}`} className={control} type="number" min={1} required value={opening.count}
                            onChange={(e) => updateOpening(index, "count", e.target.value === "" ? "" : Number(e.target.value))} />
                        </Field>
                        <Field id={`mode-${index}`} label="Work mode">
                          <select id={`mode-${index}`} className={control} value={opening.mode} onChange={(e) => updateOpening(index, "mode", e.target.value)}>
                            <option value="Remote">Remote</option><option value="Hybrid">Hybrid</option><option value="On-site">On-site</option>
                          </select>
                        </Field>
                        {needsLocation(opening.mode) && (
                          <Field id={`location-${index}`} label="Location">
                            <input id={`location-${index}`} className={control} required value={opening.location} onChange={(e) => updateOpening(index, "location", e.target.value)} />
                          </Field>
                        )}
                      </div>
                    </section>
                  ))}
                  <button type="button" onClick={() => setOpenings((current) => [...current, newOpening()])} className={`${textLink} w-fit text-sm text-[#12617e]`}>
                    <TbPlus className="size-4" aria-hidden="true" />Add another opening
                  </button>
                </div>
              )}
            </FormSection>

            <FormSection id="partner-contact-title" title="Primary contact" description="We’ll use these details to follow up about the application." icon={TbUser}>
              <Field id="partner-contact-person" label="Full name">
                <input id="partner-contact-person" name="contactPerson" autoComplete="name" required className={control} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="partner-contact-email" label="Email address">
                  <input id="partner-contact-email" name="contactEmail" autoComplete="email" type="email" required className={control} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </Field>
                <Field id="partner-contact-phone" label="Phone number">
                  <input id="partner-contact-phone" name="contactPhone" autoComplete="tel" type="tel" required className={control} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </Field>
              </div>
            </FormSection>
          </fieldset>

          <div className="grid min-w-0 gap-4 rounded-2xl border border-[#cbd8e8] bg-white p-4 sm:p-6">
            <div className="flex items-start gap-2.5 text-sm leading-relaxed text-[#43536e]">
              <TbClipboardCheck className="mt-0.5 size-5 shrink-0 text-[#12617e]" aria-hidden="true" />
              <p>By submitting, you confirm that the information is accurate and that your organization is interested in hosting IFIP interns. We’ll review your application and notify you by email.</p>
            </div>
            {error && <p ref={errorMessage} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <p role="status" className="sr-only">{submitting ? "Submitting partnership application…" : ""}</p>
            <button id="partner-apply-submit" type="submit" disabled={submitting} className={action}>
              {submitting ? "Submitting application…" : "Submit partnership application"}
              {!submitting && <TbArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </PartnerShell>
  );
}
