"use client";

/*
  FormValidation — replaces the browser's native validation bubbles with inline
  messages. Mounted once from admin/layout.tsx. Native validation still BLOCKS
  submit (we only cancel the bubble in the `invalid` event), so behaviour is
  unchanged; each invalid field gets an aria-invalid flag and a
  <p class="adm-inline-err" role="alert"> after it, cleared on input/change.
  The first invalid field of a submit attempt is focused.
*/

import { useEffect } from "react";

const ERR = "adm-inline-err";

function anchorOf(el: HTMLElement): HTMLElement {
  return (el.closest(".adm-select, .adm-num, .adm-drop, .adm-check, .adm-radio") as HTMLElement) ?? el;
}

function clear(el: HTMLElement) {
  el.removeAttribute("aria-invalid");
  const a = anchorOf(el);
  const n = a.nextElementSibling;
  if (n?.classList.contains(ERR)) n.remove();
}

export function FormValidation() {
  useEffect(() => {
    let burst = false;
    const onInvalid = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (!el.closest?.(".admin")) return;
      e.preventDefault(); // suppress the native bubble
      const a = anchorOf(el);
      el.setAttribute("aria-invalid", "true");
      let p = a.nextElementSibling as HTMLElement | null;
      if (!p?.classList.contains(ERR)) {
        p = document.createElement("p");
        p.className = ERR;
        p.setAttribute("role", "alert");
        a.insertAdjacentElement("afterend", p);
      }
      p.textContent = el.validationMessage || "This field is required.";
      if (!burst) {
        burst = true;
        queueMicrotask(() => {
          const target = el.classList.contains("adm-select__native")
            ? (a.querySelector("button") as HTMLElement | null)
            : el.type === "file" || el.type === "checkbox" || el.type === "radio"
              ? el
              : el;
          target?.focus({ preventScroll: true });
          a.scrollIntoView({ block: "center", behavior: "smooth" });
          setTimeout(() => (burst = false), 0);
        });
      }
    };
    const onFix = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.getAttribute?.("aria-invalid") === "true") clear(el);
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onFix, true);
    document.addEventListener("change", onFix, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onFix, true);
      document.removeEventListener("change", onFix, true);
    };
  }, []);
  return null;
}
