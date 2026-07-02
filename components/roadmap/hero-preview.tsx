"use client";

import { motion, useReducedMotion } from "motion/react";
import { Terminal, Cpu, GitMerge, Gauge, Layers } from "lucide-react";

export function HeroPreview() {
  const reduce = useReducedMotion();

  const nodes = [
    { id: "01", label: "Math & Python", icon: Cpu, status: "completed" },
    { id: "05", label: "Deep Learning", icon: Layers, status: "active" },
    { id: "10", label: "LLM & RAG", icon: GitMerge, status: "pending" },
    { id: "15", label: "Optimization", icon: Gauge, status: "pending" },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow background */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-30 blur-xl" />

      {/* Main Terminal Window */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-white/10 bg-zinc-950/80 p-5 font-mono text-xs backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[10px] text-zinc-500 font-medium">ai_pipeline.sh</span>
          </div>
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
        </div>

        {/* Console logs simulation */}
        <div className="space-y-1.5 text-[11px] text-zinc-400">
          <p className="text-zinc-600">$ ./run_pipeline --target production-grade</p>
          <p className="text-emerald-400">✓ Initializing AI Engineer Roadmap 2026...</p>
          <p className="text-zinc-500">→ Loading 17 phases and 51 practical projects</p>
        </div>

        {/* Visual Pipeline Map */}
        <div className="relative my-6 pl-4">
          {/* Vertical Connection Line */}
          <div className="absolute bottom-4 left-7 top-4 w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-zinc-800" />

          <div className="space-y-5">
            {nodes.map((node, idx) => {
              const Icon = node.icon;
              return (
                <motion.div
                  key={node.id}
                  initial={reduce ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : idx * 0.1 + 0.2, duration: 0.4 }}
                  className="relative flex items-center gap-4 pl-8"
                >
                  {/* Node Circle */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {node.status === "completed" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-zinc-900 ring-4 ring-zinc-950">
                        <Icon className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    {node.status === "active" && (
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400 bg-zinc-900 ring-4 ring-zinc-950">
                        <motion.div
                          animate={reduce ? {} : { scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 rounded-full bg-emerald-400/10"
                        />
                        <Icon className="h-4 w-4 text-emerald-400" />
                      </div>
                    )}
                    {node.status === "pending" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-zinc-900 ring-4 ring-zinc-950">
                        <Icon className="h-4 w-4 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Node Description */}
                  <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">Phase {node.id}</span>
                      {node.status === "completed" && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400">
                          Done
                        </span>
                      )}
                      {node.status === "active" && (
                        <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] text-emerald-400 font-bold animate-pulse">
                          Active
                        </span>
                      )}
                      {node.status === "pending" && (
                        <span className="text-[9px] text-zinc-600">Locked</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{node.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/5 pt-3 text-[10px] text-zinc-500 flex items-center justify-between">
          <span>System Load: 0.42</span>
          <span className="text-emerald-500">Status: Ready</span>
        </div>
      </motion.div>
    </div>
  );
}
