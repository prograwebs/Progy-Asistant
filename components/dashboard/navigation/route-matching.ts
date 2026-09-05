export function isNavigationItemActive(pathname: string, href: string): boolean {
  if (href === "/panel") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
