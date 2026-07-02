"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

/**
 * Thanh tiến trình cuộn dính trên đầu trang.
 * Dùng emerald gradient (single accent) và honor reduced motion.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX: reduce ? scrollYProgress : scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
      aria-hidden
    />
  );
}