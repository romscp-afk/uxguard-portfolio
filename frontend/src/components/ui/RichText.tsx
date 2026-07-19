import type { ReactNode } from "react";
import { isEmptyHtml, looksLikeHtml, sanitizeHtml } from "../../lib/htmlContent";

/**
 * Renders case study narrative content.
 * HTML from the rich text editor is sanitized and shown with the same formatting.
 * Legacy plain text still supports paragraphs and bullet/numbered lists.
 */
export function RichText({
  text,
  className = "leading-relaxed text-ink-600",
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim() || isEmptyHtml(text)) return null;

  if (looksLikeHtml(text)) {
    return (
      <div
        className={`rich-text-content ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }

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
      Use the toolbar for bold, lists, colors, fonts, and links. Formatting is preserved on your
      public case study page.
    </span>
  );
}
