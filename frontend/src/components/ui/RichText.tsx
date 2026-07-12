import type { ReactNode } from "react";

/**
 * Renders plain text with paragraphs and bullet/numbered lists.
 * Bullets: lines starting with -, *, or •
 * Numbers: lines starting with 1. 2. etc.
 */
export function RichText({
  text,
  className = "leading-relaxed text-ink-600",
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim()) return null;

  const blocks = parseRichText(text);

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

type RichBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseRichText(text: string): RichBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    const joined = paragraph.join("\n").trim();
    if (joined) blocks.push({ type: "p", text: joined });
    paragraph = [];
  }

  function flushList() {
    if (list && list.items.length) blocks.push(list);
    list = null;
  }

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (bullet) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    if (numbered) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    if (line.trim() === "") {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function richTextHint(): ReactNode {
  return (
    <span>
      Tip: start a line with <code className="rounded bg-ink-100 px-1">-</code> or{" "}
      <code className="rounded bg-ink-100 px-1">*</code> for bullet points.
    </span>
  );
}
