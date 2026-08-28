import {
  failedCheck,
  manualReviewCheck,
  notApplicableCheck,
  notTestedCheck,
  passedCheck,
  warningCheck,
} from "../check-result.js";
import {
  isEcommerce,
  isLandingPage,
  isPortfolio,
  requiresCheckoutChecks,
  requiresContactTransparency,
  requiresFixedPricing,
  requiresSiteSearch,
} from "../audit-context.js";
import { parseHtmlSignals } from "./html-utils.js";

const WEAK_CTA = /^(click here|submit|more|go|read more|learn)$/i;

/**
 * @param {{ html: string; pageUrl: string; responseTimeMs: number; isHttps: boolean; context?: object }} input
 */
export function runHtmlChecks(input) {
  const { html, pageUrl, responseTimeMs, isHttps, context = {} } = input;
  const s = parseHtmlSignals(html);
  const checks = [];

  // --- Conversion experience ---
  if (s.ctaCandidates.length) {
    checks.push(
      passedCheck({
        checkId: "conversion.cta_presence",
        category: "conversion_experience",
        metric: "Primary call-to-action presence",
        maxScore: 10,
        confidence: "high",
        measurementSource: "html",
        evidence: [`${s.ctaCandidates.length} potential CTA element(s) detected in HTML.`],
        affectedElements: ["button", "a"],
        explanation: "The page includes identifiable action-oriented controls or links.",
        recommendation: "Keep the primary action visually prominent and consistent across the journey.",
        expectedUxOutcome: "Visitors can identify how to take the next step.",
        potentialBusinessImpact: "Supports conversion-oriented journeys.",
        businessImpact: "medium",
      }),
    );
  } else {
    checks.push(
      failedCheck({
        checkId: "conversion.cta_presence",
        category: "conversion_experience",
        metric: "Primary call-to-action presence",
        maxScore: 10,
        severity: "high",
        confidence: "medium",
        measurementSource: "html",
        evidence: ["No clear CTA text patterns detected in buttons or links."],
        affectedElements: ["button", "a"],
        explanation: "Visitors may struggle to identify the primary action on the page.",
        recommendation: "Add a descriptive primary CTA aligned with your business goal.",
        expectedUxOutcome: "Clearer next step for visitors.",
        potentialBusinessImpact: "May be a conversion opportunity if the primary action is unclear.",
        estimatedEffort: "low",
        businessImpact: "high",
      }),
    );
  }

  if (s.weakCtas.length) {
    checks.push(
      warningCheck({
        checkId: "conversion.cta_clarity",
        category: "conversion_experience",
        metric: "CTA label clarity",
        maxScore: 8,
        severity: "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: s.weakCtas.slice(0, 3).map((tag) => `Ambiguous label: "${parseHtmlSignals(tag).text || "unlabelled"}"`),
        affectedElements: ["button", "a"],
        explanation: "Generic CTA labels may not communicate the outcome of the action.",
        recommendation: "Use specific action labels such as “Book a consultation” or “Request a quote”.",
        expectedUxOutcome: "Improved comprehension of interactive elements.",
        potentialBusinessImpact: "May reduce hesitation before clicking.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else if (s.ctaCandidates.length) {
    checks.push(
      passedCheck({
        checkId: "conversion.cta_clarity",
        category: "conversion_experience",
        metric: "CTA label clarity",
        maxScore: 8,
        confidence: "medium",
        measurementSource: "html",
        evidence: ["No obviously generic CTA labels detected in HTML."],
        affectedElements: ["button", "a"],
        explanation: "CTA labels appear reasonably descriptive from HTML signals.",
        recommendation: "Continue using action-specific language.",
        expectedUxOutcome: "Clearer interactive labels.",
        potentialBusinessImpact: "Supports task completion.",
        businessImpact: "low",
      }),
    );
  }

  checks.push(
    manualReviewCheck({
      checkId: "conversion.cta_prominence",
      category: "conversion_experience",
      metric: "CTA visual prominence",
      maxScore: 10,
      measurementSource: "rendered_dom",
      evidence: ["Rendered viewport analysis is required to assess above-the-fold prominence."],
      affectedElements: ["primary CTA"],
      explanation: "Visual prominence requires rendered-page inspection.",
      recommendation: "Ensure the primary CTA is visible without excessive scrolling on mobile and desktop.",
      expectedUxOutcome: "Faster discovery of the main action.",
      potentialBusinessImpact: "May improve conversion opportunities.",
      estimatedEffort: "medium",
      businessImpact: "high",
    }),
  );

  if (s.forms.length) {
    const fieldCount = s.visibleFields.length;
    const requiredCount = s.requiredFields.length;
    let status = "passed";
    let severity = null;
    if (requiredCount > 7 || fieldCount > 10) {
      status = "warning";
      severity = "high";
    } else if (requiredCount > 5) {
      status = "warning";
      severity = "medium";
    }
    const factory = status === "passed" ? passedCheck : warningCheck;
    checks.push(
      factory({
        checkId: "conversion.form_friction",
        category: "conversion_experience",
        metric: "Form friction",
        maxScore: 10,
        severity,
        confidence: "high",
        measurementSource: "html",
        evidence: [
          `${fieldCount} visible field(s), ${requiredCount} marked required.`,
          `${s.forms.length} form(s) detected.`,
        ],
        affectedElements: ["form"],
        explanation:
          status === "passed"
            ? "Form length appears reasonable for an initial enquiry based on visible fields."
            : "The form may require more effort than necessary for an initial contact step.",
        recommendation: "Collect only essential fields first; request additional details after initial contact.",
        expectedUxOutcome: "Lower perceived effort for visitors.",
        potentialBusinessImpact: "May improve form completion rates.",
        estimatedEffort: "medium",
        businessImpact: status === "passed" ? "low" : "high",
        scoreRatio: status === "passed" ? 1 : 0.45,
      }),
    );

    if (s.unlabeled.length > 2) {
      checks.push(
        failedCheck({
          checkId: "conversion.form_labels",
          category: "conversion_experience",
          metric: "Form labels and instructions",
          maxScore: 10,
          severity: "high",
          confidence: "high",
          measurementSource: "html",
          evidence: [`${s.unlabeled.length} visible fields lack clear label associations.`],
          affectedElements: ["input", "textarea", "select"],
          explanation: "Fields without labels are harder to complete and may fail accessibility expectations.",
          recommendation: "Associate each field with a <label> or aria-label.",
          expectedUxOutcome: "Easier, more accessible form completion.",
          potentialBusinessImpact: "May reduce form errors and abandonment.",
          estimatedEffort: "low",
          businessImpact: "high",
        }),
      );
    } else {
      checks.push(
        passedCheck({
          checkId: "conversion.form_labels",
          category: "conversion_experience",
          metric: "Form labels and instructions",
          maxScore: 10,
          confidence: "high",
          measurementSource: "html",
          evidence: ["Visible form fields appear to have label associations."],
          affectedElements: ["form"],
          explanation: "Programmatic labels support usability and accessibility.",
          recommendation: "Maintain labels and helpful inline instructions.",
          expectedUxOutcome: "Clearer form completion.",
          potentialBusinessImpact: "Supports conversion on form-led journeys.",
          businessImpact: "medium",
        }),
      );
    }
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "conversion.form_friction",
        category: "conversion_experience",
        metric: "Form friction",
        maxScore: 10,
        explanation: "No HTML form detected on this page.",
      }),
    );
    checks.push(
      notApplicableCheck({
        checkId: "conversion.form_labels",
        category: "conversion_experience",
        metric: "Form labels and instructions",
        maxScore: 10,
      }),
    );
  }

  checks.push(
    manualReviewCheck({
      checkId: "conversion.trust_near_cta",
      category: "conversion_experience",
      metric: "Trust signals near conversion points",
      maxScore: 8,
      measurementSource: "html",
      evidence: s.hasPrivacy ? ["Policy-related links detected on the page."] : ["No obvious policy links near forms detected."],
      affectedElements: ["form", "footer"],
      explanation: "Trust reassurance near forms often requires contextual review.",
      recommendation: "Place privacy, security, or support reassurance near important forms or purchase actions.",
      expectedUxOutcome: "Increased confidence during conversion steps.",
      potentialBusinessImpact: "May improve completion on sensitive actions.",
      estimatedEffort: "low",
      businessImpact: "medium",
    }),
  );

  if (requiresFixedPricing(context)) {
    checks.push(
      manualReviewCheck({
        checkId: "conversion.pricing_clarity",
        category: "conversion_experience",
        metric: "Pricing or next-step clarity",
        maxScore: 8,
        measurementSource: "html",
        evidence: ["Pricing clarity requires rendered content review for this page type."],
        affectedElements: ["pricing", "product"],
        explanation: "Ecommerce and sales journeys benefit from clear commercial next steps.",
        recommendation: "Make pricing, shipping, or quotation steps explicit where relevant.",
        expectedUxOutcome: "Reduced uncertainty before purchase or enquiry.",
        potentialBusinessImpact: "May reduce hesitation in commercial journeys.",
        estimatedEffort: "medium",
        businessImpact: "high",
      }),
    );
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "conversion.pricing_clarity",
        category: "conversion_experience",
        metric: "Pricing or next-step clarity",
        maxScore: 8,
        explanation: "Fixed pricing is not required for this page type.",
      }),
    );
  }

  if (requiresCheckoutChecks(context)) {
    checks.push(
      manualReviewCheck({
        checkId: "conversion.ecommerce_checkout",
        category: "conversion_experience",
        metric: "Ecommerce checkout signals",
        maxScore: 10,
        measurementSource: "html",
        evidence: ["Checkout-specific checks require journey-level crawling (not included in free scan)."],
        affectedElements: ["checkout"],
        explanation: "Checkout, cart, and guest-checkout checks need additional pages.",
        recommendation: "Arrange an expert audit for full ecommerce journey review.",
        expectedUxOutcome: "Clearer purchase path.",
        potentialBusinessImpact: "May reduce checkout abandonment.",
        estimatedEffort: "high",
        businessImpact: "high",
      }),
    );
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "conversion.ecommerce_checkout",
        category: "conversion_experience",
        metric: "Ecommerce checkout signals",
        maxScore: 10,
      }),
    );
  }

  // --- Usability & navigation ---
  if (!s.h1Count) {
    checks.push(
      failedCheck({
        checkId: "usability.heading_h1",
        category: "usability_navigation",
        metric: "Primary heading (H1)",
        maxScore: 10,
        severity: "high",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No <h1> element detected."],
        affectedElements: ["h1"],
        explanation: "A missing H1 can weaken page structure and comprehension.",
        recommendation: "Add one descriptive H1 that summarises the page purpose.",
        expectedUxOutcome: "Clearer content hierarchy.",
        potentialBusinessImpact: "May improve scannability and orientation.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else if (s.h1Count > 1) {
    checks.push(
      warningCheck({
        checkId: "usability.heading_h1",
        category: "usability_navigation",
        metric: "Primary heading (H1)",
        maxScore: 10,
        severity: "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: [`${s.h1Count} <h1> elements detected.`],
        affectedElements: ["h1"],
        explanation: "Multiple H1 elements can dilute the primary page topic.",
        recommendation: "Use a single primary H1 and demote additional headings to H2/H3.",
        expectedUxOutcome: "Clearer information hierarchy.",
        potentialBusinessImpact: "May improve comprehension for first-time visitors.",
        estimatedEffort: "low",
        businessImpact: "low",
        scoreRatio: 0.6,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "usability.heading_h1",
        category: "usability_navigation",
        metric: "Primary heading (H1)",
        maxScore: 10,
        confidence: "high",
        measurementSource: "html",
        evidence: ["One <h1> element detected."],
        affectedElements: ["h1"],
        explanation: "The page has a single primary heading.",
        recommendation: "Keep the H1 aligned with the page’s main message.",
        expectedUxOutcome: "Stronger content hierarchy.",
        potentialBusinessImpact: "Supports orientation and scannability.",
        businessImpact: "low",
      }),
    );
  }

  if (s.navLinkCount > 40) {
    checks.push(
      warningCheck({
        checkId: "usability.nav_complexity",
        category: "usability_navigation",
        metric: "Navigation complexity",
        maxScore: 8,
        severity: "medium",
        confidence: "medium",
        measurementSource: "html",
        evidence: [`${s.navLinkCount} links detected in navigation-heavy areas.`],
        affectedElements: ["nav", "a"],
        explanation: "Large menus can increase cognitive load.",
        recommendation: "Prioritise top tasks and group secondary links.",
        expectedUxOutcome: "Easier wayfinding.",
        potentialBusinessImpact: "May reduce navigation friction.",
        estimatedEffort: "medium",
        businessImpact: "medium",
        scoreRatio: 0.5,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "usability.nav_complexity",
        category: "usability_navigation",
        metric: "Navigation complexity",
        maxScore: 8,
        confidence: "medium",
        measurementSource: "html",
        evidence: [`${s.navLinkCount} links detected — within a typical range.`],
        affectedElements: ["nav"],
        explanation: "Navigation size appears manageable from HTML signals.",
        recommendation: "Review navigation against top user tasks periodically.",
        expectedUxOutcome: "Maintainable navigation structure.",
        potentialBusinessImpact: "Supports efficient browsing.",
        businessImpact: "low",
      }),
    );
  }

  if (s.emptyLinks.length > 2) {
    checks.push(
      failedCheck({
        checkId: "usability.link_clarity",
        category: "usability_navigation",
        metric: "Link clarity",
        maxScore: 8,
        severity: "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: [`${s.emptyLinks.length} empty or placeholder links detected.`],
        affectedElements: ["a"],
        explanation: "Empty links create dead ends and accessibility issues.",
        recommendation: "Add descriptive link text or aria-labels; remove empty links.",
        expectedUxOutcome: "More predictable navigation.",
        potentialBusinessImpact: "May reduce frustration during browsing.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "usability.link_clarity",
        category: "usability_navigation",
        metric: "Link clarity",
        maxScore: 8,
        confidence: "high",
        measurementSource: "html",
        evidence: ["No significant empty-link pattern detected."],
        affectedElements: ["a"],
        explanation: "Links appear to include text content.",
        recommendation: "Avoid generic labels like “click here” without context.",
        expectedUxOutcome: "Clearer navigation labels.",
        potentialBusinessImpact: "Supports efficient browsing.",
        businessImpact: "low",
      }),
    );
  }

  if (requiresSiteSearch(context)) {
    checks.push(
      manualReviewCheck({
        checkId: "usability.search_availability",
        category: "usability_navigation",
        metric: "Search availability",
        maxScore: 6,
        measurementSource: "html",
        evidence: ["Search usefulness depends on site size and content type."],
        affectedElements: ["search"],
        explanation: "Content-heavy sites often benefit from search — expert review recommended.",
        recommendation: "Provide search if users need to find many items or articles.",
        expectedUxOutcome: "Faster content discovery.",
        potentialBusinessImpact: "May improve engagement on large sites.",
        estimatedEffort: "medium",
        businessImpact: "medium",
      }),
    );
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "usability.search_availability",
        category: "usability_navigation",
        metric: "Search availability",
        maxScore: 6,
        explanation: "Site search is not expected for this page type.",
      }),
    );
  }

  // --- Accessibility ---
  if (!s.hasLang) {
    checks.push(
      failedCheck({
        checkId: "a11y.document_language",
        category: "accessibility",
        metric: "Document language",
        maxScore: 8,
        severity: "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No lang attribute on <html>."],
        affectedElements: ["html"],
        explanation: "Screen readers rely on the document language.",
        recommendation: 'Add lang="en" or the correct locale on <html>.',
        expectedUxOutcome: "Better assistive technology support.",
        potentialBusinessImpact: "May reduce accessibility barriers.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "a11y.document_language",
        category: "accessibility",
        metric: "Document language",
        maxScore: 8,
        confidence: "high",
        measurementSource: "html",
        evidence: ["lang attribute detected on <html>."],
        affectedElements: ["html"],
        explanation: "Document language is declared.",
        recommendation: "Keep lang accurate for localized pages.",
        expectedUxOutcome: "Improved screen reader pronunciation.",
        potentialBusinessImpact: "Supports inclusive access.",
        businessImpact: "low",
      }),
    );
  }

  if (s.imgs.length && s.imgsMissingAlt.length) {
    checks.push(
      failedCheck({
        checkId: "a11y.image_alt",
        category: "accessibility",
        metric: "Image alternative text",
        maxScore: 10,
        severity: s.imgsMissingAlt.length > 2 ? "high" : "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: [
          `${s.imgsMissingAlt.length} of ${s.imgs.length} <img> elements lack meaningful alt text.`,
        ],
        affectedElements: ["img"],
        explanation: "Informative images need text alternatives for non-visual users.",
        recommendation: "Add descriptive alt text or alt=\"\" for decorative images.",
        expectedUxOutcome: "More inclusive image content.",
        potentialBusinessImpact: "May broaden audience reach.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else if (s.imgs.length) {
    checks.push(
      passedCheck({
        checkId: "a11y.image_alt",
        category: "accessibility",
        metric: "Image alternative text",
        maxScore: 10,
        confidence: "high",
        measurementSource: "html",
        evidence: [`${s.imgs.length} image(s) include alt attributes.`],
        affectedElements: ["img"],
        explanation: "Images appear to include alt attributes.",
        recommendation: "Review alt text quality during content updates.",
        expectedUxOutcome: "Inclusive image content.",
        potentialBusinessImpact: "Supports accessibility expectations.",
        businessImpact: "low",
      }),
    );
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "a11y.image_alt",
        category: "accessibility",
        metric: "Image alternative text",
        maxScore: 10,
        explanation: "No images detected on this page.",
      }),
    );
  }

  if (!s.hasMain) {
    checks.push(
      warningCheck({
        checkId: "a11y.landmarks",
        category: "accessibility",
        metric: "Semantic landmarks",
        maxScore: 8,
        severity: "low",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No <main> or role=\"main\" detected."],
        affectedElements: ["main"],
        explanation: "Landmarks help assistive technology users skip repetitive content.",
        recommendation: "Wrap primary content in a <main> element.",
        expectedUxOutcome: "Faster navigation for screen reader users.",
        potentialBusinessImpact: "May improve accessibility usability.",
        estimatedEffort: "low",
        businessImpact: "low",
        scoreRatio: 0.55,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "a11y.landmarks",
        category: "accessibility",
        metric: "Semantic landmarks",
        maxScore: 8,
        confidence: "high",
        measurementSource: "html",
        evidence: ["Main landmark detected."],
        affectedElements: ["main"],
        explanation: "A main landmark is present.",
        recommendation: "Ensure header, nav, and footer landmarks are also used where appropriate.",
        expectedUxOutcome: "Improved document structure.",
        potentialBusinessImpact: "Supports inclusive navigation.",
        businessImpact: "low",
      }),
    );
  }

  checks.push(
    notTestedCheck({
      checkId: "a11y.color_contrast",
      category: "accessibility",
      metric: "Colour contrast (computed)",
      maxScore: 10,
      measurementSource: "rendered_dom",
      evidence: ["Reliable WCAG contrast requires computed styles from a rendered page."],
      affectedElements: ["text", "button"],
      explanation: "Inline-style contrast checks are insufficient for full WCAG 2.2 AA assessment.",
      recommendation: "Run rendered-page contrast analysis or an expert accessibility review.",
      expectedUxOutcome: "Improved readability for low-vision users.",
      potentialBusinessImpact: "May reduce readability friction.",
      estimatedEffort: "medium",
      businessImpact: "medium",
    }),
  );

  checks.push(
    notTestedCheck({
      checkId: "a11y.keyboard_access",
      category: "accessibility",
      metric: "Keyboard accessibility",
      maxScore: 10,
      measurementSource: "rendered_dom",
      evidence: ["Keyboard path testing requires browser interaction analysis."],
      affectedElements: ["interactive elements"],
      explanation: "Tab order and keyboard traps cannot be confirmed from HTML alone.",
      recommendation: "Test keyboard navigation and focus visibility across key flows.",
      expectedUxOutcome: "Operable experience without a mouse.",
      potentialBusinessImpact: "May improve accessibility compliance and usability.",
      estimatedEffort: "medium",
      businessImpact: "high",
    }),
  );

  checks.push(
    notTestedCheck({
      checkId: "a11y.axe_engine",
      category: "accessibility",
      metric: "Automated accessibility rule engine",
      maxScore: 10,
      measurementSource: "axe",
      evidence: ["Full axe-core analysis is planned for rendered DOM scans (Phase 2)."],
      affectedElements: ["page"],
      explanation: "HTML heuristics are not a substitute for axe-core rule coverage.",
      recommendation: "Enable rendered accessibility scanning for broader WCAG-oriented checks.",
      expectedUxOutcome: "Broader automated accessibility coverage.",
      potentialBusinessImpact: "May surface additional accessibility risks.",
      estimatedEffort: "medium",
      businessImpact: "medium",
    }),
  );

  // --- Mobile ---
  if (!s.hasViewport) {
    checks.push(
      failedCheck({
        checkId: "mobile.viewport",
        category: "mobile_experience",
        metric: "Viewport configuration",
        maxScore: 10,
        severity: "critical",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No responsive viewport meta tag detected."],
        affectedElements: ['meta name="viewport"'],
        explanation: "Without a viewport tag, mobile browsers may render a desktop-scaled layout.",
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        expectedUxOutcome: "Proper mobile scaling.",
        potentialBusinessImpact: "May significantly affect mobile usability.",
        estimatedEffort: "low",
        businessImpact: "high",
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "mobile.viewport",
        category: "mobile_experience",
        metric: "Viewport configuration",
        maxScore: 10,
        confidence: "high",
        measurementSource: "html",
        evidence: ["Viewport meta tag detected."],
        affectedElements: ['meta name="viewport"'],
        explanation: "Responsive viewport configuration is present.",
        recommendation: "Test layouts at common mobile widths.",
        expectedUxOutcome: "Mobile-friendly scaling.",
        potentialBusinessImpact: "Supports mobile journeys.",
        businessImpact: "medium",
      }),
    );
  }

  checks.push(
    notTestedCheck({
      checkId: "mobile.overflow",
      category: "mobile_experience",
      metric: "Horizontal overflow",
      maxScore: 10,
      measurementSource: "rendered_dom",
      evidence: ["Overflow detection requires rendered mobile viewport analysis."],
      affectedElements: ["page layout"],
      explanation: "Enable Playwright rendering to test horizontal overflow at 390px width.",
      recommendation: "Set UX_AUDIT_PLAYWRIGHT=1 on environments with Chromium available.",
      expectedUxOutcome: "No sideways scrolling on phones.",
      potentialBusinessImpact: "May improve mobile task completion.",
      estimatedEffort: "medium",
      businessImpact: "high",
    }),
  );

  // --- Content & trust ---
  if (!s.title) {
    checks.push(
      failedCheck({
        checkId: "content.page_title",
        category: "content_trust",
        metric: "Page title quality",
        maxScore: 10,
        severity: "high",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No <title> element found."],
        affectedElements: ["title"],
        explanation: "Missing titles weaken browser tabs, bookmarks, and search snippets.",
        recommendation: "Add a descriptive title with brand and value proposition.",
        expectedUxOutcome: "Clearer first impression in search and tabs.",
        potentialBusinessImpact: "May affect discovery and trust.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    );
  } else if (s.title.length < 12) {
    checks.push(
      warningCheck({
        checkId: "content.page_title",
        category: "content_trust",
        metric: "Page title quality",
        maxScore: 10,
        severity: "medium",
        confidence: "high",
        measurementSource: "html",
        evidence: [`Title may be short: "${s.title.slice(0, 80)}"`],
        affectedElements: ["title"],
        explanation: "Very short titles may not communicate enough context.",
        recommendation: "Expand the title to describe the offer and audience.",
        expectedUxOutcome: "Clearer expectations before click-through.",
        potentialBusinessImpact: "May improve qualified traffic.",
        estimatedEffort: "low",
        businessImpact: "low",
        scoreRatio: 0.55,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "content.page_title",
        category: "content_trust",
        metric: "Page title quality",
        maxScore: 10,
        confidence: "high",
        measurementSource: "html",
        evidence: [`Title present: "${s.title.slice(0, 100)}"`],
        affectedElements: ["title"],
        explanation: "The page includes a descriptive title.",
        recommendation: "Keep titles unique across key pages.",
        expectedUxOutcome: "Clear browser and search context.",
        potentialBusinessImpact: "Supports discovery and trust.",
        businessImpact: "low",
      }),
    );
  }

  if (!s.metaDescription) {
    checks.push(
      warningCheck({
        checkId: "content.meta_description",
        category: "content_trust",
        metric: "Meta description availability",
        maxScore: 6,
        severity: "low",
        confidence: "high",
        measurementSource: "html",
        evidence: ["No meta description detected."],
        affectedElements: ['meta name="description"'],
        explanation: "Meta descriptions help set expectations in search results.",
        recommendation: "Add a concise summary focused on customer value.",
        expectedUxOutcome: "More informative search snippets.",
        potentialBusinessImpact: "Minor SEO and expectation-setting opportunity.",
        estimatedEffort: "low",
        businessImpact: "low",
        scoreRatio: 0.4,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "content.meta_description",
        category: "content_trust",
        metric: "Meta description availability",
        maxScore: 6,
        confidence: "high",
        measurementSource: "html",
        evidence: ["Meta description tag detected."],
        affectedElements: ['meta name="description"'],
        explanation: "Meta description is available.",
        recommendation: "Keep descriptions aligned with on-page messaging.",
        expectedUxOutcome: "Consistent search expectations.",
        potentialBusinessImpact: "Supports qualified traffic.",
        businessImpact: "low",
      }),
    );
  }

  if (requiresContactTransparency(context)) {
    if (!s.hasContact) {
      checks.push(
        warningCheck({
          checkId: "content.contact_transparency",
          category: "content_trust",
          metric: "Contact transparency",
          maxScore: 8,
          severity: "medium",
          confidence: "low",
          measurementSource: "html",
          evidence: ["No obvious email, phone, or contact link detected in HTML."],
          affectedElements: ["contact"],
          explanation: "Contact paths may exist in rendered UI or linked pages not detected here.",
          recommendation: "Make a clear contact method visible for business visitors.",
          expectedUxOutcome: "Lower anxiety for high-intent visitors.",
          potentialBusinessImpact: "May improve enquiry opportunities.",
          estimatedEffort: "low",
          businessImpact: "medium",
          requiresExpertReview: true,
          scoreRatio: 0.45,
        }),
      );
    } else {
      checks.push(
        passedCheck({
          checkId: "content.contact_transparency",
          category: "content_trust",
          metric: "Contact transparency",
          maxScore: 8,
          confidence: "low",
          measurementSource: "html",
          evidence: ["Contact-related signals detected in HTML."],
          affectedElements: ["contact"],
          explanation: "Some contact signals are visible in the page HTML.",
          recommendation: "Ensure contact options match your sales process.",
          expectedUxOutcome: "Easier access to support or sales.",
          potentialBusinessImpact: "Supports trust for B2B visitors.",
          businessImpact: "medium",
        }),
      );
    }
  } else {
    checks.push(
      notApplicableCheck({
        checkId: "content.contact_transparency",
        category: "content_trust",
        metric: "Contact transparency",
        maxScore: 8,
        explanation: "Contact expectations differ for portfolio-style pages.",
      }),
    );
  }

  if (!s.hasPrivacy) {
    checks.push(
      warningCheck({
        checkId: "content.policy_links",
        category: "content_trust",
        metric: "Policy availability",
        maxScore: 8,
        severity: "low",
        confidence: "low",
        measurementSource: "html",
        evidence: ["No obvious privacy, cookie, or terms links detected."],
        affectedElements: ["footer", "legal"],
        explanation: "Policy links may exist on separate pages not linked in fetched HTML.",
        recommendation: "Ensure privacy and cookie information is easy to find.",
        expectedUxOutcome: "Stronger trust signals.",
        potentialBusinessImpact: "May affect confidence before form submission.",
        estimatedEffort: "low",
        businessImpact: "medium",
        requiresExpertReview: true,
        scoreRatio: 0.5,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "content.policy_links",
        category: "content_trust",
        metric: "Policy availability",
        maxScore: 8,
        confidence: "low",
        measurementSource: "html",
        evidence: ["Policy-related link text detected."],
        affectedElements: ["footer"],
        explanation: "Some policy or legal references are present.",
        recommendation: "Keep legal pages up to date and easy to access.",
        expectedUxOutcome: "Improved trust communication.",
        potentialBusinessImpact: "Supports confidence during data collection.",
        businessImpact: "low",
      }),
    );
  }

  if (s.text.length < 200) {
    checks.push(
      warningCheck({
        checkId: "content.message_clarity",
        category: "content_trust",
        metric: "Visible message clarity",
        maxScore: 8,
        severity: "medium",
        confidence: "low",
        measurementSource: "html",
        evidence: [`Approx. ${s.text.length} characters of visible text extracted from HTML.`],
        affectedElements: ["body"],
        explanation: "Limited visible text may indicate script-rendered content or unclear messaging.",
        recommendation: "Ensure key value proposition text is available in HTML or early render.",
        expectedUxOutcome: "Clearer first impression.",
        potentialBusinessImpact: "May affect comprehension for first-time visitors.",
        estimatedEffort: "medium",
        businessImpact: "medium",
        requiresExpertReview: true,
        scoreRatio: 0.45,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "content.message_clarity",
        category: "content_trust",
        metric: "Visible message clarity",
        maxScore: 8,
        confidence: "low",
        measurementSource: "html",
        evidence: [`Approx. ${s.text.length} characters of visible text extracted.`],
        affectedElements: ["body"],
        explanation: "The page contains a reasonable amount of readable text in HTML.",
        recommendation: "Review whether the opening content states offer, audience, and next step.",
        expectedUxOutcome: "Improved scannability.",
        potentialBusinessImpact: "Supports comprehension.",
        businessImpact: "low",
        requiresExpertReview: true,
      }),
    );
  }

  if (isHttps) {
    checks.push(
      passedCheck({
        checkId: "content.https",
        category: "content_trust",
        metric: "HTTPS transport",
        maxScore: 8,
        confidence: "high",
        measurementSource: "html",
        evidence: [`Page fetched over HTTPS: ${pageUrl}`],
        affectedElements: ["page"],
        explanation: "The audited page uses HTTPS.",
        recommendation: "Ensure all embedded resources also load securely.",
        expectedUxOutcome: "Secure browsing experience.",
        potentialBusinessImpact: "Supports customer trust.",
        businessImpact: "medium",
      }),
    );
    if (/src=["']http:\/\//i.test(html)) {
      checks.push(
        warningCheck({
          checkId: "content.mixed_content",
          category: "content_trust",
          metric: "Mixed content references",
          maxScore: 6,
          severity: "medium",
          confidence: "high",
          measurementSource: "html",
          evidence: ["HTTP resource URLs referenced on an HTTPS page."],
          affectedElements: ["assets"],
          explanation: "Mixed content can break assets or weaken security indicators.",
          recommendation: "Serve all assets over HTTPS.",
          expectedUxOutcome: "Consistent secure experience.",
          potentialBusinessImpact: "May affect trust and reliability.",
          estimatedEffort: "medium",
          businessImpact: "medium",
          scoreRatio: 0.4,
        }),
      );
    }
  } else {
    checks.push(
      failedCheck({
        checkId: "content.https",
        category: "content_trust",
        metric: "HTTPS transport",
        maxScore: 8,
        severity: "high",
        confidence: "high",
        measurementSource: "html",
        evidence: ["Page was not served over HTTPS."],
        affectedElements: ["page"],
        explanation: "HTTPS is expected for business websites handling customer data.",
        recommendation: "Enable HTTPS across the site with a valid certificate.",
        expectedUxOutcome: "Secure browsing experience.",
        potentialBusinessImpact: "May reduce trust and browser warnings.",
        estimatedEffort: "medium",
        businessImpact: "high",
      }),
    );
  }

  // --- Performance (HTML timing only; PageSpeed checks added separately) ---
  if (responseTimeMs > 4000) {
    checks.push(
      failedCheck({
        checkId: "performance.html_response",
        category: "performance",
        metric: "Initial HTML response time",
        maxScore: 8,
        severity: "high",
        confidence: "medium",
        measurementSource: "html",
        evidence: [`HTML response time: ${responseTimeMs}ms.`],
        affectedElements: ["server response"],
        explanation: "Slow initial HTML can delay first paint.",
        recommendation: "Review hosting, caching, and server response performance.",
        expectedUxOutcome: "Faster perceived load.",
        potentialBusinessImpact: "May increase bounce on slower connections.",
        estimatedEffort: "high",
        businessImpact: "high",
      }),
    );
  } else if (responseTimeMs > 2000) {
    checks.push(
      warningCheck({
        checkId: "performance.html_response",
        category: "performance",
        metric: "Initial HTML response time",
        maxScore: 8,
        severity: "medium",
        confidence: "medium",
        measurementSource: "html",
        evidence: [`HTML response time: ${responseTimeMs}ms.`],
        affectedElements: ["server response"],
        explanation: "Response time is acceptable but could be improved.",
        recommendation: "Optimise caching and critical path delivery.",
        expectedUxOutcome: "Snappier first response.",
        potentialBusinessImpact: "Potential mobile performance opportunity.",
        estimatedEffort: "medium",
        businessImpact: "medium",
        scoreRatio: 0.55,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "performance.html_response",
        category: "performance",
        metric: "Initial HTML response time",
        maxScore: 8,
        confidence: "medium",
        measurementSource: "html",
        evidence: [`HTML response time: ${responseTimeMs}ms.`],
        affectedElements: ["server response"],
        explanation: "Initial HTML response time is within a reasonable range.",
        recommendation: "Monitor performance alongside Core Web Vitals.",
        expectedUxOutcome: "Responsive server delivery.",
        potentialBusinessImpact: "Supports fast first paint.",
        businessImpact: "low",
      }),
    );
  }

  return checks;
}
