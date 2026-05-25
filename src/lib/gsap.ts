/*
  GSAP + ScrollTrigger module-init registration.

  Why: React effect order is depth-first — child effects run before parent.
  If a deeply-nested MaskSweep useEffect calls ScrollTrigger.create() before
  the top-level SmoothScrollProvider has had a chance to register the
  plugin, GSAP throws "Please gsap.registerPlugin(ScrollTrigger)" and the
  underlying `_context is not a function` crash.

  Module-level code runs synchronously at import time, BEFORE any effect.
  Every consumer imports from this file so the plugin is guaranteed
  registered before any component effect that uses it.
*/

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
