import assert from "node:assert/strict";
import { computeJobMatch } from "./match.js";
import { normalizeJob, validateSalary } from "./schema.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("salary validation rejects max < min", () => {
  assert.ok(validateSalary({ min: 100, max: 50 }));
  assert.equal(validateSalary({ min: 50, max: 100 }), null);
});

test("match excludes opaque auto-reject and includes disclaimer", () => {
  const job = normalizeJob({
    title: "Senior UX Researcher",
    required_skills: ["Research", "Figma"],
    preferred_skills: ["SQL"],
    min_experience_years: 3,
    workplace_type: "remote",
  });
  const resume = {
    basics: { name: "Ada", title: "UX Researcher", summary: "Evidence-led research", location: "Remote" },
    experience: [{ role: "UX Researcher", company: "A", start: "2019", end: "2024", current: false, tools: ["Figma"] }],
    skills: [{ name: "Research" }, { name: "Figma" }],
    education: [{ degree: "MSc", field: "HCI", school: "Uni" }],
  };
  const match = computeJobMatch(job, resume);
  assert.ok(match.percent >= 50);
  assert.match(match.disclaimer, /does not determine hiring eligibility/i);
  assert.ok(match.categories.required_skills);
  assert.ok(!("age" in match.categories));
  assert.ok(!("gender" in match.categories));
});

test("missing required skills surface as improvements", () => {
  const job = normalizeJob({
    title: "Designer",
    required_skills: ["Figma", "ProtoPie"],
  });
  const resume = {
    basics: { name: "A", title: "Designer", summary: "x" },
    experience: [],
    skills: [{ name: "Figma" }],
    education: [],
  };
  const match = computeJobMatch(job, resume);
  assert.ok(match.categories.required_skills.missing.includes("protopie"));
  assert.ok(match.suggested_improvements.some((s) => /ProtoPie|protopie/i.test(s)));
});

console.log("hiring tests passed");
