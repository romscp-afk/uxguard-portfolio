export function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHtmlSignals(html) {
  const lower = html.toLowerCase();
  const text = stripTags(html);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : "";
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1s = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgs.filter((tag) => !/\balt\s*=\s*["'][^"']+["']/i.test(tag));
  const links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const emptyLinks = links.filter((tag) => !stripTags(tag));
  const navLinks = links.filter((tag) => /<nav\b/i.test(html.slice(Math.max(0, html.indexOf(tag) - 200), html.indexOf(tag))));
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  const inputs = html.match(/<input\b[^>]*>/gi) || [];
  const textareas = html.match(/<textarea\b[^>]*>/gi) || [];
  const selects = html.match(/<select\b[^>]*>/gi) || [];
  const visibleFields = [...inputs, ...textareas, ...selects].filter(
    (tag) => !/\btype\s*=\s*["'](?:hidden|submit|button)["']/i.test(tag),
  );
  const requiredFields = visibleFields.filter((tag) => /\brequired\b/i.test(tag));
  const unlabeled = visibleFields.filter((tag) => {
    const idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (!idMatch) return true;
    const label = new RegExp(`<label[^>]+for\\s*=\\s*["']${idMatch[1]}["']`, "i").test(html);
    return !label && !/\baria-label\s*=/i.test(tag);
  });
  const ctaPattern =
    /\b(contact|book|buy|shop|get started|start free|sign up|register|request|quote|demo|trial|subscribe|add to cart|checkout|download)\b/i;
  const ctaCandidates = [...buttons, ...links].filter((tag) => ctaPattern.test(stripTags(tag)));
  const weakCtas = [...buttons, ...links].filter((tag) =>
    /^(click here|submit|more|go|read more|learn)$/i.test(stripTags(tag)),
  );

  return {
    lower,
    text,
    title,
    metaDescription: metaDesc?.[1]?.trim() || "",
    h1Count: h1s.length,
    imgs,
    imgsMissingAlt,
    links,
    emptyLinks,
    navLinkCount: navLinks.length || links.length,
    buttons,
    visibleFields,
    requiredFields,
    unlabeled,
    ctaCandidates,
    weakCtas,
    hasMain: /<main\b/i.test(html) || /\brole=["']main["']/i.test(html),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasLang: /<html[^>]*\blang=/i.test(html),
    hasPrivacy: /\b(privacy|cookie|terms|gdpr)\b/i.test(lower),
    hasContact:
      /\b(contact|hello@|support@|tel:|mailto:)\b/i.test(lower) ||
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text),
    forms: html.match(/<form\b[\s\S]*?<\/form>/gi) || [],
  };
}
