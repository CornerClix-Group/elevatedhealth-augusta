import { useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface ConsentDocumentDisplayProps {
  bodyMarkdown: string;
  enforceScroll: boolean;
  onScrollComplete?: () => void;
  className?: string;
}

export function ConsentDocumentDisplay({
  bodyMarkdown,
  enforceScroll,
  onScrollComplete,
  className,
}: ConsentDocumentDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollFiredRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!enforceScroll || scrollFiredRef.current || !containerRef.current) return;

    const el = containerRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 50) {
      scrollFiredRef.current = true;
      onScrollComplete?.();
    }
  }, [enforceScroll, onScrollComplete]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "max-h-[60vh] overflow-y-auto rounded-md border border-border bg-background px-4 py-4",
        "prose prose-sm prose-slate max-w-none dark:prose-invert",
        "prose-headings:font-playfair prose-headings:text-foreground",
        "prose-p:text-foreground/90 prose-li:text-foreground/90",
        "prose-hr:border-border prose-hr:my-6",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          hr: () => <hr className="my-6 border-t border-border" />,
          h1: ({ children }) => (
            <h1 className="mb-4 mt-2 text-xl font-semibold text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-lg font-semibold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">{children}</h3>
          ),
          p: ({ children }) => {
            const flat =
              typeof children === "string"
                ? children
                : Array.isArray(children)
                  ? children.join("")
                  : "";
            if (flat.includes("☐")) {
              return (
                <p className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-flex h-4 w-4 shrink-0 rounded-sm border-2 border-foreground/60 bg-background"
                    aria-hidden
                  />
                  <span>{children}</span>
                </p>
              );
            }
            return <p>{children}</p>;
          },
        }}
      >
        {bodyMarkdown}
      </ReactMarkdown>
    </div>
  );
}
