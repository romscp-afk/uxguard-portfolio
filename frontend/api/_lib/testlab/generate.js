import { normalizeTestCase, emptyTestStep } from "./schema.js";

/**
 * Deterministic heuristic test generation from requirements.
 * Optional OpenAI enrichment when OPENAI_API_KEY is set (best-effort).
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

  return [smoke, ...functional, a11y];
}

export function generateTestsFromOpenApi(specText, projectId) {
  let paths = {};
  try {
    const parsed = JSON.parse(specText);
    paths = parsed.paths || {};
  } catch {
    // Treat as rough path list
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

export async function maybeEnrichWithAi(requirement, existingTests) {
  if (!process.env.OPENAI_API_KEY) return existingTests;
  // Keep generation deterministic/offline-first; AI is optional future enhancement.
  return existingTests;
}
