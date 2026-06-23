export type AppNavItem = {
  href: string;
  label: string;
};

/** Main navigation order: Uploads > Inventory > Generate > Applications > Profile */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/setup", label: "Uploads" },
  { href: "/inventory", label: "Inventory" },
  { href: "/generate", label: "Generate" },
  { href: "/records", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/setup") {
    return pathname === "/setup" || pathname.startsWith("/setup/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
