"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { resolveLandingCtaHref } from "@/lib/navigation/landing-cta";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadResumeInventoryFromCloud } from "@/lib/supabase/resume-inventories";
import { primaryButtonClassName } from "@/components/setup/ui";

export function LandingCta({ variant = "default" }: { variant?: "default" | "hero" }) {
  const [href, setHref] = useState<"/setup" | "/generate">("/setup");

  useEffect(() => {
    let cancelled = false;

    async function resolveHref() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setHref("/setup");
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const isSignedIn = Boolean(data.session);

        if (!isSignedIn) {
          if (!cancelled) setHref("/setup");
          return;
        }

        const cloudInventory = await loadResumeInventoryFromCloud();
        const hasInventory = (cloudInventory?.inventory.resumes.length ?? 0) > 0;
        if (!cancelled) {
          setHref(
            resolveLandingCtaHref({
              cloudEnabled: true,
              isSignedIn,
              hasInventory,
            }),
          );
        }
      } catch {
        if (!cancelled) setHref("/setup");
      }
    }

    void resolveHref();
    return () => {
      cancelled = true;
    };
  }, []);

  const buttonClass =
    variant === "hero"
      ? `${primaryButtonClassName} min-h-12 px-8 py-3 text-base font-semibold shadow-lg shadow-cyan-950/30 ring-2 ring-white/20 hover:bg-slate-800`
      : primaryButtonClassName;

  return (
    <div className={variant === "hero" ? "" : "mt-8"}>
      <Link href={href} className={`inline-flex ${buttonClass}`}>
        Customize your resume now
      </Link>
    </div>
  );
}
