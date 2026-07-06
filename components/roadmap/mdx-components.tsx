import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { Info, Lightbulb, TriangleAlert, Flame } from "lucide-react";
import { CodeBlock } from "./code-block";
import { Playground } from "@/components/playground/playground";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "danger";

const calloutConfig: Record<
  CalloutType,
  { icon: typeof Info; box: string; iconColor: string; title: string }
> = {
  info: {
    icon: Info,
    box: "border-border border-l-2 border-l-cyan-500 bg-card/40",
    iconColor: "text-cyan-400",
    title: "INFO",
  },
  tip: {
    icon: Lightbulb,
    box: "border-border border-l-2 border-l-emerald-500 bg-card/40",
    iconColor: "text-emerald-400",
    title: "TIP",
  },
  warning: {
    icon: TriangleAlert,
    box: "border-border border-l-2 border-l-amber-500 bg-card/40",
    iconColor: "text-amber-400",
    title: "WARNING",
  },
  danger: {
    icon: Flame,
    box: "border-border border-l-2 border-l-rose-500 bg-card/40",
    iconColor: "text-rose-400",
    title: "IMPORTANT",
  },
};

/** Callout box dùng trong MDX: <Callout type="tip" title="...">nội dung</Callout> */
export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children?: ReactNode;
}) {
  const cfg = calloutConfig[type];
  const Icon = cfg.icon;
  return (
    <div className={cn("my-6 rounded-r-xl border p-4 sm:p-5", cfg.box)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", cfg.iconColor)} />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground">
          {title ? title.toUpperCase() : cfg.title}
        </span>
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground [&>p]:my-0">{children}</div>
    </div>
  );
}

/** Map component cho MDXRemote. */
export const mdxComponents = {
  pre: (props: ComponentPropsWithoutRef<"pre">) => <CodeBlock {...props} />,
  code: (props: ComponentPropsWithoutRef<"code">) => <code {...props} />,
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noreferrer" : undefined}
      {...props}
    />
  ),
  Callout,
  Playground,
};
