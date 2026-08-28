const TIMEOUT_MS = 18_000;

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return null;
  }
}

function playwrightEnabled() {
  if (process.env.UX_AUDIT_PLAYWRIGHT === "0") return false;
  if (process.env.UX_AUDIT_PLAYWRIGHT === "1") return true;
  return process.env.UXGUARD_TEST !== "1";
}

/**
 * Optional rendered-page checks when Playwright is available.
 * Skipped on Vercel unless explicitly enabled and browsers are installed.
 */
export async function scanWithPlaywright(url, options = {}) {
  if (!playwrightEnabled()) {
    return { available: false, findings: [], reason: "Playwright scan disabled in this environment." };
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    return { available: false, findings: [], reason: "Playwright is not installed." };
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "UXGuard-AuditBot/1.0 (+https://uxguard.studio/ux-audit)",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = doc.scrollWidth > doc.clientWidth + 2;
      const smallTargets = [];
      const interactive = Array.from(document.querySelectorAll("a, button, input, [role='button']")).slice(0, 40);
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
          const label = (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40);
          smallTargets.push(label || el.tagName);
        }
      }
      const h1Count = document.querySelectorAll("h1").length;
      const title = document.title || "";
      const visibleText = (body?.innerText || "").replace(/\s+/g, " ").trim().length;
      return { overflowX, smallTargets, h1Count, title, visibleText };
    });

    const findings = [];

    if (metrics.overflowX) {
      findings.push({
        category: "mobile_experience",
        severity: "high",
        confidence: "confirmed",
        title: "Horizontal overflow on mobile viewport",
        explanation: "Content wider than the viewport forces sideways scrolling on phones.",
        evidence: "Rendered page scrollWidth exceeds clientWidth at 390px width.",
        affected_element: "page layout",
        recommendation: "Fix overflowing elements, images, or tables for narrow viewports.",
        expected_ux_outcome: "Cleaner mobile reading without sideways scroll.",
        potential_business_effect: "May reduce mobile bounce and interaction errors.",
        estimated_effort: "medium",
        business_impact: "high",
      });
    }

    if (metrics.smallTargets.length > 2) {
      findings.push({
        category: "mobile_experience",
        severity: "medium",
        confidence: "likely",
        title: "Small tap targets detected",
        explanation: "Interactive elements smaller than ~40px can be difficult to tap accurately.",
        evidence: `Examples: ${metrics.smallTargets.slice(0, 4).join(", ")}`,
        affected_element: "buttons / links",
        recommendation: "Increase touch target size and spacing for primary actions.",
        expected_ux_outcome: "Easier tapping on mobile devices.",
        potential_business_effect: "May improve mobile conversion on key actions.",
        estimated_effort: "medium",
        business_impact: "medium",
      });
    }

    if (!metrics.title) {
      findings.push({
        category: "content_trust",
        severity: "high",
        confidence: "confirmed",
        title: "Rendered page title is empty",
        explanation: "JavaScript may be responsible for setting the title after load.",
        evidence: "document.title was empty after DOMContentLoaded.",
        affected_element: "<title>",
        recommendation: "Ensure a meaningful title is present in the rendered DOM.",
        expected_ux_outcome: "Clearer browser tab and SEO context.",
        potential_business_effect: "May affect trust and discoverability.",
        estimated_effort: "low",
        business_impact: "medium",
      });
    }

    if (metrics.visibleText < 120) {
      findings.push({
        category: "content_trust",
        severity: "medium",
        confidence: "likely",
        title: "Limited rendered text content",
        explanation: "The rendered page may rely heavily on client-side loading for key messaging.",
        evidence: `Approx. ${metrics.visibleText} characters visible after render.`,
        affected_element: "body content",
        recommendation: "Ensure critical value proposition text is available without long delays.",
        expected_ux_outcome: "Clearer first impression for visitors.",
        potential_business_effect: "May be a conversion opportunity if messaging loads late.",
        estimated_effort: "high",
        business_impact: "medium",
      });
    }

    await context.close();
    return {
      available: true,
      findings,
      rendered: {
        h1_count: metrics.h1Count,
        visible_text_length: metrics.visibleText,
      },
    };
  } catch (err) {
    return {
      available: false,
      findings: [],
      reason: err.message || "Playwright scan failed",
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
