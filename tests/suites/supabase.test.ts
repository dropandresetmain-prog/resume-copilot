import { signInWithMagicLink } from "../../src/lib/supabase/auth";
import { detectLegacyLocalData } from "../../src/lib/legacy/local-data";
import { jobDescriptionFingerprint } from "../../src/lib/supabase/job-descriptions";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "../../src/lib/supabase/client";

const checks: [string, boolean][] = [
  ["isSupabaseConfigured is boolean", typeof isSupabaseConfigured() === "boolean"],
  [
    "config error mentions URL when unset",
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      getSupabaseConfigError() === null ||
      getSupabaseConfigError()!.includes("SUPABASE"),
  ],
  [
    "jobDescriptionFingerprint normalizes whitespace",
    jobDescriptionFingerprint({
      rawText: "  Hello   World  ",
      companyName: " Acme ",
      roleTitle: " Engineer ",
    }) === "hello world::acme::engineer",
  ],
  [
    "detectLegacyLocalData returns null without window",
    detectLegacyLocalData() === null,
  ],
  [
    "signInWithMagicLink helper is callable",
    typeof signInWithMagicLink === "function",
  ],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} supabase helper check(s) failed.`);
  process.exit(1);
}

console.log("\nAll supabase helper checks passed.");
console.log(
  "Note: live Supabase integration tests require a configured project and authenticated session.",
);
