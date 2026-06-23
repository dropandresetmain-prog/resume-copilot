export type AppNavItem = {
  href: string;
  label: string;
};

/** Main navigation order: Generate > Inventory > Records > Profile > Manage Uploads */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/generate", label: "Generate" },
  { href: "/inventory", label: "Inventory" },
  { href: "/records", label: "Records" },
  { href: "/profile", label: "Profile" },
  { href: "/setup", label: "Manage Uploads" },
];

export function isAppNavActive(pathname: string, href: string): boolean {
  if (href === "/setup") {
    return pathname === "/setup" || pathname.startsWith("/setup/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
