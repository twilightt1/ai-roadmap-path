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
import { Map, Rocket, Award, Compass, BookOpen } from "lucide-react";

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

  const getPhaseHref = (phaseNumber: number) => {
    const phase = phases.find((p) => p.number === phaseNumber);
    return phase ? `/phase/${phase.slug}` : "/projects";
  };

  const difficultyIcon = (difficulty: string) => {
    if (difficulty === "easy") return <span className="h-2 w-2 rounded-full bg-emerald-400" />;
    if (difficulty === "medium") return <span className="h-2 w-2 rounded-full bg-amber-400" />;
    return <span className="h-2 w-2 rounded-full bg-rose-400" />;
  };

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
              <span className="text-muted-foreground font-mono text-xs">
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
              onSelect={() => onSelect(getPhaseHref(p.phase))}
            >
              <span className="flex items-center">
                {difficultyIcon(p.difficulty)}
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
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Timeline lộ trình</span>
          </CommandItem>
          <CommandItem
            value="projects dự án"
            onSelect={() => onSelect("/projects")}
          >
            <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Dự án thực hành</span>
          </CommandItem>
          <CommandItem
            value="skills kỹ năng"
            onSelect={() => onSelect("/skills")}
          >
            <Award className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Kỹ năng thị trường</span>
          </CommandItem>
          <CommandItem
            value="paths con đường"
            onSelect={() => onSelect("/paths")}
          >
            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Con đường học</span>
          </CommandItem>
          <CommandItem
            value="resources tài liệu"
            onSelect={() => onSelect("/resources")}
          >
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Tài liệu tham khảo</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
