/*
  Shim for React 19.2's <ViewTransition>.
  The component is exported as `unstable_ViewTransition` at runtime but the
  TypeScript types don't expose it yet. We grab it off the namespace at
  module load with a typed-any cast and fall back to a pass-through.

  When @types/react catches up, replace this with a direct import.
*/

import * as React from "react";

type ViewTransitionProps = {
  name?: string;
  share?: "auto" | "morph";
  enter?: string | Record<string, string>;
  exit?: string | Record<string, string>;
  default?: string;
  children: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtime: React.ComponentType<ViewTransitionProps> | undefined = (React as any)
  .unstable_ViewTransition;

export const ViewTransition: React.ComponentType<ViewTransitionProps> =
  runtime ?? (({ children }) => <>{children}</>);
