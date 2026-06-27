import {
  Compass,
  Code,
  Sigma,
  Cpu,
  Network,
  Languages,
  Sparkles,
  Workflow,
  Database,
  Bot,
  SlidersHorizontal,
  Image,
  Server,
  PenTool,
  DatabaseZap,
  Gauge,
  Gamepad2,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Compass,
  Code,
  Sigma,
  Cpu,
  Network,
  Languages,
  Sparkles,
  Workflow,
  Database,
  Bot,
  SlidersHorizontal,
  Image,
  Server,
  PenTool,
  DatabaseZap,
  Gauge,
  Gamepad2,
  ShieldCheck,
  Trophy,
};

export function PhaseIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon className={className} />;
}
