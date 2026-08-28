import { calculatePriorityScore } from "./scoring.js";

function stripTags(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function matchAll(regex, text) {
  const out = [];
  let m;
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  while ((m = re.exec(text)) !== null) {
    out.push(m);
  }
  return out;
}

function baseFinding(partial) {
  return {
    severity: "medium",
    confidence: "likely",
    business_impact: "medium",
    estimated_effort: "medium",
  ...partial,
    priority_score: 0,
  };
}

function finalize(findings) {
  return findings.map((f) => ({ ...f, priority_score: calculatePriorityScore(f) }));
}

/**
 * Automated HTML signal checks — not a substitute for expert heuristic review.
 */
export function scanHtml({ html, pageUrl, responseTimeMs, isHttps }) {
  const findings = [];
  const lower = html.toLowerCase();
  const text = stripTags(html);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : "";
  if (!title) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "high",
        confidence: "confirmed",
        title: "Missing page title",
        explanation:
          "The page has no <title> element. Browser tabs and search results rely on this for clarity and trust.",
        evidence: "No <title> tag found in HTML.",
        affected_element: "<title>",
        recommendation: "Add a concise, descriptive page title that states what the business offers.",
        expected_ux_outcome: "Improved clarity in search results and browser tabs.",
        potential_business_effect: "May reduce click-through from search and weaken first impressions.",
        estimated_effort: "low",
        business_impact: "medium",
      }),
    );
  } else if (title.length < 12) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "medium",
        confidence: "confirmed",
        title: "Page title may be too short",
        explanation: "Very short titles can fail to communicate value to visitors and search engines.",
        evidence: `Title: "${title.slice(0, 80)}"`,
        affected_element: "<title>",
        recommendation: "Expand the title to include brand and primary value proposition.",
        expected_ux_outcome: "Clearer context before visitors read the page.",
        potential_business_effect: "May create friction in discovery channels.",
        estimated_effort: "low",
        business_impact: "low",
      }),
    );
  }

  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  ) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  if (!metaDesc || !metaDesc[1]?.trim()) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "medium",
        confidence: "confirmed",
        title: "Missing meta description",
        explanation:
          "A meta description helps search snippets and sets expectations — especially for first-time visitors.",
        evidence: "No meta description tag detected.",
        affected_element: '<meta name="description">',
        recommendation: "Add a 120–160 character summary focused on customer value.",
        expected_ux_outcome: "More informative search listings.",
        potential_business_effect: "May reduce qualified traffic from organic search.",
        estimated_effort: "low",
        business_impact: "medium",
      }),
    );
  }

  if (!/<html[^>]*\blang=/i.test(html)) {
    findings.push(
      baseFinding({
        category: "accessibility",
        severity: "medium",
        confidence: "confirmed",
        title: "Document language not declared",
        explanation: "Screen readers use the lang attribute to pronounce content correctly.",
        evidence: "No lang attribute on <html>.",
        affected_element: "<html>",
        recommendation: 'Add lang="en" (or the appropriate locale) on the <html> element.',
        expected_ux_outcome: "Better assistive technology support.",
        potential_business_effect: "May create accessibility barriers for some customers.",
        estimated_effort: "low",
        business_impact: "medium",
      }),
    );
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    findings.push(
      baseFinding({
        category: "mobile_experience",
        severity: "critical",
        confidence: "confirmed",
        title: "Missing viewport configuration",
        explanation:
          "Without a viewport meta tag, mobile browsers may render a desktop-width page that is difficult to use on phones.",
        evidence: 'No <meta name="viewport"> found.',
        affected_element: '<meta name="viewport">',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        expected_ux_outcome: "Proper scaling on mobile devices.",
        potential_business_effect: "May increase mobile bounce rate and reduce conversions on smaller screens.",
        estimated_effort: "low",
        business_impact: "high",
      }),
    );
  }

  const h1s = matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, html);
  if (h1s.length === 0) {
    findings.push(
      baseFinding({
        category: "usability_navigation",
        severity: "high",
        confidence: "likely",
        title: "No primary heading (H1) detected",
        explanation:
          "A clear H1 helps visitors quickly understand the page purpose and supports accessibility.",
        evidence: "No <h1> element found in HTML.",
        affected_element: "<h1>",
        recommendation: "Add one descriptive H1 that states the main offer or page topic.",
        expected_ux_outcome: "Faster comprehension of page intent.",
        potential_business_effect: "May reduce engagement when the value proposition is unclear.",
        estimated_effort: "low",
        business_impact: "medium",
      }),
    );
  } else if (h1s.length > 1) {
    findings.push(
      baseFinding({
        category: "usability_navigation",
        severity: "medium",
        confidence: "likely",
        title: "Multiple H1 headings detected",
        explanation: "Multiple top-level headings can dilute message hierarchy and confuse scanning.",
        evidence: `${h1s.length} <h1> elements found.`,
        affected_element: "<h1>",
        recommendation: "Use a single H1 per page; demote secondary headings to H2/H3.",
        expected_ux_outcome: "Clearer content hierarchy.",
        potential_business_effect: "May make key actions harder to find quickly.",
        estimated_effort: "medium",
        business_impact: "low",
      }),
    );
  }

  const imgs = matchAll(/<img\b[^>]*>/gi, html);
  const imgsMissingAlt = imgs.filter((m) => !/\balt=/.test(m[0]));
  if (imgs.length > 0 && imgsMissingAlt.length > 0) {
    findings.push(
      baseFinding({
        category: "accessibility",
        severity: imgsMissingAlt.length > 3 ? "high" : "medium",
        confidence: "confirmed",
        title: "Images missing alt text",
        explanation:
          "Alternative text helps screen reader users and appears when images fail to load.",
        evidence: `${imgsMissingAlt.length} of ${imgs.length} <img> tags lack an alt attribute.`,
        affected_element: "<img>",
        recommendation: "Add meaningful alt text to informative images; use alt=\"\" for decorative images.",
        expected_ux_outcome: "More inclusive experience and clearer context.",
        potential_business_effect: "May exclude customers who rely on assistive technology.",
        estimated_effort: "medium",
        business_impact: "medium",
      }),
    );
  }

  const emptyLinks = matchAll(/<a\b[^>]*href=["']\s*#?\s*["'][^>]*>/gi, html);
  if (emptyLinks.length > 2) {
    findings.push(
      baseFinding({
        category: "usability_navigation",
        severity: "medium",
        confidence: "likely",
        title: "Empty or placeholder links detected",
        explanation: "Links without destinations create dead ends and erode trust.",
        evidence: `${emptyLinks.length} links with empty or # href values.`,
        affected_element: "<a>",
        recommendation: "Remove placeholder links or point them to real destinations.",
        expected_ux_outcome: "More predictable navigation.",
        potential_business_effect: "May frustrate users trying to complete tasks.",
        estimated_effort: "medium",
        business_impact: "medium",
      }),
    );
  }

  const navLinks = matchAll(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi, html);
  if (navLinks.length > 40) {
    findings.push(
      baseFinding({
        category: "usability_navigation",
        severity: "medium",
        confidence: "likely",
        title: "High navigation link count",
        explanation:
          "Many links on a single page can increase cognitive load and make primary actions harder to spot.",
        evidence: `${navLinks.length} anchor links detected in HTML.`,
        affected_element: "navigation",
        recommendation: "Simplify navigation and prioritise top customer journeys.",
        expected_ux_outcome: "Easier wayfinding.",
        potential_business_effect: "May increase bounce rate when users cannot find what they need.",
        estimated_effort: "high",
        business_impact: "medium",
      }),
    );
  }

  const ctaPattern =
    /\b(contact|get started|book|sign up|signup|register|buy|shop|request|demo|quote|subscribe|learn more)\b/i;
  const buttons = matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi, html);
  const ctas = buttons.filter((m) => ctaPattern.test(stripTags(m[2] || "")));
  if (ctas.length === 0) {
    findings.push(
      baseFinding({
        category: "conversion_journey",
        severity: "high",
        confidence: "likely",
        title: "No clear call-to-action detected",
        explanation:
          "Visitors may not see an obvious next step to enquire, sign up, or purchase.",
        evidence: "No button/link text matching common CTA patterns.",
        affected_element: "CTA",
        recommendation:
          "Add a prominent, action-oriented CTA aligned with your primary business goal.",
        expected_ux_outcome: "Clearer path to conversion.",
        potential_business_effect: "May be a conversion opportunity if intent is high but action is unclear.",
        estimated_effort: "medium",
        business_impact: "high",
      }),
    );
  }

  const forms = matchAll(/<form\b[\s\S]*?<\/form>/gi, html);
  for (const form of forms) {
    const inputs = matchAll(/<input\b[^>]*>/gi, form[0]);
    const visibleInputs = inputs.filter((m) => !/\btype=["'](hidden|submit|button)["']/i.test(m[0]));
    if (visibleInputs.length > 8) {
      findings.push(
        baseFinding({
          category: "conversion_journey",
          severity: "medium",
          confidence: "likely",
          title: "Long form detected",
          explanation: "Forms with many fields often increase abandonment on mobile and desktop.",
          evidence: `${visibleInputs.length} visible input fields in a form.`,
          affected_element: "<form>",
          recommendation: "Reduce fields to essentials or split into progressive steps.",
          expected_ux_outcome: "Higher form completion rates.",
          potential_business_effect: "May reduce enquiries or sign-ups due to friction.",
          estimated_effort: "medium",
          business_impact: "high",
        }),
      );
      break;
    }
  }

  const inputs = matchAll(/<input\b[^>]*>/gi, html);
  const unlabeled = inputs.filter((m) => {
    const tag = m[0];
    if (/\btype=["'](hidden|submit|button|image)["']/i.test(tag)) return false;
    if (/\bid=["'][^"']+["']/.test(tag) && html.includes('for="')) return false;
    if (/\baria-label=/.test(tag)) return false;
    return !/\bplaceholder=/.test(tag);
  });
  if (unlabeled.length > 2) {
    findings.push(
      baseFinding({
        category: "accessibility",
        severity: "medium",
        confidence: "likely",
        title: "Form fields may lack accessible labels",
        explanation: "Visible placeholders are not a substitute for proper labels.",
        evidence: `${unlabeled.length} inputs without clear label associations detected.`,
        affected_element: "<input>",
        recommendation: "Associate each field with a <label> or aria-label.",
        expected_ux_outcome: "Easier form completion for all users.",
        potential_business_effect: "May increase form errors and abandonment.",
        estimated_effort: "medium",
        business_impact: "medium",
      }),
    );
  }

  if (!/<main\b/i.test(html) && !/\brole=["']main["']/i.test(html)) {
    findings.push(
      baseFinding({
        category: "accessibility",
        severity: "low",
        confidence: "likely",
        title: "No main landmark detected",
        explanation: "Landmarks help screen reader users skip repetitive chrome and reach content.",
        evidence: "No <main> or role=\"main\" found.",
        affected_element: "<main>",
        recommendation: "Wrap primary content in a <main> element.",
        expected_ux_outcome: "Faster navigation for assistive technology users.",
        potential_business_effect: "Minor accessibility improvement opportunity.",
        estimated_effort: "low",
        business_impact: "low",
      }),
    );
  }

  if (isHttps && /src=["']http:\/\//i.test(html)) {
    findings.push(
      baseFinding({
        category: "performance",
        severity: "medium",
        confidence: "confirmed",
        title: "Mixed content references detected",
        explanation: "HTTP assets on HTTPS pages may be blocked or weaken trust indicators.",
        evidence: "http:// resource URLs found in HTML.",
        affected_element: "assets",
        recommendation: "Serve all assets over HTTPS.",
        expected_ux_outcome: "Consistent secure experience.",
        potential_business_effect: "May affect load reliability and customer trust.",
        estimated_effort: "medium",
        business_impact: "medium",
      }),
    );
  }

  if (responseTimeMs > 3500) {
    findings.push(
      baseFinding({
        category: "performance",
        severity: "high",
        confidence: "likely",
        title: "Slow initial HTML response",
        explanation:
          "The server took longer than expected to return the page HTML. This may indicate performance issues.",
        evidence: `HTML response time: ${responseTimeMs}ms (automated fetch).`,
        affected_element: "server response",
        recommendation:
          "Investigate hosting, caching, and asset weight. Core Web Vitals measurement requires additional tooling.",
        expected_ux_outcome: "Faster perceived load.",
        potential_business_effect: "May increase bounce rate on slower connections.",
        estimated_effort: "high",
        business_impact: "high",
      }),
    );
  } else if (responseTimeMs > 2000) {
    findings.push(
      baseFinding({
        category: "performance",
        severity: "medium",
        confidence: "likely",
        title: "Moderate HTML response time",
        explanation: "Response time was acceptable but could be improved for mobile users.",
        evidence: `HTML response time: ${responseTimeMs}ms.`,
        affected_element: "server response",
        recommendation: "Review caching and critical path assets.",
        expected_ux_outcome: "Snappier first paint.",
        potential_business_effect: "Potential conversion opportunity on mobile networks.",
        estimated_effort: "medium",
        business_impact: "medium",
      }),
    );
  }

  const privacySignals = /\b(privacy|cookie|terms|gdpr)\b/i.test(lower);
  if (!privacySignals) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "low",
        confidence: "requires_expert_review",
        title: "Privacy or policy links not detected",
        explanation:
          "Trust pages help customers understand data use — especially for forms and analytics.",
        evidence: "No obvious privacy/cookie/terms links in HTML text.",
        affected_element: "footer / legal",
        recommendation: "Ensure privacy policy and cookie information are easy to find.",
        expected_ux_outcome: "Stronger credibility signals.",
        potential_business_effect: "May affect trust for first-time visitors.",
        estimated_effort: "low",
        business_impact: "medium",
      }),
    );
  }

  const contactSignals =
    /\b(contact|hello@|support@|tel:|mailto:)\b/i.test(lower) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text);
  if (!contactSignals) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "medium",
        confidence: "requires_expert_review",
        title: "Contact information not obvious",
        explanation: "Visible contact paths reduce anxiety for B2B and service businesses.",
        evidence: "No clear email, phone, or contact link detected in HTML.",
        affected_element: "contact",
        recommendation: "Add a visible contact method aligned with your sales process.",
        expected_ux_outcome: "Lower friction for high-intent visitors.",
        potential_business_effect: "May be a conversion opportunity for enquiry-led businesses.",
        estimated_effort: "low",
        business_impact: "high",
      }),
    );
  }

  if (text.length < 200) {
    findings.push(
      baseFinding({
        category: "content_trust",
        severity: "medium",
        confidence: "likely",
        title: "Limited visible text content",
        explanation:
          "Very little readable text may mean content is script-rendered or the value proposition is unclear.",
        evidence: `Approx. ${text.length} characters of visible text extracted.`,
        affected_element: "body content",
        recommendation:
          "Ensure key messages are available in HTML. Expert review recommended for SPAs.",
        expected_ux_outcome: "Clearer messaging for visitors and search engines.",
        potential_business_effect: "May reduce trust or comprehension.",
        estimated_effort: "high",
        business_impact: "medium",
        confidence: "requires_expert_review",
      }),
    );
  }

  return finalize(findings);
}

export const SCAN_LIMITATIONS = [
  "This automated scan analyses publicly available HTML signals only.",
  "JavaScript-rendered content may not be fully evaluated without a browser session.",
  "Core Web Vitals and full colour-contrast analysis require additional measurement tools.",
  "Logged-in or authenticated journeys need a separately arranged expert audit.",
  "Findings marked “requires expert review” should be validated by a UX specialist.",
];
