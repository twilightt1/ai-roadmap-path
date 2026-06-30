import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Topic, AccentColor } from "@/lib/types";
import { accentMap } from "@/lib/theme";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function TopicList({
  topics,
  phaseSlug,
  accent = "violet",
  defaultOpen,
}: {
  topics: Topic[];
  /** Slug phase để build link tới trang đọc topic */
  phaseSlug: string;
  accent?: AccentColor;
  /** Cho phép mở tất cả accordion (dùng ở trang detail) */
  defaultOpen?: boolean;
}) {
  const a = accentMap[accent];

  return (
    <Accordion
      defaultValue={defaultOpen ? topics.map((t) => t.id) : []}
      className="w-full"
    >
      {topics.map((topic) => (
        <AccordionItem
          key={topic.id}
          value={topic.id}
          className="overflow-hidden border-white/5 last:border-b-0"
        >
          <AccordionTrigger className="group hover:no-underline px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3 pr-2 text-left">
              <span
                className="flex h-6 shrink-0 items-center justify-center rounded bg-white/[0.02] border border-white/5 px-1.5 text-[10px] font-mono font-bold text-zinc-400"
              >
                {topic.code}
              </span>
              <span className="text-sm font-semibold text-zinc-300 group-hover:text-foreground transition-colors">
                {topic.title}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 px-4 sm:px-5">
            <ul className="ml-9 space-y-1.5">
              {topic.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.text} opacity-50`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 ml-9">
              <Link
                href={`/phase/${phaseSlug}/${topic.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-1.5 text-xs font-mono font-semibold text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                Đọc bài đầy đủ <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
