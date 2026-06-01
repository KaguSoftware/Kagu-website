import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Eyebrow } from "../_components/ui";

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
    <main className="flex min-h-screen items-center justify-center bg-paper px-(--container-x)">
      <div className="w-full max-w-sm">
        <Eyebrow>Kagu · Admin</Eyebrow>
        <h1 className="display mt-3 text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-slate-ink">
          Manage site content. Authorized operators only.
        </p>
        <div className="mt-8">
          <LoginForm redirectTo={redirect} />
        </div>
      </div>
    </main>
  );
}
