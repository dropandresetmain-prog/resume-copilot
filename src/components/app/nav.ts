export type AppNavItem = {
  href: string;
  label: string;
  /** Primary product action — styled as CTA in the shell nav. */
  primary?: boolean;
};

/** Main navigation order: Uploads > Generate > Inventory > Applications > Profile */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/setup", label: "Uploads" },
  { href: "/generate", label: "Generate", primary: true },
  { href: "/inventory", label: "Inventory" },
  { href: "/records", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/setup") {
    return pathname === "/setup" || pathname.startsWith("/setup/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
