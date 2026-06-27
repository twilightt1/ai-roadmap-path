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
          className="overflow-hidden border-border/60 last:border-b-0"
        >
          <AccordionTrigger className="group hover:no-underline">
            <div className="flex items-center gap-3 pr-2 text-left">
              <span
                className={`flex h-7 shrink-0 items-center justify-center rounded-md ${a.bgSoft} ${a.text} px-2 text-xs font-bold tabular-nums`}
              >
                {topic.code}
              </span>
              <span className="text-sm font-medium group-hover:text-foreground">
                {topic.title}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <ul className="ml-10 space-y-1.5">
              {topic.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${a.text} opacity-70`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/phase/${phaseSlug}/${topic.id}`}
              className={`mt-3 ml-10 inline-flex items-center gap-1 rounded-lg ${a.bgSoft} ${a.text} px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80`}
            >
              Đọc bài đầy đủ <ArrowRight className="h-3 w-3" />
            </Link>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
