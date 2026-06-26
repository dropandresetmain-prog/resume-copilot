export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Pinned to the bottom utility section (Profile, Settings). */
  utility?: boolean;
};

export type NavIconName =
  | "dashboard"
  | "vault"
  | "generate"
  | "applications"
  | "profile"
  | "settings";

/** Primary nav — shown in the main section of the sidebar. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard",    label: "Dashboard",    icon: "dashboard" },
  { href: "/inventory",    label: "Career vault",  icon: "vault" },
  { href: "/generate",     label: "Generate",      icon: "generate" },
  { href: "/records",      label: "Applications",  icon: "applications" },
];

/** Utility nav — pinned below the CTA button. */
export const APP_UTILITY_ITEMS: AppNavItem[] = [
  { href: "/profile",  label: "Profile",   icon: "profile",   utility: true },
  { href: "/settings", label: "Settings",  icon: "settings",  utility: true },
];

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
