import { normalizeResult, uid } from "./schema.js";

const A11Y_SNIPPET = `
(() => {
  const issues = [];
  if (!document.querySelector('main, [role="main"]')) {
    issues.push({ id: 'landmark-main', impact: 'moderate', description: 'Missing main landmark' });
  }
  const images = Array.from(document.querySelectorAll('img'));
  for (const img of images) {
    if (!img.getAttribute('alt') && img.getAttribute('alt') !== '') {
      issues.push({ id: 'img-alt', impact: 'serious', description: 'Image missing alt attribute', target: img.src?.slice(0, 120) });
    }
  }
  const buttons = Array.from(document.querySelectorAll('button, a'));
  for (const el of buttons.slice(0, 50)) {
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
    if (!text) {
      issues.push({ id: 'name-missing', impact: 'serious', description: 'Interactive element missing accessible name' });
    }
  }
  return { violations: issues, passes: Math.max(0, 3 - Math.min(3, issues.length)) };
})()
`;

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const err = new Error(
      "Playwright is not installed. Run: npm install playwright && npx playwright install chromium",
    );
    err.status = 501;
    err.code = "PLAYWRIGHT_MISSING";
    throw err;
  }
}

function joinUrl(base, path) {
  if (!path || path === "/") return base;
  try {
    return new URL(path, base).href;
  } catch {
    return base;
  }
}

async function runStep(page, step, ctx) {
  const action = String(step.action || "").toLowerCase();
  const started = Date.now();
  const out = {
    id: step.id,
    action,
    status: "passed",
    duration_ms: 0,
    error: null,
    meta: {},
  };

  try {
    if (action === "goto") {
      const href = joinUrl(ctx.baseUrl, step.value || "/");
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30000 });
    } else if (action === "click") {
      await page.locator(step.selector || "body").first().click({ timeout: 10000 });
    } else if (action === "fill" || action === "type") {
      await page.locator(step.selector).first().fill(step.value || "", { timeout: 10000 });
    } else if (action === "assert_visible") {
      await page.locator(step.selector || "body").first().waitFor({ state: "visible", timeout: 10000 });
    } else if (action === "assert_text") {
      const content = await page.content();
      if (step.value && !content.toLowerCase().includes(String(step.value).toLowerCase())) {
        // Soft assertion for generated AC tests — page may not contain literal text
        out.status = "failed";
        out.error = `Text not found: ${step.value}`;
      }
    } else if (action === "assert_no_console_errors") {
      const severe = ctx.consoleErrors.filter((m) => /error|uncaught/i.test(m));
      if (severe.length) {
        out.status = "failed";
        out.error = severe.slice(0, 3).join("; ");
      }
    } else if (action === "a11y_scan") {
      out.meta.accessibility = await page.evaluate(A11Y_SNIPPET);
      if ((out.meta.accessibility?.violations || []).some((v) => v.impact === "critical" || v.impact === "serious")) {
        out.status = "failed";
        out.error = "Accessibility issues found";
      }
    } else if (action === "api_get") {
      const href = joinUrl(ctx.baseUrl, step.value || "/");
      const res = await page.request.get(href, { timeout: 15000 });
      out.meta.status = res.status();
      if (res.status() >= 500) {
        out.status = "failed";
        out.error = `HTTP ${res.status()}`;
      }
    } else if (action === "wait") {
      await page.waitForTimeout(Math.min(5000, Number(step.value) || 500));
    } else if (action === "screenshot") {
      const buf = await page.screenshot({ fullPage: false, type: "png" });
      out.meta.screenshot = {
        id: uid("shot"),
        mime: "image/png",
        data_url: `data:image/png;base64,${buf.toString("base64").slice(0, 400000)}`,
      };
    } else {
      out.status = "failed";
      out.error = `Unknown action: ${action}`;
    }
  } catch (err) {
    out.status = "failed";
    out.error = err.message || String(err);
  }

  out.duration_ms = Date.now() - started;
  return out;
}

export async function executeRunPayload({
  run,
  target,
  testCases,
  secrets = {},
  onProgress,
  shouldCancel,
}) {
  const playwright = await loadPlaywright();
  const results = [];
  const browsers = run.browsers?.length ? run.browsers : ["chromium"];
  const viewports = run.viewports?.length ? run.viewports : [{ name: "desktop", width: 1280, height: 720 }];

  for (const browserName of browsers) {
    if (shouldCancel?.()) break;
    const launcher = playwright[browserName];
    if (!launcher) {
      results.push(
        normalizeResult(
          {
            test_case_id: testCases[0]?.id || "none",
            browser: browserName,
            status: "error",
            error_message: `Browser ${browserName} is not available in this Playwright install`,
          },
          run.id,
        ),
      );
      continue;
    }

    let browser;
    try {
      browser = await launcher.launch({ headless: true });
    } catch (err) {
      results.push(
        normalizeResult(
          {
            test_case_id: testCases[0]?.id || "none",
            browser: browserName,
            status: "error",
            error_message: `Failed to launch ${browserName}: ${err.message}. Run: npx playwright install ${browserName}`,
          },
          run.id,
        ),
      );
      continue;
    }

    try {
      for (const viewport of viewports) {
        for (const testCase of testCases) {
          if (shouldCancel?.()) {
            results.push(
              normalizeResult(
                {
                  test_case_id: testCase.id,
                  browser: browserName,
                  viewport,
                  status: "cancelled",
                  error_message: "Run cancelled",
                },
                run.id,
              ),
            );
            continue;
          }

          const started = Date.now();
          const consoleErrors = [];
          const networkErrors = [];
          const context = await browser.newContext({
            viewport: { width: viewport.width || 1280, height: viewport.height || 720 },
            extraHTTPHeaders: secrets.AUTH_HEADER ? { Authorization: secrets.AUTH_HEADER } : undefined,
          });
          const page = await context.newPage();
          page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors.push(msg.text());
          });
          page.on("pageerror", (err) => consoleErrors.push(String(err.message || err)));
          page.on("requestfailed", (req) => {
            networkErrors.push(`${req.failure()?.errorText || "failed"} ${req.url()}`);
          });

          const ctx = {
            baseUrl: target.base_url,
            consoleErrors,
            networkErrors,
            secrets,
          };

          const stepResults = [];
          let status = "passed";
          let errorMessage = null;
          let accessibility = null;
          let screenshotList = [];

          try {
            for (const step of testCase.steps || []) {
              if (shouldCancel?.()) {
                status = "cancelled";
                errorMessage = "Run cancelled";
                break;
              }
              if (target.safety_settings?.read_only_exploration && ["fill", "type", "click"].includes(step.action)) {
                if (!target.safety_settings.allow_form_submit) {
                  stepResults.push({
                    id: step.id,
                    action: step.action,
                    status: "skipped",
                    duration_ms: 0,
                    error: "Blocked by production safety settings",
                  });
                  continue;
                }
              }
              const stepOut = await runStep(page, step, ctx);
              stepResults.push(stepOut);
              if (stepOut.meta?.accessibility) accessibility = stepOut.meta.accessibility;
              if (stepOut.meta?.screenshot) screenshotList.push(stepOut.meta.screenshot);
              if (stepOut.status === "failed") {
                status = "failed";
                errorMessage = stepOut.error;
                break;
              }
            }

            if (status === "passed" && run.options?.accessibility && !accessibility) {
              accessibility = await page.evaluate(A11Y_SNIPPET);
            }

            let performance = null;
            if (run.options?.performance || testCase.type === "performance") {
              performance = await page.evaluate(() => {
                const nav = performance.getEntriesByType("navigation")[0];
                return nav
                  ? {
                      ttfb_ms: Math.round(nav.responseStart),
                      dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd),
                      load_ms: Math.round(nav.loadEventEnd),
                    }
                  : null;
              });
            }

            let brokenLinks = [];
            if (run.options?.broken_links) {
              const hrefs = await page.$$eval("a[href]", (as) =>
                as.map((a) => a.href).filter((h) => h.startsWith("http")).slice(0, 25),
              );
              for (const href of hrefs) {
                try {
                  const res = await page.request.get(href, { timeout: 8000 });
                  if (res.status() >= 400) brokenLinks.push({ href, status: res.status() });
                } catch {
                  brokenLinks.push({ href, status: 0 });
                }
              }
            }

            if (run.options?.capture_screenshots !== false && target.safety_settings?.capture_screenshots !== false) {
              try {
                const buf = await page.screenshot({ type: "png" });
                screenshotList.push({
                  id: uid("shot"),
                  mime: "image/png",
                  data_url: `data:image/png;base64,${buf.toString("base64").slice(0, 400000)}`,
                });
              } catch {
                /* ignore */
              }
            }
          } catch (err) {
            status = "error";
            errorMessage = err.message || String(err);
          } finally {
            await context.close().catch(() => {});
          }

          const result = normalizeResult(
            {
              test_case_id: testCase.id,
              browser: browserName,
              viewport,
              status,
              duration_ms: Date.now() - started,
              steps: stepResults,
              screenshots: screenshotList.slice(0, 3),
              console_errors: consoleErrors.slice(0, 20),
              network_errors: networkErrors.slice(0, 20),
              accessibility,
              performance,
              broken_links: brokenLinks,
              error_message: errorMessage,
            },
            run.id,
          );
          results.push(result);
          if (onProgress) await onProgress({ result, results });
        }
      }
    } finally {
      await browser.close().catch(() => {});
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    cancelled: results.filter((r) => r.status === "cancelled").length,
  };

  let finalStatus = "passed";
  if (summary.cancelled) finalStatus = "cancelled";
  else if (summary.errors) finalStatus = "error";
  else if (summary.failed) finalStatus = "failed";

  return { results, summary, status: finalStatus };
}
