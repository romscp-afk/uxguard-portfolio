import DOMPurify from "dompurify";

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;
const ESCAPED_TAG_RE = /&lt;\/?[a-z]/i;

export function looksLikeHtml(value: string | null | undefined): boolean {
  return Boolean(value && (HTML_TAG_RE.test(value) || ESCAPED_TAG_RE.test(value)));
}

function decodeHtmlEntities(value: string): string {
  if (typeof document !== "undefined") {
    const el = document.createElement("textarea");
    el.innerHTML = value;
    return el.value;
  }
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  let text = String(value);

  // Decode escaped markup first (`&lt;p&gt;…`), then strip real tags.
  // One pass is not enough when content was double-escaped for storage/sharing.
  for (let pass = 0; pass < 3; pass += 1) {
    if (ESCAPED_TAG_RE.test(text) && !HTML_TAG_RE.test(text)) {
      text = decodeHtmlEntities(text);
    }

    if (typeof document !== "undefined" && HTML_TAG_RE.test(text)) {
      const el = document.createElement("div");
      el.innerHTML = text;
      text = el.textContent || el.innerText || "";
    } else if (HTML_TAG_RE.test(text)) {
      text = text.replace(/<[^>]+>/g, " ");
    } else {
      break;
    }
  }

  return text
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function isEmptyHtml(value: string | null | undefined): boolean {
  return stripHtml(value).length === 0;
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "span",
  "div",
];

const ALLOWED_ATTR = ["href", "target", "rel", "style", "class"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/** Normalize TipTap empty docs to a blank string for storage/validation. */
export function normalizeEditorHtml(html: string): string {
  if (isEmptyHtml(html)) return "";
  return sanitizeHtml(html);
}

/**
 * Convert legacy plain-text case study content (newlines + - bullets) into HTML
 * so existing studies open correctly in the rich text editor.
 */
export function plainTextToHtml(text: string): string {
  if (!text?.trim()) return "";
  if (looksLikeHtml(text)) return text;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const joined = escapeHtml(paragraph.join("\n").trim()).replace(/\n/g, "<br>");
    if (joined) parts.push(`<p>${joined}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }
    const tag = listType;
    parts.push(`<${tag}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(escapeHtml(bullet[1]));
      continue;
    }

    if (numbered) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(escapeHtml(numbered[1]));
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
  return parts.join("") || `<p>${escapeHtml(text)}</p>`;
}

export function toEditorHtml(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  if (looksLikeHtml(value)) return value;
  return plainTextToHtml(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
