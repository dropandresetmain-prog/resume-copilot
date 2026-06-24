export type PackageFixMode =
  | "edit-resume"
  | "fix-evidence"
  | "adjust-layout"
  | "revise-cover-letter";

export function readPackageFixModeFromHash(): PackageFixMode | null {
  if (typeof window === "undefined") {
    return null;
  }
  switch (window.location.hash) {
    case "#package-resume-edit":
      return "edit-resume";
    case "#package-edit":
      return "fix-evidence";
    case "#package-layout-controls":
      return "adjust-layout";
    case "#package-cover-letter-revision":
      return "revise-cover-letter";
    default:
      return null;
  }
}
