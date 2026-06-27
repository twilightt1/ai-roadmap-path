"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { phases, allProjects } from "@/lib/roadmap-data";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Ctrl+K / Cmd+K to open, hoặc qua nút search (custom event)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openHandler = () => setOpen(true);
    document.addEventListener("keydown", handler);
    document.addEventListener("open-search", openHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("open-search", openHandler);
    };
  }, []);

  const onSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tìm phase, dự án, chủ đề..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>

        <CommandGroup heading="Phases">
          {phases.map((phase) => (
            <CommandItem
              key={phase.slug}
              value={`${phase.number} ${phase.title} ${phase.summary}`}
              onSelect={() => onSelect(`/phase/${phase.slug}`)}
            >
              <span className="text-muted-foreground">
                {phase.isCapstone ? "★" : `P${phase.number}`}
              </span>
              <span className="ml-2">{phase.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Dự án">
          {allProjects.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.title} ${p.stack.join(" ")} ${p.description}`}
              onSelect={() => onSelect(`/phase/${p.phase}`)}
            >
              <span className="text-muted-foreground">
                {p.difficulty === "easy"
                  ? "🟢"
                  : p.difficulty === "medium"
                  ? "🟡"
                  : "🔴"}
              </span>
              <span className="ml-2">{p.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Trang">
          <CommandItem
            value="roadmap timeline lộ trình"
            onSelect={() => onSelect("/roadmap")}
          >
            🗺️ Timeline lộ trình
          </CommandItem>
          <CommandItem
            value="projects dự án"
            onSelect={() => onSelect("/projects")}
          >
            🚀 Dự án thực hành
          </CommandItem>
          <CommandItem
            value="skills kỹ năng"
            onSelect={() => onSelect("/skills")}
          >
            🏅 Kỹ năng thị trường
          </CommandItem>
          <CommandItem
            value="paths con đường"
            onSelect={() => onSelect("/paths")}
          >
            📍 Con đường học
          </CommandItem>
          <CommandItem
            value="resources tài liệu"
            onSelect={() => onSelect("/resources")}
          >
            📖 Tài liệu tham khảo
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
