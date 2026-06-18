import type { StoredJobDescription } from "@/types/jd";

/** User-facing saved job label: Company — Role with sensible fallbacks. */
export function formatSavedJobLabel(jd: Pick<StoredJobDescription, "companyName" | "roleTitle" | "rawText">): string {
  const company = jd.companyName?.trim();
  const role = jd.roleTitle?.trim();

  if (company && role) return `${company} — ${role}`;
  if (role) return role;
  if (company) return company;

  const preview = jd.rawText.trim().split(/\s+/).slice(0, 8).join(" ");
  if (preview) {
    return preview.length > 60 ? `${preview.slice(0, 60)}…` : preview;
  }

  return "Untitled job";
}
