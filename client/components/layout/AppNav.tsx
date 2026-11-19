import { can } from "@/lib/server/auth/authorize";
import { getCurrentUser } from "@/lib/server/auth/current-user";
import DevUserSwitcher from "./DevUserSwitcher";
import SideNav, { type NavLink } from "./SideNav";

const roleLabel = (role: string) =>
  role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// Server part of the navigation: reads the signed-in user once and passes only
// the links they can use (the server still checks every request).
export default async function AppNav() {
  const user = await getCurrentUser();
  const links: NavLink[] = [];
  if (can(user, "indent.view")) links.push({ href: "/indents", label: "All Indents" });
  if (can(user, "indent.create")) links.push({ href: "/indents/new", label: "New Indent" });
  const userLabel = user ? `${user.name} · ${user.roles.map(roleLabel).join(", ") || "No role"}` : "Not signed in";
  return (
    <SideNav links={links} userLabel={userLabel}>
      <DevUserSwitcher />
    </SideNav>
  );
}

/** Shown while the user is being read. */
export function NavFallback() {
  return <aside className="no-print bg-[var(--navy)] md:min-h-screen md:w-56" aria-hidden="true" />;
}
