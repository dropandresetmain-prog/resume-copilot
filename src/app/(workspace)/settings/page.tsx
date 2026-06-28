"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  full_name: string | null;
  target_role: string | null;
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, target_role")
          .eq("id", u.id)
          .maybeSingle();
        setProfile(data ?? null);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-xl py-8 px-4">
      <h1 className="text-xl font-medium tracking-tight text-folio-on-surface mb-1">Settings</h1>
      <p className="text-sm text-folio-outline mb-8">Manage your account and preferences.</p>

      {loading ? (
        <p className="text-sm text-folio-outline">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Account info */}
          <section className="rounded-xl border border-folio-sage-border bg-white p-5">
            <h2 className="text-sm font-medium text-folio-on-surface mb-4">Account</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-folio-on-surface-variant">Email</dt>
                <dd className="text-folio-on-surface font-medium truncate">{user?.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-folio-on-surface-variant">Name</dt>
                <dd className="text-folio-on-surface font-medium">{profile?.full_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-folio-on-surface-variant">Target role</dt>
                <dd className="text-folio-on-surface font-medium">{profile?.target_role ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-folio-outline">To update your profile, visit the <a href="/profile" className="underline text-folio-primary">Profile</a> page.</p>
          </section>

          {/* Preferences placeholder */}
          <section className="rounded-xl border border-folio-sage-border bg-white p-5">
            <h2 className="text-sm font-medium text-folio-on-surface mb-2">Preferences</h2>
            <p className="text-sm text-folio-outline">Notification and display preferences coming soon.</p>
          </section>
        </div>
      )}
    </div>
  );
}
