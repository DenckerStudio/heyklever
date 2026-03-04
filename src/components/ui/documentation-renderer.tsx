"use client";

import { useEffect, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface DocumentationRendererProps {
  content: string;
  className?: string;
  hideToc?: boolean;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const extractToc = (markdown: string): TocItem[] => {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  // Reset regex state
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

const CodeBlock = memo(({ className, children }: React.HTMLAttributes<HTMLElement>) => {
  const [copied, setCopied] = useState(false);
  const textContent = String(children).replace(/\n$/, "");
  
  // Extract language from className (e.g., "language-javascript")
  const language = className?.replace("language-", "") || "text";
  
  const isInline = !className?.includes("language-");
  
  if (isInline) {
    return <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm text-primary/80">{children}</code>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-sm">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <span className="ml-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">{language}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      
      {/* Code Content */}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-sm text-zinc-300 font-mono leading-relaxed">
            <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

export function DocumentationRenderer({ content, className, hideToc = false }: DocumentationRendererProps) {
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

  return (
    <div className={cn("flex flex-col lg:flex-row gap-12 w-full max-w-7xl mx-auto", className)}>
      {/* Main Content */}
      <div className={cn("flex-1 min-w-0 w-full", !hideToc && "lg:w-3/4")}>
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-12 text-foreground scroll-m-20"
                >
                  {children}
                </motion.h1>
              ),
              h2: ({ children }) => {
                const id = String(children)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    id={id} 
                    className="group scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mt-16 mb-6 flex items-center gap-2"
                  >
                    {children}
                    <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-primary text-lg">#</a>
                  </motion.h2>
                );
              },
              h3: ({ children }) => {
                const id = String(children)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    id={id} 
                    className="scroll-m-20 text-2xl font-semibold tracking-tight mt-10 mb-4"
                  >
                    {children}
                  </motion.h3>
                );
              },
              p: ({ children }) => {
                const content = String(children);
                if (content.startsWith("Reference Source:") || content.includes("**Reference Source:**")) {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-primary/5 border border-primary/10 rounded-lg p-4 my-8 text-sm text-muted-foreground flex items-start gap-3 shadow-sm"
                    >
                       <div className="mt-0.5 text-primary bg-primary/10 p-1 rounded-full"><Terminal className="w-3 h-3" /></div>
                       <div className="flex-1">
                          <ReactMarkdown components={{ p: ({children}) => <>{children}</>, a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{children}</a> }}>
                              {content}
                          </ReactMarkdown>
                       </div>
                    </motion.div>
                  );
                }
                return (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="leading-8 [&:not(:first-child)]:mt-8 text-foreground/80 font-normal"
                  >
                    {children}
                  </motion.p>
                );
              },
              ul: ({ children }) => (
                <motion.ul 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="my-6 ml-6 list-disc [&>li]:mt-2 text-foreground/80"
                >
                  {children}
                </motion.ul>
              ),
              ol: ({ children }) => (
                <motion.ol 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="my-6 ml-6 list-decimal [&>li]:mt-2 text-foreground/80"
                >
                  {children}
                </motion.ol>
              ),
              li: ({ children }) => <li className="pl-2">{children}</li>,
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors border-b border-primary/30 hover:border-primary"
                >
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                 return (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.4 }}
                   >
                     <CodeBlock className={className}>{children}</CodeBlock>
                   </motion.div>
                 );
              },
              blockquote: ({ children }) => (
                <motion.blockquote 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="border-l-4 border-primary/20 pl-6 italic text-muted-foreground my-8"
                >
                    {children}
                </motion.blockquote>
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>

      {/* Sticky Table of Contents Sidebar */}
      {!hideToc && (
      <aside className="hidden lg:block w-1/4 relative">
        <div className="sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto pr-4 pt-10 custom-scrollbar">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          
          <div className="pl-6 py-2">
            <h4 className="text-[10px] font-bold mb-6 text-foreground/40 uppercase tracking-[0.2em]">
                On This Page
            </h4>
            <nav className="flex flex-col space-y-3">
              {toc.length === 0 ? (
                  <p className="text-sm text-muted-foreground/50 italic">No sections</p>
              ) : (
                  toc.map((item) => (
                  <button
                      key={`${item.id}-${item.level}`}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                      "text-sm text-left transition-all duration-300 block w-full truncate relative pl-4 border-l-2",
                      item.level === 3 && "pl-8 text-xs",
                      activeId === item.id
                          ? "text-primary font-medium border-primary translate-x-1"
                          : "text-muted-foreground/70 hover:text-foreground border-transparent hover:border-border/50"
                      )}
                  >
                      {item.text}
                  </button>
                  ))
              )}
            </nav>
          </div>
        </div>
      </aside>
      )}
    </div>
  );
}
