import type { Metadata } from "next";
import { Award, Flame, Star } from "lucide-react";
import { skillTiers } from "@/lib/roadmap-data";

const tierConfig = [
  { icon: Award, color: "from-emerald-500 to-teal-500", border: "border-emerald-500/40" },
  { icon: Flame, color: "from-violet-500 to-fuchsia-500", border: "border-violet-500/40" },
  { icon: Star, color: "from-amber-500 to-orange-500", border: "border-amber-500/40" },
];

export const metadata: Metadata = {
  title: "Kỹ năng — Skills Market Demand 2026",
  description:
    "3 tiers kỹ năng AI Engineer: Must Have, Highly Valued, Expert Level — xếp theo nhu cầu thị trường 2026.",
};

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Kỹ năng theo nhu cầu thị trường 2026
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          3 cấp độ: bắt buộc → ưu việt → chuyên gia. Các kỹ năng được xếp theo
          mức độ công ty đang tuyển dụng.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {skillTiers.map((tier, i) => {
          const cfg = tierConfig[i];
          const Icon = cfg.icon;
          return (
            <div
              key={tier.tier}
              className={`rounded-2xl border ${cfg.border} bg-card/60 p-6`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.color} text-white shadow-lg`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tier {tier.tier}
                  </div>
                  <h2 className="text-lg font-bold">{tier.name}</h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {tier.subtitle}
              </p>
              <ul className="mt-5 space-y-2.5">
                {tier.skills.map((skill) => (
                  <li
                    key={skill}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br ${cfg.color}`}
                    />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
