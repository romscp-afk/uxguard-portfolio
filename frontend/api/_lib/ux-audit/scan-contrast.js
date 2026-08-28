function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function channel(value) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value) {
  const hex = String(value || "").trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    const [r, g, b] = short[1].split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  const long = /^#([0-9a-f]{6})$/i.exec(hex);
  if (long) {
    const n = parseInt(long[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

function parseRgbColor(value) {
  const match = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(String(value || ""));
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])].map((n) => Math.round(clamp01(n / 255) * 255));
}

export function parseCssColor(value) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const named = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    red: [255, 0, 0],
    blue: [0, 0, 255],
    green: [0, 128, 0],
  };
  if (named[trimmed]) return named[trimmed];
  return parseHexColor(trimmed) || parseRgbColor(trimmed);
}

function styleAttr(tag) {
  const match = /style=["']([^"']*)["']/i.exec(tag);
  return match ? match[1] : "";
}

function readStyleProp(style, prop) {
  const re = new RegExp(`${prop}\\s*:\\s*([^;]+)`, "i");
  const match = re.exec(style);
  return match ? match[1].trim() : null;
}

/**
 * Heuristic contrast checks from inline styles on common text elements.
 * Does not compute computed styles from external CSS.
 */
export function scanInlineContrast(html) {
  const findings = [];
  const tags = html.match(/<(p|span|a|button|h[1-6]|label|li)[^>]*>/gi) || [];
  let lowCount = 0;
  const examples = [];

  for (const tag of tags.slice(0, 120)) {
    const style = styleAttr(tag);
    if (!style) continue;
    const color = parseCssColor(readStyleProp(style, "color"));
    const background = parseCssColor(readStyleProp(style, "background-color") || readStyleProp(style, "background"));
    if (!color || !background) continue;
    const ratio = contrastRatio(color, background);
    if (ratio < 4.5) {
      lowCount += 1;
      if (examples.length < 3) {
        examples.push(`${tag.slice(0, 40)}… (${ratio.toFixed(2)}:1)`);
      }
    }
  }

  if (lowCount > 0) {
    findings.push({
      category: "accessibility",
      severity: lowCount > 3 ? "high" : "medium",
      confidence: "likely",
      title: "Possible low colour contrast (inline styles)",
      explanation:
        "Some inline-styled text may not meet WCAG 2.2 AA contrast (4.5:1 for normal text). External stylesheets were not fully evaluated.",
      evidence: `${lowCount} inline element${lowCount === 1 ? "" : "s"} below 4.5:1. Examples: ${examples.join("; ")}`,
      affected_element: "text elements with inline styles",
      recommendation: "Increase contrast between text and background colours, especially for body copy and buttons.",
      expected_ux_outcome: "Improved readability for low-vision users and bright environments.",
      potential_business_effect: "May reduce readability friction for a broader audience.",
      estimated_effort: "low",
      business_impact: "medium",
    });
  }

  return findings;
}
