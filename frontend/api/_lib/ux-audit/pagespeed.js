const TIMEOUT_MS = 25_000;

function readMetric(audits, id) {
  const audit = audits?.[id];
  const numeric = audit?.numericValue ?? audit?.displayValue;
  if (numeric == null) return null;
  return typeof numeric === "number" ? numeric : Number(String(numeric).replace(/[^\d.]/g, "")) || null;
}

function readScore(categories, id) {
  const score = categories?.[id]?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

/**
 * Google PageSpeed Insights adapter.
 * Requires GOOGLE_PAGESPEED_API_KEY or PAGESPEED_API_KEY.
 */
export async function fetchPageSpeedMetrics(url, options = {}) {
  if (process.env.UXGUARD_TEST === "1" && !options.forceLive) {
    return {
      configured: true,
      strategy: "mobile",
      performance_score: 42,
      lcp_ms: 5200,
      cls: 0.18,
      inp_ms: 320,
      fcp_ms: 1600,
      ttfb_ms: 420,
      source: "mock",
    };
  }

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      reason: "PageSpeed API key not configured. Set GOOGLE_PAGESPEED_API_KEY to enable Core Web Vitals.",
    };
  }

  const strategy = options.strategy || "mobile";
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        configured: true,
        error: `PageSpeed API returned ${response.status}`,
        detail: text.slice(0, 200),
      };
    }
    const data = await response.json();
    const lighthouse = data.lighthouseResult || {};
    const audits = lighthouse.audits || {};
    const categories = lighthouse.categories || {};

    return {
      configured: true,
      strategy,
      performance_score: readScore(categories, "performance"),
      lcp_ms: readMetric(audits, "largest-contentful-paint"),
      cls: readMetric(audits, "cumulative-layout-shift"),
      inp_ms: readMetric(audits, "interaction-to-next-paint") ?? readMetric(audits, "max-potential-fid"),
      fcp_ms: readMetric(audits, "first-contentful-paint"),
      ttfb_ms: readMetric(audits, "server-response-time") ?? readMetric(audits, "experimental-time-to-first-byte"),
      source: "pagespeed",
    };
  } catch (err) {
    return {
      configured: true,
      error: err.name === "AbortError" ? "PageSpeed request timed out" : err.message || "PageSpeed request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function pageSpeedFindings(metrics) {
  if (!metrics?.configured || metrics.error) return [];
  const findings = [];

  if (metrics.lcp_ms != null && metrics.lcp_ms > 4000) {
    findings.push({
      category: "performance",
      severity: metrics.lcp_ms > 6000 ? "high" : "medium",
      confidence: "confirmed",
      title: "Largest Contentful Paint may be slow",
      explanation:
        "LCP measures how long the main content takes to appear. Slow LCP may create friction on mobile networks.",
      evidence: `Mobile LCP: ${Math.round(metrics.lcp_ms)}ms (PageSpeed Insights).`,
      affected_element: "LCP element",
      recommendation: "Optimise hero images, fonts, and server response for the largest visible element.",
      expected_ux_outcome: "Faster perceived load for first-time visitors.",
      potential_business_effect: "May be a conversion opportunity on landing pages.",
      estimated_effort: "medium",
      business_impact: "high",
    });
  }

  if (metrics.cls != null && metrics.cls > 0.1) {
    findings.push({
      category: "mobile_experience",
      severity: metrics.cls > 0.25 ? "high" : "medium",
      confidence: "confirmed",
      title: "Layout shift detected (CLS)",
      explanation: "Unexpected layout movement can cause mis-taps and frustration, especially on mobile.",
      evidence: `CLS: ${metrics.cls.toFixed(3)} (PageSpeed Insights).`,
      affected_element: "page layout",
      recommendation: "Reserve space for images, ads, and dynamic content to reduce layout shift.",
      expected_ux_outcome: "More stable reading and interaction experience.",
      potential_business_effect: "May reduce accidental clicks and form errors.",
      estimated_effort: "medium",
      business_impact: "medium",
    });
  }

  if (metrics.inp_ms != null && metrics.inp_ms > 200) {
    findings.push({
      category: "performance",
      severity: metrics.inp_ms > 500 ? "high" : "medium",
      confidence: "confirmed",
      title: "Interaction responsiveness may be slow",
      explanation: "Slow interaction metrics can make buttons and forms feel unresponsive.",
      evidence: `INP/FID proxy: ${Math.round(metrics.inp_ms)}ms (PageSpeed Insights).`,
      affected_element: "interactive elements",
      recommendation: "Reduce main-thread JavaScript work and defer non-critical scripts.",
      expected_ux_outcome: "Snappier taps and clicks.",
      potential_business_effect: "May improve task completion on interactive flows.",
      estimated_effort: "high",
      business_impact: "medium",
    });
  }

  if (metrics.performance_score != null && metrics.performance_score < 50) {
    findings.push({
      category: "performance",
      severity: "high",
      confidence: "confirmed",
      title: "Low mobile performance score",
      explanation: "Overall Lighthouse performance suggests meaningful technical friction.",
      evidence: `Performance score: ${metrics.performance_score}/100 (PageSpeed Insights, mobile).`,
      affected_element: "page performance",
      recommendation: "Prioritise image optimisation, caching, and critical path reduction.",
      expected_ux_outcome: "Faster experience across devices.",
      potential_business_effect: "May reduce bounce on slower connections.",
      estimated_effort: "high",
      business_impact: "high",
    });
  }

  return findings;
}
