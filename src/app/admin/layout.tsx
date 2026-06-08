import type { Metadata } from "next";
import Link from "next/link";
import { getAdminUser } from "@/lib/supabase/auth";
import { SidebarNav } from "./_components/SidebarNav";
import { AdminLoader } from "./_components/AdminLoader";
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

  // Unauthenticated: render bare (only /admin/login is reachable — proxy.ts guards the rest).
  if (!user) {
    return (
      <>
        <RouteProgress />
        {children}
        <Toaster initialFlash={flash} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AdminLoader />
      <RouteProgress />
      <div className="mx-auto flex max-w-(--container-max) flex-col gap-8 px-(--container-x) py-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="flex items-center justify-between border-b border-neutral pb-4 lg:block lg:border-0 lg:pb-0">
            <Link href="/admin" className="display text-lg">
              Kagu
            </Link>
            <span className="eyebrow ml-2 lg:mt-1 lg:block">Admin</span>
          </div>
          <div className="mt-6 hidden lg:block">
            <SidebarNav />
          </div>
          <div className="mt-6 lg:hidden">
            <SidebarNav />
          </div>
          <div className="mt-8 border-t border-neutral pt-4">
            <p className="text-xs text-slate-ink">{user.email}</p>
            <form action={logout} className="mt-2">
              <button
                type="submit"
                className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="mt-2 block text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
            >
              ← View site
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster initialFlash={flash} />
    </div>
  );
}
