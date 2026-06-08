/*
  Client-safe flash constants + types. No server imports here so client
  components (the Toaster) can import the cookie name and types without pulling
  in next/headers / server-only. The server helpers live in flash.ts.
*/

export type FlashTone = "success" | "error" | "info";
export type Flash = { tone: FlashTone; message: string };

export const FLASH_COOKIE = "kagu_flash";
