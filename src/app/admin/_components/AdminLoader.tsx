"use client";

/*
  AdminLoader — the shared Kagu boot animation, tagged "Admin".
  Mounted from src/app/admin/layout.tsx. Shows once per browser session.
  The animation itself lives in src/components/motion/BootLoader.tsx and is
  also used (untagged) as the public site's first-visit loader.
*/

import { BootLoader } from "@/components/motion/BootLoader";

export function AdminLoader() {
  return <BootLoader tag="Admin" sessionKey="kagu-admin-booted" />;
}
