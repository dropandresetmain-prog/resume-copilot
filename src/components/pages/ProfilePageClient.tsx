"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import {
  formFieldClassName,
  primaryButtonClassName,
  SetupCard,
} from "@/components/setup/ui";
import { pageMilestone } from "@/lib/app-version";
import {
  getApplicationCommunicationProfileFromCloud,
  saveApplicationCommunicationProfileToCloud,
} from "@/lib/supabase/application-communication-profiles";

export function ProfilePageClient() {
  const { isSignedIn, cloudEnabled, signInRequiredReason } = useWorkspace();
  const [content, setContent] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isLoading = isSignedIn && !hasLoaded;

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let cancelled = false;
    void getApplicationCommunicationProfileFromCloud()
      .then((profile) => {
        if (!cancelled) {
          setContent(profile?.content ?? "");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load communication profile.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHasLoaded(true);
        }
      });

    return () => {
      cancelled = true;
      setHasLoaded(false);
    };
  }, [isSignedIn]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveApplicationCommunicationProfileToCloud(content);
      setMessage("Application Communication Profile saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save communication profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        milestone={pageMilestone("Profile")}
        title="Application Communication Profile"
        description="Paste your positioning, tone preferences, story bank, and writing rules. Used for cover letters and outreach generation."
      />

      {!isSignedIn && cloudEnabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {signInRequiredReason}
        </p>
      ) : null}

      <SetupCard
        title="Profile content"
        description="One editable blob for now — career positioning, narrative themes, story execution status, and risk boundaries."
      >
        {!isSignedIn ? (
          <p className="mt-4 text-sm text-slate-600">Sign in to edit your communication profile.</p>
        ) : isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading profile…</p>
        ) : (
          <>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={24}
              placeholder="Paste your Application Communication Profile here…"
              className={`${formFieldClassName} mt-4 font-mono text-sm leading-6`}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className={primaryButtonClassName}
              >
                {isSaving ? "Saving…" : "Save profile"}
              </button>
              <Link href="/generate" className="text-sm font-medium text-blue-700 underline">
                Go to Generate
              </Link>
            </div>
            {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          </>
        )}
      </SetupCard>

      <p className="text-xs text-slate-500">
        <Link href="/dev-tools" className="font-medium text-blue-700 underline">
          Developer tools
        </Link>{" "}
        (not shown in main navigation)
      </p>
    </>
  );
}
