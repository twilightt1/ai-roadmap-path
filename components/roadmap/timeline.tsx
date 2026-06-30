import { phases } from "@/lib/roadmap-data";
import { PhaseNode } from "./phase-node";

/**
 * Timeline dọc — đường đi chính của roadmap.
 * Mỗi phase là một node có thể mở rộng.
 */
export function Timeline() {
  return (
    <div className="relative">
      {/* Đường dọc */}
      <div
        className="absolute bottom-0 left-[22px] top-2 w-px border-l border-dashed border-white/10 sm:left-[30px]"
        aria-hidden
      />

      <div className="space-y-5">
        {phases.map((phase) => (
          <PhaseNode key={phase.slug} phase={phase} />
        ))}
      </div>
    </div>
  );
}
