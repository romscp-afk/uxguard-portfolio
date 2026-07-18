import { normalizeTestCase, emptyTestStep } from "./schema.js";

/**
 * Deterministic heuristic test generation from requirements.
 * Optional OpenAI enrichment when OPENAI_API_KEY is set.
 */
export function generateTestsFromRequirement(requirement, projectId) {
  const title = requirement.title || "Requirement";
  const criteria = requirement.acceptance_criteria?.length
    ? requirement.acceptance_criteria
    : [requirement.description || "Core flow works"].filter(Boolean);

  const smoke = normalizeTestCase(
    {
      title: `Smoke: ${title}`,
      description: `Generated smoke coverage for “${title}”.`,
      type: "smoke",
      priority: requirement.priority || "high",
      requirement_ids: [requirement.id],
      generated_by: "heuristic",
      steps: [
        emptyTestStep({
          action: "goto",
          value: "/",
          description: "Open target base URL",
        }),
        emptyTestStep({
          action: "assert_visible",
          selector: "body",
          description: "Page body is visible",
        }),
        emptyTestStep({
          action: "assert_no_console_errors",
          description: "No severe console errors on load",
        }),
      ],
    },
    projectId,
  );

  const functional = criteria.map((criterion, index) =>
    normalizeTestCase(
      {
        title: `AC${index + 1}: ${String(criterion).slice(0, 80)}`,
        description: String(criterion),
        type: "functional",
        priority: requirement.priority || "medium",
        requirement_ids: [requirement.id],
        generated_by: "heuristic",
        steps: [
          emptyTestStep({ action: "goto", value: "/", description: "Open app" }),
          emptyTestStep({
            action: "assert_text",
            value: String(criterion).slice(0, 40),
            description: `Look for evidence of: ${criterion}`,
          }),
        ],
      },
      projectId,
    ),
  );

  const a11y = normalizeTestCase(
    {
      title: `Accessibility scan: ${title}`,
      description: "Basic accessibility and landmark checks",
      type: "accessibility",
      priority: "medium",
      requirement_ids: [requirement.id],
      generated_by: "heuristic",
      steps: [
        emptyTestStep({ action: "goto", value: "/", description: "Open app" }),
        emptyTestStep({ action: "a11y_scan", description: "Run accessibility checks" }),
      ],
    },
    projectId,
  );

  const visual = normalizeTestCase(
    {
      title: `Visual baseline: ${title}`,
      description: "Capture and compare homepage visual baseline",
      type: "visual",
      priority: "medium",
      requirement_ids: [requirement.id],
      generated_by: "heuristic",
      steps: [
        emptyTestStep({ action: "goto", value: "/", description: "Open app" }),
        emptyTestStep({ action: "visual_assert", description: "Compare visual baseline" }),
      ],
    },
    projectId,
  );

  return [smoke, ...functional, a11y, visual];
}

export function generateTestsFromOpenApi(specText, projectId) {
  let paths = {};
  try {
    const parsed = JSON.parse(specText);
    paths = parsed.paths || {};
  } catch {
    const matches = String(specText).match(/\/[a-zA-Z0-9_\-{}]+/g) || [];
    for (const p of matches.slice(0, 20)) paths[p] = { get: {} };
  }

  return Object.keys(paths)
    .slice(0, 30)
    .map((path) =>
      normalizeTestCase(
        {
          title: `API path available: ${path}`,
          description: `Generated from OpenAPI for ${path}`,
          type: "api",
          priority: "medium",
          generated_by: "openapi",
          steps: [
            emptyTestStep({
              action: "api_get",
              value: path,
              description: `GET ${path}`,
            }),
          ],
        },
        projectId,
      ),
    );
}

export async function maybeEnrichWithAi(requirement, projectId, existingTests) {
  if (!process.env.OPENAI_API_KEY) return existingTests;

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const prompt = `You are a QA engineer. Given this requirement, return JSON only:
{"tests":[{"title":"...","type":"e2e|functional|ui","priority":"high|medium|low","steps":[{"action":"goto|click|fill|assert_visible|assert_text|assert_url|a11y_scan","selector":"","value":"","description":"..."}]}]}
Requirement title: ${requirement.title}
Description: ${requirement.description}
Acceptance criteria: ${(requirement.acceptance_criteria || []).join("; ")}
Use relative paths for goto. Max 3 tests, max 6 steps each.`;

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return valid JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    const aiTests = (parsed.tests || []).slice(0, 3).map((t) =>
      normalizeTestCase(
        {
          title: t.title || `AI: ${requirement.title}`,
          description: t.description || requirement.description,
          type: t.type || "e2e",
          priority: t.priority || "medium",
          requirement_ids: [requirement.id],
          generated_by: "ai",
          steps: (t.steps || []).map((s) =>
            emptyTestStep({
              action: s.action || "goto",
              selector: s.selector || "",
              value: s.value || "",
              description: s.description || "",
            }),
          ),
        },
        projectId,
      ),
    );
    return [...existingTests, ...aiTests];
  } catch (err) {
    console.warn("[testlab] AI enrichment skipped:", err.message);
    return existingTests;
  }
}
