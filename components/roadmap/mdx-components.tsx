import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { Info, Lightbulb, TriangleAlert, Flame } from "lucide-react";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "danger";

const calloutConfig: Record<
  CalloutType,
  { icon: typeof Info; box: string; iconColor: string; title: string }
> = {
  info: {
    icon: Info,
    box: "border-sky-500/30 bg-sky-500/5",
    iconColor: "text-sky-400",
    title: "Lưu ý",
  },
  tip: {
    icon: Lightbulb,
    box: "border-emerald-500/30 bg-emerald-500/5",
    iconColor: "text-emerald-400",
    title: "Mẹo",
  },
  warning: {
    icon: TriangleAlert,
    box: "border-amber-500/30 bg-amber-500/5",
    iconColor: "text-amber-400",
    title: "Cảnh báo",
  },
  danger: {
    icon: Flame,
    box: "border-rose-500/30 bg-rose-500/5",
    iconColor: "text-rose-400",
    title: "Quan trọng",
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
    <div className={cn("my-6 rounded-xl border p-4", cfg.box)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", cfg.iconColor)} />
        <span className="text-sm font-semibold">{title ?? cfg.title}</span>
      </div>
      <div className="text-sm text-muted-foreground [&>p]:my-0">{children}</div>
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
};
