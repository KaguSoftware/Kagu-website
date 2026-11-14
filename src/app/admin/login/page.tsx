import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { KaguMark } from "@/components/KaguMark";

export const metadata: Metadata = {
  title: "Admin · Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <div className="flex flex-col items-center text-center">
          <KaguMark variant="outline" height={28} style={{ color: "var(--ink)" }} />
          <h1 className="display mt-6 text-[34px]">Admin</h1>
          <p className="mt-2 text-sm text-slate-ink">
            Manage site content. Authorized operators only.
          </p>
        </div>
        <div className="mt-8">
          <LoginForm redirectTo={redirect} />
        </div>
      </div>
    </main>
  );
}
