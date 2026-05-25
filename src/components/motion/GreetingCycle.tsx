"use client";

/*
  M03 — i18n-cycle. Cross-fade one word through translations.
  1.6s interval, 200ms swap. Reduced-motion: shows first greeting only.
*/

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const GREETINGS = [
  "Hello",
  "Merhaba",
  "Bonjour",
  "Olá",
  "Hola",
  "Ciao",
  "Selam",
];

interface GreetingCycleProps {
  intervalMs?: number;
  className?: string;
}

export function GreetingCycle({ intervalMs = 1600, className }: GreetingCycleProps) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setI((prev) => (prev + 1) % GREETINGS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, reduced]);

  if (reduced) {
    return <span className={className}>{GREETINGS[0]}</span>;
  }

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-block", minWidth: "8ch" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={GREETINGS[i]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.6, 0.01, 0.05, 0.95] }}
          style={{ display: "inline-block" }}
        >
          {GREETINGS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
