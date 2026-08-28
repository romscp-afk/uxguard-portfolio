import { assertUrlSafe } from "../testlab/url-safety.js";

const MAX_LINKS = 12;
const TIMEOUT_MS = 6_000;

function extractSameOriginLinks(html, pageUrl) {
  const base = new URL(pageUrl);
  const hrefs = new Set();
  const re = /href=["']([^"'#][^"']*)["']/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], pageUrl);
      if (resolved.origin !== base.origin) continue;
      if (!["http:", "https:"].includes(resolved.protocol)) continue;
      hrefs.add(resolved.href.split("#")[0]);
    } catch {
      // ignore invalid URLs
    }
  }
  return [...hrefs].filter((href) => href !== base.href.split("#")[0]).slice(0, MAX_LINKS);
}

async function headCheck(url, options) {
  await assertUrlSafe(url, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "UXGuard-AuditBot/1.0 (+https://uxguard.studio/ux-audit)",
      },
    });
    if (response.status === 405 || response.status === 501) {
      const getRes = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "UXGuard-AuditBot/1.0 (+https://uxguard.studio/ux-audit)",
          Range: "bytes=0-0",
        },
      });
      return { status: getRes.status, ok: getRes.status < 400 };
    }
    return { status: response.status, ok: response.status < 400 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely checks a limited set of same-origin links for obvious failures.
 */
export async function scanInternalLinks(html, pageUrl, options = {}) {
  if (process.env.UXGUARD_TEST === "1" && options.mockBroken) {
    return [
      {
        category: "usability_navigation",
        severity: "medium",
        confidence: "confirmed",
        title: "Broken internal links detected",
        explanation: "Visitors may hit dead ends when navigation links fail.",
        evidence: "1 broken same-origin link: https://example.com/missing (404).",
        affected_element: "internal links",
        recommendation: "Fix or remove broken links and add redirects where pages moved.",
        expected_ux_outcome: "Smoother navigation between key pages.",
        potential_business_effect: "May reduce frustration and bounce on multi-page journeys.",
        estimated_effort: "low",
        business_impact: "medium",
      },
    ];
  }

  const links = extractSameOriginLinks(html, pageUrl);
  if (!links.length) return [];

  const broken = [];
  for (const link of links) {
    try {
      const result = await headCheck(link, options);
      if (!result.ok) broken.push({ url: link, status: result.status });
    } catch {
      broken.push({ url: link, status: "unreachable" });
    }
  }

  if (!broken.length) return [];

  const sample = broken
    .slice(0, 4)
    .map((b) => `${b.url} (${b.status})`)
    .join("; ");

  return [
    {
      category: "usability_navigation",
      severity: broken.length > 2 ? "high" : "medium",
      confidence: "confirmed",
      title: "Broken internal links detected",
      explanation: "Visitors may hit dead ends when navigation links fail.",
      evidence: `${broken.length} broken same-origin link${broken.length === 1 ? "" : "s"}: ${sample}`,
      affected_element: "internal links",
      recommendation: "Fix or remove broken links and add redirects where pages moved.",
      expected_ux_outcome: "Smoother navigation between key pages.",
      potential_business_effect: "May reduce frustration and bounce on multi-page journeys.",
      estimated_effort: "low",
      business_impact: "medium",
    },
  ];
}
