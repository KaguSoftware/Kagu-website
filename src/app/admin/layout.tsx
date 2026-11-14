import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/admin.css";
import "@/styles/admin-controls.css";
import { cookies } from "next/headers";
import { siteFontVars } from "@/lib/siteFonts";
import { KaguMark } from "@/components/KaguMark";
import { getAdminUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./_components/SidebarNav";
import { AdminLoader } from "./_components/AdminLoader";
import { ThemeToggle, THEME_COOKIE, type AdminTheme } from "./_components/ThemeToggle";
import { FormValidation } from "./_components/FormValidation";
import { Toaster } from "./_components/toast";
import { RouteProgress } from "./_components/RouteProgress";
import { readFlash } from "./_actions/flash";
import { logout } from "./_actions/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "Admin · %s" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  const flash = await readFlash();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme: AdminTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";
  const themeAttr = theme === "system" ? undefined : theme;

  // Unauthenticated: render bare (only /admin/login is reachable — proxy.ts guards the rest).
  if (!user) {
    return (
      <div className={`admin ${siteFontVars}`} data-theme={themeAttr}>
        <RouteProgress />
        <FormValidation />
        {children}
        <Toaster initialFlash={flash} />
      </div>
    );
  }

  // Initial sidebar badge count (status='new' across both request tables) —
  // server-counted so the badge renders without a zero-flash; the client hook
  // keeps it live from there.
  const supabase = await createClient();
  const [contactCount, inquiryCount] = await Promise.all([
    supabase
      .from("contact_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("project_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
  ]);
  const newRequests = (contactCount.count ?? 0) + (inquiryCount.count ?? 0);

  const brand = (
    <Link href="/admin" className="adm-brand" aria-label="Kagu admin home">
      <KaguMark variant="outline" height={20} />
      <span className="adm-brand__word">kagu</span>
      <span className="adm-brand__tag">Admin</span>
    </Link>
  );

  return (
    <div className={`admin ${siteFontVars}`} data-theme={themeAttr}>
      <AdminLoader />
      <FormValidation />
      <RouteProgress />
      <div className="adm-shell">
        {/* Desktop sidebar */}
        <aside className="adm-side">
          {brand}
          <div className="adm-side__nav">
            <SidebarNav newRequests={newRequests} notify />
          </div>
          <div className="adm-side__foot">
            <p className="adm-side__email" title={user.email ?? undefined}>
              {user.email}
            </p>
            <ThemeToggle initial={theme} />
            <Link href="/" className="adm-quiet">
              View site ↗
            </Link>
            <form action={logout}>
              <button type="submit" className="adm-quiet">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile top bar + scrollable pills */}
        <header className="adm-top">
          <div className="adm-top__row">
            {brand}
            <div className="adm-top__actions">
              <ThemeToggle initial={theme} />
              <Link href="/" className="adm-quiet">
                Site ↗
              </Link>
              <form action={logout}>
                <button type="submit" className="adm-quiet">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="adm-pills">
            <SidebarNav newRequests={newRequests} variant="pills" />
          </div>
        </header>

        <main id="main" className="adm-main">
          <div className="adm-main__inner">{children}</div>
        </main>
      </div>
      <Toaster initialFlash={flash} />
    </div>
  );
}
