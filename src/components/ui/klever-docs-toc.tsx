"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const extractToc = (markdown: string): TocItem[] => {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  headingRegex.lastIndex = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex loop pattern
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({ id, text, level });
  }

  return toc;
};

interface KleverDocsTocProps {
  content: string;
  className?: string;
}

export function KleverDocsToc({ content, className }: KleverDocsTocProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    setToc(extractToc(content));
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // biome-ignore lint/complexity/noForEach: Observer pattern
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -50% 0px" }
    );

    const headings = document.querySelectorAll("h2, h3");
    // biome-ignore lint/complexity/noForEach: Observer pattern
    headings.forEach((heading) => observer.observe(heading));

    return () => {
      // biome-ignore lint/complexity/noForEach: Observer pattern
      headings.forEach((heading) => observer.unobserve(heading));
    };
  }, [toc]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  if (toc.length === 0) {
    return null;
  }

  return (
    <aside className={cn("w-64 shrink-0", className)}>
      <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto pr-4 pt-4 custom-scrollbar">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        
        <div className="pl-6 py-2">
          <h4 className="text-xs font-bold mb-4 text-foreground/60 uppercase tracking-wider">
            On this page
          </h4>
          <nav className="flex flex-col space-y-2">
            {toc.map((item) => (
              <button
                key={`${item.id}-${item.level}`}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "text-sm text-left transition-all duration-200 block w-full truncate relative pl-4 border-l-2 py-1",
                  item.level === 3 && "pl-8 text-xs",
                  activeId === item.id
                    ? "text-primary font-medium border-primary translate-x-1"
                    : "text-muted-foreground/70 hover:text-foreground border-transparent hover:border-border/50"
                )}
              >
                {item.text}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

