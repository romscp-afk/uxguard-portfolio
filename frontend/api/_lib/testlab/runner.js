import { normalizeResult, uid } from "./schema.js";
import {
  baselineKey,
  compareScreenshotBuffers,
  normalizeBaseline,
  screenshotFingerprint,
} from "./visual.js";

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
  const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
  for (const el of buttons.slice(0, 80)) {
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
    if (!text) {
      issues.push({ id: 'name-missing', impact: 'serious', description: 'Interactive element missing accessible name' });
    }
  }
  const htmlLang = document.documentElement.getAttribute('lang');
  if (!htmlLang) {
    issues.push({ id: 'html-lang', impact: 'moderate', description: 'Missing html lang attribute' });
  }
  return { violations: issues, passes: Math.max(0, 4 - Math.min(4, issues.length)) };
})()
`;

export const DEFAULT_VIEWPORTS = {
  desktop: { name: "desktop", width: 1280, height: 720 },
  tablet: { name: "tablet", width: 768, height: 1024 },
  mobile: { name: "mobile", width: 390, height: 844 },
};

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

function interpolate(value, vars) {
  if (value == null) return "";
  return String(value).replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (_, key) => {
    const k = String(key).toUpperCase();
    return vars[k] != null ? String(vars[k]) : "";
  });
}

function expandDataDrivenCases(testCases) {
  const expanded = [];
  for (const tc of testCases) {
    const sets = Array.isArray(tc.data_sets) && tc.data_sets.length ? tc.data_sets : [null];
    sets.forEach((dataSet, index) => {
      if (!dataSet) {
        expanded.push(tc);
        return;
      }
      const label = dataSet.name || dataSet.label || `set_${index + 1}`;
      expanded.push({
        ...tc,
        id: tc.id,
        _data_set: dataSet,
        _data_label: label,
        title: `${tc.title} [${label}]`,
        steps: (tc.steps || []).map((step) => ({
          ...step,
          value: interpolate(step.value, flattenVars(dataSet)),
          selector: interpolate(step.selector, flattenVars(dataSet)),
          assertion: interpolate(step.assertion, flattenVars(dataSet)),
        })),
      });
    });
  }
  return expanded;
}

function flattenVars(dataSet) {
  const out = {};
  if (!dataSet || typeof dataSet !== "object") return out;
  for (const [k, v] of Object.entries(dataSet)) {
    if (k === "name" || k === "label") continue;
    out[String(k).toUpperCase()] = v;
  }
  return out;
}

function resolveViewports(run) {
  if (run.viewports?.length) return run.viewports;
  if (run.options?.responsive) {
    return [DEFAULT_VIEWPORTS.desktop, DEFAULT_VIEWPORTS.tablet, DEFAULT_VIEWPORTS.mobile];
  }
  return [DEFAULT_VIEWPORTS.desktop];
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

  const value = interpolate(step.value, ctx.vars);
  const selector = interpolate(step.selector, ctx.vars);

  try {
    if (action === "goto") {
      const href = joinUrl(ctx.baseUrl, value || "/");
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30000 });
    } else if (action === "click") {
      await page.locator(selector || "body").first().click({ timeout: 10000 });
    } else if (action === "fill" || action === "type") {
      await page.locator(selector).first().fill(value || "", { timeout: 10000 });
    } else if (action === "press") {
      await page.keyboard.press(value || "Enter");
    } else if (action === "login") {
      // value format: userSelector|passSelector|submitSelector  OR use secrets LOGIN_USER/LOGIN_PASS
      const parts = String(step.assertion || selector || "").split("|").map((s) => s.trim());
      const userSel = parts[0] || 'input[type="email"], input[name="email"], #email, #username';
      const passSel = parts[1] || 'input[type="password"], input[name="password"], #password';
      const submitSel = parts[2] || 'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")';
      const user = value || ctx.secrets.LOGIN_USER || ctx.secrets.USERNAME || "";
      const pass = ctx.secrets.LOGIN_PASS || ctx.secrets.PASSWORD || "";
      if (!user || !pass) {
        out.status = "failed";
        out.error = "LOGIN_USER/LOGIN_PASS secrets required for login step";
      } else {
        await page.locator(userSel).first().fill(user, { timeout: 10000 });
        await page.locator(passSel).first().fill(pass, { timeout: 10000 });
        await page.locator(submitSel).first().click({ timeout: 10000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
      }
    } else if (action === "assert_visible") {
      await page.locator(selector || "body").first().waitFor({ state: "visible", timeout: 10000 });
    } else if (action === "assert_text") {
      const content = await page.content();
      if (value && !content.toLowerCase().includes(String(value).toLowerCase())) {
        out.status = "failed";
        out.error = `Text not found: ${value}`;
      }
    } else if (action === "assert_url") {
      const url = page.url();
      if (value && !url.includes(value)) {
        out.status = "failed";
        out.error = `URL does not include ${value} (got ${url})`;
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
      const href = joinUrl(ctx.baseUrl, value || "/");
      const res = await page.request.get(href, { timeout: 15000 });
      out.meta.status = res.status();
      if (res.status() >= 500) {
        out.status = "failed";
        out.error = `HTTP ${res.status()}`;
      }
    } else if (action === "wait") {
      await page.waitForTimeout(Math.min(5000, Number(value) || 500));
    } else if (action === "screenshot" || action === "visual_assert") {
      const buf = await page.screenshot({ fullPage: false, type: "png" });
      out.meta.screenshot = {
        id: uid("shot"),
        mime: "image/png",
        data_url: `data:image/png;base64,${buf.toString("base64").slice(0, 400000)}`,
        buffer: buf,
        fingerprint: screenshotFingerprint(buf),
      };
      if (action === "visual_assert" || ctx.visualEnabled) {
        out.meta.visual_pending = true;
      }
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

async function executeSingleCase({
  browser,
  browserName,
  viewport,
  testCase,
  run,
  target,
  secrets,
  baselines,
  shouldCancel,
}) {
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

  const vars = {
    ...Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k.toUpperCase(), v])),
    ...flattenVars(testCase._data_set),
  };

  const ctx = {
    baseUrl: target.base_url,
    consoleErrors,
    networkErrors,
    secrets,
    vars,
    visualEnabled: Boolean(run.options?.visual || testCase.type === "visual"),
  };

  const stepResults = [];
  let status = "passed";
  let errorMessage = null;
  let accessibility = null;
  let screenshotList = [];
  let visualDiff = null;
  let baselineUpdates = [];

  try {
    // Optional auto-login when secrets present and option set
    if (run.options?.authenticated && (secrets.LOGIN_USER || secrets.USERNAME)) {
      const loginStep = {
        id: "auto_login",
        action: "login",
        value: secrets.LOGIN_USER || secrets.USERNAME,
        selector: "",
        assertion: "",
      };
      const loginOut = await runStep(page, loginStep, ctx);
      stepResults.push(loginOut);
      if (loginOut.status === "failed") {
        status = "failed";
        errorMessage = loginOut.error;
      }
    }

    if (status === "passed") {
      for (const step of testCase.steps || []) {
        if (shouldCancel?.()) {
          status = "cancelled";
          errorMessage = "Run cancelled";
          break;
        }
        const destructive = ["fill", "type", "click", "login", "press"].includes(
          String(step.action || "").toLowerCase(),
        );
        if (
          target.safety_settings?.read_only_exploration &&
          destructive &&
          !target.safety_settings.allow_form_submit
        ) {
          stepResults.push({
            id: step.id,
            action: step.action,
            status: "skipped",
            duration_ms: 0,
            error: "Blocked by production safety settings",
          });
          continue;
        }
        const stepOut = await runStep(page, step, ctx);
        const { buffer, ...shotMeta } = stepOut.meta?.screenshot || {};
        if (stepOut.meta?.screenshot) {
          stepOut.meta.screenshot = shotMeta;
          screenshotList.push(shotMeta);
        }
        stepResults.push(stepOut);
        if (stepOut.meta?.accessibility) accessibility = stepOut.meta.accessibility;

        if ((stepOut.meta?.visual_pending || ctx.visualEnabled) && buffer) {
          const key = baselineKey(testCase.id, browserName, viewport.name);
          const existing = baselines.get(key);
          if (!existing) {
            baselineUpdates.push(
              normalizeBaseline({
                project_id: run.project_id,
                test_case_id: testCase.id,
                browser: browserName,
                viewport_name: viewport.name,
                fingerprint: screenshotFingerprint(buffer),
                data_url: `data:image/png;base64,${buffer.toString("base64").slice(0, 400000)}`,
              }),
            );
            visualDiff = { status: "baseline_created", key };
          } else {
            let baselineBuf = null;
            try {
              const b64 = String(existing.data_url || "").split(",")[1];
              baselineBuf = Buffer.from(b64 || "", "base64");
            } catch {
              baselineBuf = null;
            }
            const cmp = compareScreenshotBuffers(baselineBuf, buffer);
            visualDiff = { ...cmp, key, fingerprint: screenshotFingerprint(buffer) };
            if (!cmp.match) {
              status = "failed";
              errorMessage = `Visual regression detected (diff ${cmp.diff_ratio})`;
            }
          }
        }

        if (stepOut.status === "failed") {
          status = "failed";
          errorMessage = stepOut.error;
          break;
        }
      }
    }

    if (status === "passed" && run.options?.accessibility && !accessibility) {
      accessibility = await page.evaluate(A11Y_SNIPPET);
      if ((accessibility?.violations || []).some((v) => v.impact === "serious" || v.impact === "critical")) {
        status = "failed";
        errorMessage = "Accessibility issues found";
      }
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
      if (brokenLinks.length) {
        status = status === "passed" ? "failed" : status;
        errorMessage = errorMessage || `${brokenLinks.length} broken link(s)`;
      }
    }

    // Default visual capture when visual option on and no screenshot yet
    if (
      status !== "cancelled" &&
      (run.options?.visual || testCase.type === "visual") &&
      !visualDiff
    ) {
      try {
        const buf = await page.screenshot({ type: "png" });
        const key = baselineKey(testCase.id, browserName, viewport.name);
        const existing = baselines.get(key);
        const shot = {
          id: uid("shot"),
          mime: "image/png",
          data_url: `data:image/png;base64,${buf.toString("base64").slice(0, 400000)}`,
          fingerprint: screenshotFingerprint(buf),
        };
        screenshotList.push(shot);
        if (!existing) {
          baselineUpdates.push(
            normalizeBaseline({
              project_id: run.project_id,
              test_case_id: testCase.id,
              browser: browserName,
              viewport_name: viewport.name,
              fingerprint: shot.fingerprint,
              data_url: shot.data_url,
            }),
          );
          visualDiff = { status: "baseline_created", key };
        } else {
          let baselineBuf = null;
          try {
            baselineBuf = Buffer.from(String(existing.data_url || "").split(",")[1] || "", "base64");
          } catch {
            baselineBuf = null;
          }
          const cmp = compareScreenshotBuffers(baselineBuf, buf);
          visualDiff = { ...cmp, key, fingerprint: shot.fingerprint };
          if (!cmp.match) {
            status = "failed";
            errorMessage = `Visual regression detected (diff ${cmp.diff_ratio})`;
          }
        }
      } catch {
        /* ignore */
      }
    } else if (
      run.options?.capture_screenshots !== false &&
      target.safety_settings?.capture_screenshots !== false &&
      screenshotList.length === 0
    ) {
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

    return {
      result: normalizeResult(
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
          visual_diff: visualDiff,
          error_message: errorMessage,
          data_set: testCase._data_label || null,
        },
        run.id,
      ),
      baselineUpdates,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

export async function executeSmokeRunPayload({
  run,
  target,
  testCases,
  onProgress,
  shouldCancel,
}) {
  const results = [];
  const expanded = expandDataDrivenCases(testCases);
  const browsers = run.browsers?.length ? run.browsers : ["chromium"];
  const base = String(target?.base_url || "").replace(/\/$/, "");

  for (const browserName of browsers) {
    for (const testCase of expanded) {
      if (shouldCancel?.()) {
        results.push(
          normalizeResult(
            {
              test_case_id: testCase.id,
              browser: browserName,
              status: "cancelled",
              error_message: "Run cancelled",
            },
            run.id,
          ),
        );
        continue;
      }

      const started = Date.now();
      const gotoStep = (testCase.steps || []).find((s) => s.action === "goto") || {
        value: "/",
      };
      const url = joinUrl(base, interpolate(gotoStep.value || "/", testCase._data_vars || {}));
      let status = "passed";
      let errorMessage = null;
      const stepResults = [];

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "UXGuard-TestLab-Smoke/1.0" },
        });
        clearTimeout(timer);
        const ok = res.status >= 200 && res.status < 400;
        stepResults.push({
          action: "goto",
          value: url,
          status: ok ? "passed" : "failed",
          detail: `HTTP ${res.status}`,
        });
        if (!ok) {
          status = "failed";
          errorMessage = `Smoke check failed: ${url} returned HTTP ${res.status}`;
        } else {
          const assertStep = (testCase.steps || []).find(
            (s) => s.action === "assert_visible" || s.action === "assert_text",
          );
          if (assertStep?.value || assertStep?.selector) {
            const body = await res.text().catch(() => "");
            const needle = String(assertStep.value || assertStep.selector || "").trim();
            if (needle && !body.toLowerCase().includes(needle.toLowerCase())) {
              status = "failed";
              errorMessage = `Expected content not found: ${needle}`;
              stepResults.push({
                action: assertStep.action,
                value: needle,
                status: "failed",
              });
            } else {
              stepResults.push({
                action: assertStep.action,
                value: needle || "body",
                status: "passed",
              });
            }
          }
        }
      } catch (err) {
        status = "error";
        errorMessage = `Smoke check error for ${url}: ${err.message}`;
        stepResults.push({ action: "goto", value: url, status: "error", detail: err.message });
      }

      const result = normalizeResult(
        {
          test_case_id: testCase.id,
          browser: browserName,
          viewport: { name: "desktop", width: 1280, height: 720 },
          status,
          duration_ms: Date.now() - started,
          steps: stepResults,
          error_message: errorMessage,
          data_set: testCase._data_label || null,
          notes: "Executed via HTTP smoke fallback (Playwright unavailable in this environment)",
        },
        run.id,
      );
      results.push(result);
      if (onProgress) await onProgress({ result, results });
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
  if (summary.cancelled && summary.cancelled === summary.total) finalStatus = "cancelled";
  else if (summary.errors) finalStatus = "error";
  else if (summary.failed) finalStatus = "failed";
  else if (summary.cancelled) finalStatus = "cancelled";

  return {
    results,
    summary,
    status: finalStatus,
    baselineUpdates: [],
    execution_mode: "smoke",
  };
}

export async function executeRunPayload(args) {
  try {
    const outcome = await executePlaywrightRunPayload(args);
    return { ...outcome, execution_mode: "playwright" };
  } catch (err) {
    const missing =
      err?.code === "PLAYWRIGHT_MISSING" ||
      /Playwright is not installed|Cannot find module ['"]playwright['"]/i.test(err?.message || "");
    if (!missing) throw err;
    return executeSmokeRunPayload(args);
  }
}

async function executePlaywrightRunPayload({
  run,
  target,
  testCases,
  secrets = {},
  baselines = [],
  onProgress,
  shouldCancel,
}) {
  const playwright = await loadPlaywright();
  const results = [];
  const baselineUpdates = [];
  const browsers = run.browsers?.length ? run.browsers : ["chromium"];
  const viewports = resolveViewports(run);
  const expanded = expandDataDrivenCases(testCases);
  const baselineMap = new Map(
    baselines.map((b) => [baselineKey(b.test_case_id, b.browser, b.viewport_name), b]),
  );

  for (const browserName of browsers) {
    if (shouldCancel?.()) break;
    const launcher = playwright[browserName];
    if (!launcher) {
      results.push(
        normalizeResult(
          {
            test_case_id: expanded[0]?.id || "none",
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
      // Browser binaries often missing on serverless — fall back to smoke checks.
      return executeSmokeRunPayload({ run, target, testCases, onProgress, shouldCancel });
    }

    try {
      for (const viewport of viewports) {
        for (const testCase of expanded) {
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

          const { result, baselineUpdates: updates } = await executeSingleCase({
            browser,
            browserName,
            viewport,
            testCase,
            run,
            target,
            secrets,
            baselines: baselineMap,
            shouldCancel,
          });
          results.push(result);
          for (const b of updates || []) {
            baselineUpdates.push(b);
            baselineMap.set(baselineKey(b.test_case_id, b.browser, b.viewport_name), b);
          }
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
  if (summary.cancelled && summary.cancelled === summary.total) finalStatus = "cancelled";
  else if (summary.cancelled && summary.passed + summary.failed + summary.errors === 0) finalStatus = "cancelled";
  else if (summary.errors) finalStatus = "error";
  else if (summary.failed) finalStatus = "failed";
  else if (summary.cancelled) finalStatus = "cancelled";

  return { results, summary, status: finalStatus, baselineUpdates };
}
