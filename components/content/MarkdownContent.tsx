import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface MarkdownContentProps {
  content?: string | null;
  className?: string;
  variant?: "default" | "formula" | "compact";
}

/**
 * Normalizes legacy HTML tags (from earlier seeds or rich text inputs) into clean Markdown.
 * Preserves Markdown syntax, KaTeX formulas, and escapes unsafe tags.
 */
function normalizeContent(rawText: string): string {
  if (!rawText) return "";

  // Fast path: if there are no HTML tags, return as is
  if (!/<[a-z][\s\S]*>/i.test(rawText)) {
    return rawText;
  }

  let md = rawText;

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n\n##### $1\n\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n\n###### $1\n\n");

  // Bold & Italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");

  // Code & Pre
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```\n$1\n```\n\n");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, p1) => {
    const lines = p1.trim().split("\n").map((l: string) => `> ${l.trim()}`).join("\n");
    return `\n\n${lines}\n\n`;
  });

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, "\n\n");

  // Links
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Paragraphs & Line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // Container tags - strip without losing inner text
  md = md.replace(/<\/?(div|span|section|article|header|footer|main|nav)[^>]*>/gi, "\n");

  // Decode common HTML entities
  md = md.replace(/&amp;/g, "&")
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'")
         .replace(/&nbsp;/g, " ");

  // Collapse consecutive newlines
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}

export function MarkdownContent({
  content,
  className,
  variant = "default",
}: MarkdownContentProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const processedContent = normalizeContent(content);
  if (!processedContent.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        "markdown-content w-full max-w-none text-foreground leading-relaxed",
        variant === "formula" &&
          "p-4 rounded-2xl bg-muted/20 border border-border/80 shadow-2xs space-y-3",
        variant === "compact" && "text-xs space-y-1.5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="text-xl sm:text-2xl font-bold font-outfit text-foreground tracking-tight mt-6 mb-3 first:mt-0"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-lg sm:text-xl font-bold font-outfit text-foreground tracking-tight mt-5 mb-2.5 first:mt-0"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-base sm:text-lg font-bold font-outfit text-foreground tracking-tight mt-4 mb-2 first:mt-0"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="text-sm sm:text-base font-semibold font-outfit text-foreground mt-3 mb-1.5 first:mt-0"
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p
              className="text-xs sm:text-sm text-foreground/90 leading-relaxed my-2.5 first:mt-0 last:mb-0 break-words"
              {...props}
            >
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-foreground" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-foreground/95" {...props}>
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="my-3 border-l-4 border-primary/70 bg-primary/5 pl-4 py-2.5 pr-3 rounded-r-2xl italic text-xs sm:text-sm text-muted-foreground leading-relaxed"
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul
              className="my-2.5 list-disc pl-5 space-y-1 text-xs sm:text-sm text-foreground/90 leading-relaxed"
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              className="my-2.5 list-decimal pl-5 space-y-1 text-xs sm:text-sm text-foreground/90 leading-relaxed"
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          hr: ({ ...props }) => (
            <hr className="my-6 border-border/80" {...props} />
          ),
          pre: ({ children, ...props }) => (
            <div className="my-3 w-full overflow-x-auto rounded-2xl bg-zinc-950 dark:bg-zinc-900 border border-border/80 shadow-xs">
              <pre
                className="p-4 font-mono text-xs text-zinc-100 leading-relaxed max-w-full"
                {...props}
              >
                {children}
              </pre>
            </div>
          ),
          code: ({ className, children, ...props }) => {
            const isCodeBlock =
              Boolean(className) ||
              (typeof children === "string" && children.includes("\n"));
            if (isCodeBlock) {
              return (
                <code className={cn("font-mono text-xs", className)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-muted text-primary font-mono text-[11px] sm:text-xs font-semibold border border-border/60 break-all"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-4 w-full overflow-x-auto rounded-2xl border border-border/80 shadow-2xs">
              <table
                className="w-full text-left text-xs sm:text-sm border-collapse"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead
              className="bg-muted/60 border-b border-border text-foreground font-bold font-outfit uppercase tracking-wider text-[11px]"
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-3 font-bold text-foreground" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2.5 text-foreground/90 border-t border-border/40"
              {...props}
            >
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-muted/20 transition-colors" {...props}>
              {children}
            </tr>
          ),
          a: ({ href, children, ...props }) => {
            if (!href) return <span>{children}</span>;
            const isExternal =
              href.startsWith("http://") ||
              href.startsWith("https://") ||
              href.startsWith("//");

            if (isExternal) {
              return (
                <a
                  {...props}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5 transition-colors"
                >
                  <span>{children}</span>
                </a>
              );
            }

            return (
              <Link
                {...props}
                href={href}
                className="text-primary hover:underline font-semibold transition-colors"
              >
                {children}
              </Link>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
