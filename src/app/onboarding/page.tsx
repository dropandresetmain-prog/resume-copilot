"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/supabase/auth";
import { parseDocxResume } from "@/lib/parser/docx-parser";
import { upsertResume } from "@/lib/inventory/inventory";
import { saveResumeInventoryToCloud } from "@/lib/supabase/resume-inventories";
import { createEmptyInventoryEdits } from "@/types/inventory-edits";
import { createEmptyEnrichmentState } from "@/lib/enrichment/state";

type VaultMethod = "upload" | "linkedin" | "scratch" | null;

// ── Step tracker ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Let's build your vault", "Upload your resume", "About you"];
const STEP_SUBS = [
  "Your career history is the foundation of every perfect application. How should we begin?",
  "Upload a .docx resume and we'll parse it into your career vault.",
  "Just a couple of details to personalize your experience.",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<VaultMethod>(null);

  // Step 2 — upload
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "parsing" | "saving" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  // Step 3 — profile
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Step 1: pick method ───────────────────────────────────────────────────

  function handleMethodSelect(m: VaultMethod) {
    setMethod(m);
    if (m === "upload") setStep(2);
    else setStep(3); // linkedin / scratch skip upload step
  }

  // ── Step 2: upload ────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  async function handleUploadContinue() {
    if (!file) {
      // Skip upload — proceed without parsing
      setStep(3);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setUploadError("Only .docx files are supported. You can add other formats in Career Vault after setup.");
      return;
    }

    setUploadError("");
    setUploadStatus("parsing");
    try {
      const parsed = await parseDocxResume(file);
      setUploadStatus("saving");
      const emptyInventory = {
        resumes: [],
        failures: [],
        enrichment: createEmptyEnrichmentState(),
        edits: createEmptyInventoryEdits(),
      };
      const merged = upsertResume(emptyInventory, parsed);
      await saveResumeInventoryToCloud(merged);
      setUploadStatus("done");
      setStep(3);
    } catch (err: unknown) {
      setUploadStatus("error");
      setUploadError(
        err instanceof Error ? err.message : "Could not parse your resume. You can add it in Career Vault after setup."
      );
    }
  }

  // ── Step 3: finish ────────────────────────────────────────────────────────

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setFormError("Full name is required."); return; }
    if (!targetRole.trim()) { setFormError("Target role is required."); return; }
    setFormError("");
    setSaving(true);
    try {
      const user = await getCurrentUser();
      const supabase = getSupabaseClient();
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        target_role: targetRole.trim(),
        seniority: seniority.trim() || null,
        vault_method: method,
        onboarded: true,
        updated_at: new Date().toISOString(),
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  const progressStep = step === 1 ? 1 : step === 2 ? 2 : 3;
  const isBusy = uploadStatus === "parsing" || uploadStatus === "saving";

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-12 pb-16 bg-folio-surface">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4">
        <FolioIcon />
        <span className="text-[20px] font-bold text-folio-primary">Folio</span>
      </div>

      {/* Progress */}
      <p className="text-[11px] font-medium tracking-widest text-folio-outline uppercase mb-10">
        Progress {progressStep}/3
      </p>

      {/* Heading */}
      <h1 className="text-[22px] font-medium text-folio-on-surface text-center mb-2">
        {STEP_LABELS[step - 1]}
      </h1>
      <p className="text-[14px] text-folio-on-surface-variant text-center max-w-md mb-10">
        {STEP_SUBS[step - 1]}
      </p>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="flex gap-4 w-full max-w-[760px]">
          <OptionCard
            selected={method === "upload"}
            onClick={() => handleMethodSelect("upload")}
            icon={<UploadIcon />}
            iconBg="bg-folio-primary-container/15"
            iconColor="text-folio-primary"
            title="Upload a resume"
            titleColor="text-folio-primary"
            caption="DocX format"
          />
          <OptionCard
            selected={method === "linkedin"}
            onClick={() => handleMethodSelect("linkedin")}
            icon={<LinkedInIcon />}
            iconBg="bg-folio-secondary-container/20"
            iconColor="text-folio-cta-secondary"
            title="Import from LinkedIn"
            titleColor="text-folio-cta-secondary"
            caption="Sync your profile"
          />
          <OptionCard
            selected={method === "scratch"}
            onClick={() => handleMethodSelect("scratch")}
            icon={<ScratchIcon />}
            iconBg="bg-folio-outline-variant/30"
            iconColor="text-folio-on-surface-variant"
            title="Start from scratch"
            titleColor="text-folio-on-surface"
            caption="Build it manually"
          />
        </div>
      )}

      {/* ── Step 2: Upload ── */}
      {step === 2 && (
        <div className="w-full max-w-[480px]">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isBusy && fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 h-48 rounded-[12px] border-2 border-dashed cursor-pointer transition-colors ${isBusy ? "opacity-60 cursor-not-allowed" : ""} ${dragging ? "border-folio-primary-container bg-folio-primary-container/5" : "border-folio-outline-variant hover:border-folio-primary-container"}`}
          >
            {isBusy ? (
              <p className="text-[14px] text-folio-on-surface-variant">
                {uploadStatus === "parsing" ? "Parsing resume…" : "Saving to vault…"}
              </p>
            ) : file ? (
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-folio-on-surface">{file.name}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); setUploadError(""); setUploadStatus("idle"); }}
                  className="text-folio-outline hover:text-folio-error transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-folio-primary-container/15 flex items-center justify-center text-folio-primary">
                  <UploadIcon />
                </div>
                <p className="text-[14px] text-folio-on-surface-variant">Drag and drop or click to browse</p>
                <p className="text-[12px] text-folio-outline">.docx files only</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setUploadError(""); setUploadStatus("idle"); }}
          />

          {uploadError && (
            <p className="mt-3 text-[12px] text-folio-error">{uploadError}</p>
          )}

          <div className="flex justify-between mt-6">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => { setStep(3); }}
              className="text-[13px] text-folio-outline hover:text-folio-on-surface transition-colors disabled:opacity-40"
            >
              Skip for now
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleUploadContinue}
              className="h-10 px-6 rounded-[8px] bg-folio-cta-secondary text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isBusy ? "Processing…" : file ? "Upload and continue" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Profile ── */}
      {step === 3 && (
        <form onSubmit={handleFinish} noValidate className="w-full max-w-[400px] flex flex-col gap-4">
          {method === "upload" && uploadStatus === "done" && (
            <p className="text-[12px] text-folio-primary bg-folio-primary-container/10 rounded-lg px-3 py-2">
              Resume parsed and saved to your career vault.
            </p>
          )}
          {method === "upload" && uploadStatus === "error" && (
            <p className="text-[12px] text-folio-outline bg-folio-surface-container-low rounded-lg px-3 py-2">
              Resume could not be parsed — you can add it in Career Vault after setup.
            </p>
          )}
          {formError && <p className="text-[12px] text-folio-error">{formError}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-folio-on-surface-variant" htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-folio-on-surface-variant" htmlFor="target-role">Target role</label>
            <input
              id="target-role"
              type="text"
              placeholder="e.g. Senior Product Manager"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface placeholder:text-folio-outline focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-folio-on-surface-variant" htmlFor="seniority">Seniority</label>
            <select
              id="seniority"
              value={seniority}
              onChange={e => setSeniority(e.target.value)}
              className="h-11 rounded-[8px] border border-folio-outline-variant bg-white px-3 text-[14px] text-folio-on-surface focus:outline-none focus:border-folio-primary-container focus:ring-1 focus:ring-folio-primary-container"
            >
              <option value="">Select level</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead / Staff</option>
              <option value="director">Director+</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-[8px] bg-folio-cta-secondary text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {saving ? "Setting up…" : "Finish setup"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({
  selected, onClick, icon, iconBg, iconColor, title, titleColor, caption,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  titleColor: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-4 p-8 rounded-[12px] border bg-white transition-all text-left ${selected ? "border-folio-primary-container ring-1 ring-folio-primary-container" : "border-folio-outline-variant/50 hover:border-folio-primary-container/50"}`}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="text-center">
        <p className={`text-[16px] font-medium ${titleColor}`}>{title}</p>
        <p className="text-[12px] text-folio-outline mt-1">{caption}</p>
      </div>
    </button>
  );
}

function FolioIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--color-folio-primary)" strokeWidth="1.5"/>
      <path d="M7 4V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="var(--color-folio-primary)" strokeWidth="1.5"/>
      <path d="M12 10v4M10 12h4" stroke="var(--color-folio-primary)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <polyline points="9 15 12 12 15 15"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8.5 10v6M8.5 8v.5M11.5 16v-3.5a2 2 0 0 1 4 0V16M11.5 10v6"/>
    </svg>
  );
}

function ScratchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
