"use client";

import { useActionState } from "react";
import { login, type AuthState } from "../_actions/auth";
import { SubmitButton } from "../_components/SubmitButton";

const initial: AuthState = { error: null };

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(login, initial);

  return (
    <form action={formAction} className="space-y-6">
      {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}

      <label className="kagu-field block">
        <span className="eyebrow mb-2 block">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none"
        />
      </label>

      <label className="kagu-field block">
        <span className="eyebrow mb-2 block">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none"
        />
      </label>

      {state.error ? (
        <p className="border-l-2 border-mint-deep bg-mint-pale/40 px-3 py-2 text-sm text-ink">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
