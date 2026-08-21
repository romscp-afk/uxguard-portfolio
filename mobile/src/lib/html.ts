export function stripHtml(value: string | null | undefined) {
  let text = String(value || '');
  // Decode escaped markup first so `&lt;p&gt;` does not become a visible `<p>`.
  for (let pass = 0; pass < 3; pass += 1) {
    const hadEscaped = /&lt;\/?[a-z]/i.test(text);
    const hadTags = /<\/?[a-z][\s\S]*>/i.test(text);
    if (hadEscaped && !hadTags) {
      text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
    }
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      text = text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    } else {
      break;
    }
  }
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export type HtmlBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

function decode(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function htmlToBlocks(html: string): HtmlBlock[] {
  const source = String(html || '').trim();
  if (!source) return [];

  const blocks: HtmlBlock[] = [];
  const tagged = source.matchAll(
    /<(h1|h2|h3|p|blockquote|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
  );

  for (const match of tagged) {
    const tag = match[1].toLowerCase();
    const inner = match[3] || '';
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const text = decode(inner);
      if (text) blocks.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, text });
    } else if (tag === 'blockquote') {
      const text = decode(inner);
      if (text) blocks.push({ type: 'quote', text });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((item) => decode(item[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ type: 'list', ordered: tag === 'ol', items });
    } else {
      const text = decode(inner);
      if (text) blocks.push({ type: 'paragraph', text });
    }
  }

  if (!blocks.length) {
    const text = decode(source);
    if (text) blocks.push({ type: 'paragraph', text });
  }
  return blocks;
}

export function estimateReadingTime(htmlOrText: string) {
  const words = stripHtml(htmlOrText).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
