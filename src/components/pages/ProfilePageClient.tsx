"use client";

import { useEffect, useState } from "react";

import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getApplicationCommunicationProfileFromCloud,
  saveApplicationCommunicationProfileToCloud,
} from "@/lib/supabase/application-communication-profiles";

type Tone = "formal" | "balanced" | "conversational";

const TONES: { key: Tone; label: string }[] = [
  { key: "formal", label: "Formal" },
  { key: "balanced", label: "Balanced" },
  { key: "conversational", label: "Conversational" },
];

function completenessPercent(fields: {
  fullName: string;
  currentTitle: string;
  tone: Tone | null;
  commStyle: string;
}): number {
  const checks = [
    fields.fullName.trim().length > 0,
    fields.currentTitle.trim().length > 0,
    fields.tone !== null,
    fields.commStyle.trim().length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function CircleProgress({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="#2A7A5E"
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text x="48" y="53" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
        {pct}%
      </text>
    </svg>
  );
}

export function ProfilePageClient() {
  const { isSignedIn, cloudEnabled, signInRequiredReason, user } = useWorkspace();

  // "Your details" state
  const [fullName, setFullName] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // "Cover letter voice" state
  const [tone, setTone] = useState<Tone | null>(null);
  const [commStyle, setCommStyle] = useState("");
  const [hasLoadedVoice, setHasLoadedVoice] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const email = user?.email ?? "";

  // Load details from user metadata
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata as Record<string, string> | undefined;
    setFullName(meta?.full_name ?? "");
    setCurrentTitle(meta?.current_title ?? "");
  }, [user]);

  // Load communication profile (tone + style)
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    void getApplicationCommunicationProfileFromCloud()
      .then((profile) => {
        if (cancelled) return;
        if (profile?.content) {
          // Parse stored format: "tone:<key>\n<rest>" or raw textarea content
          const raw = profile.content;
          const toneMatch = /^tone:(formal|balanced|conversational)\n?/i.exec(raw);
          if (toneMatch) {
            setTone(toneMatch[1] as Tone);
            setCommStyle(raw.slice(toneMatch[0].length));
          } else {
            setCommStyle(raw);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setVoiceError(err instanceof Error ? err.message : "Failed to load.");
      })
      .finally(() => {
        if (!cancelled) setHasLoadedVoice(true);
      });
    return () => {
      cancelled = true;
      setHasLoadedVoice(false);
    };
  }, [isSignedIn]);

  async function handleSaveDetails() {
    if (!user) return;
    setIsSavingDetails(true);
    setDetailsMessage(null);
    setDetailsError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, current_title: currentTitle },
      });
      if (error) throw new Error(error.message);
      setDetailsMessage("Details saved.");
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save details.");
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function handleSaveVoice() {
    setIsSavingVoice(true);
    setVoiceMessage(null);
    setVoiceError(null);
    try {
      const encoded = tone ? `tone:${tone}\n${commStyle}` : commStyle;
      await saveApplicationCommunicationProfileToCloud(encoded);
      setVoiceMessage("Preferences saved.");
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setIsSavingVoice(false);
    }
  }

  const pct = completenessPercent({ fullName, currentTitle, tone, commStyle });

  const cardClass =
    "rounded-xl border border-[#D8ECC8] bg-white p-4";

  const inputClass =
    "w-full rounded-lg border border-[#D8ECC8] bg-white px-3 py-2 text-sm text-[#1c1c1a] placeholder-[#9eaaa3] focus:border-[#2A7A5E] focus:outline-none focus:ring-1 focus:ring-[#2A7A5E]";

  const ghostTealBtn =
    "rounded-lg border border-[#2A7A5E] px-4 py-2 text-sm font-medium text-[#2A7A5E] transition hover:bg-[#f0faf6] disabled:opacity-50";

  return (
    <div className="max-w-[720px] space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-[#1c1c1a]">
          Profile
        </h1>
        <p className="mt-1 text-sm text-[#6f7973]">
          Manage your identity and communication preferences.
        </p>
      </div>

      {!isSignedIn && cloudEnabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {signInRequiredReason}
        </p>
      ) : null}

      {/* Section 1 — Your details */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          {/* Person icon — sage tint */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A7A5E" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <h2 className="text-[15px] font-semibold text-[#1c1c1a]">Your details</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#3f4944]">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              disabled={!isSignedIn}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#3f4944]">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={`${inputClass} cursor-not-allowed bg-[#f5f7f5] text-[#6f7973]`}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-[#3f4944]">Current title</label>
          <input
            type="text"
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            placeholder="e.g., Senior Product Designer"
            disabled={!isSignedIn}
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {detailsMessage ? <p className="text-xs text-[#2A7A5E]">{detailsMessage}</p> : null}
          {detailsError ? <p className="text-xs text-red-600">{detailsError}</p> : null}
          <button
            type="button"
            onClick={() => void handleSaveDetails()}
            disabled={isSavingDetails || !isSignedIn}
            className={ghostTealBtn}
          >
            {isSavingDetails ? "Saving…" : "Save details"}
          </button>
        </div>
      </div>

      {/* Section 2 — Cover letter voice */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          {/* Speech/voice icon — terracotta tint */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="text-[15px] font-semibold text-[#1c1c1a]">Cover letter voice</h2>
        </div>
        <p className="mt-1 text-xs text-[#6f7973]">How do you want to sound?</p>

        {/* Tone segmented control */}
        <div className="mt-4">
          <div className="inline-flex rounded-lg border border-[#D8ECC8] bg-[#f5f7f5] p-1 gap-1">
            {TONES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTone(t.key)}
                disabled={!isSignedIn}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                  tone === t.key
                    ? "bg-[#2A7A5E] text-white"
                    : "text-[#6f7973] hover:text-[#1c1c1a]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-[#3f4944]">
            Anything else about your communication style?
          </label>
          {!isSignedIn ? (
            <p className="text-sm text-[#6f7973]">Sign in to edit your communication profile.</p>
          ) : !hasLoadedVoice ? (
            <p className="text-sm text-[#6f7973]">Loading…</p>
          ) : (
            <textarea
              value={commStyle}
              onChange={(e) => setCommStyle(e.target.value)}
              rows={5}
              placeholder="e.g., I prefer short punchy sentences and avoid corporate jargon…"
              className={`${inputClass} resize-none`}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {voiceMessage ? <p className="text-xs text-[#2A7A5E]">{voiceMessage}</p> : null}
          {voiceError ? <p className="text-xs text-red-600">{voiceError}</p> : null}
          <button
            type="button"
            onClick={() => void handleSaveVoice()}
            disabled={isSavingVoice || !isSignedIn}
            className={ghostTealBtn}
          >
            {isSavingVoice ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>

      {/* Section 3 — Completeness card */}
      <div className="rounded-xl bg-[#085041] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="inline-block rounded-full bg-[#D8ECC8] px-3 py-1 text-xs font-semibold text-[#085041]">
              Profile is {pct}% complete
            </span>
            <h2 className="mt-3 text-[17px] font-semibold text-white">
              Enhance your application odds
            </h2>
            <p className="mt-1.5 text-sm text-white/70">
              A complete profile lets Folio tailor your resume and cover letter more accurately. Add your title, preferred tone, and communication style to get the best results.
            </p>
          </div>
          <div className="shrink-0">
            <CircleProgress pct={pct} />
          </div>
        </div>
      </div>
    </div>
  );
}
