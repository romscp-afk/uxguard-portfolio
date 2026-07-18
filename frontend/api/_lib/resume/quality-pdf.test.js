import assert from "node:assert/strict";
import { runQualityCheck } from "./quality.js";
import { createBlankResume, normalizeResume } from "./schema.js";
import { computeResumeMatch } from "./ai-assist.js";
import { listTemplates, normalizeResumeSettings } from "./templates.js";
import { renderResumePdf } from "./pdf.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("templates include three defaults", () => {
  const templates = listTemplates();
  assert.equal(templates.length, 3);
  assert.ok(templates.some((t) => t.id === "classic_ats" && t.ats_friendly));
});

test("settings normalize page size and fonts", () => {
  const settings = normalizeResumeSettings({ font_family: "Comic Sans", page_size: "letter" }, "classic_ats");
  assert.equal(settings.page_size, "letter");
  assert.equal(settings.font_family, "Times-Roman");
});

test("quality check flags missing name", () => {
  const resume = createBlankResume(1);
  const result = runQualityCheck(resume);
  assert.ok(result.issues.some((i) => i.code === "missing_name"));
  assert.ok(result.guidance.includes("not a guarantee"));
});

test("match indicator returns transparent breakdown", () => {
  const resume = normalizeResume(
    {
      ...createBlankResume(1),
      basics: {
        name: "Ada",
        email: "ada@example.com",
        title: "Product Designer",
        summary: "Design systems and research",
        phone: "",
        location: "",
        links: [],
      },
      skills: [{ id: "1", name: "Figma", category: "UX/UI Design" }],
      experience: [
        {
          id: "e1",
          role: "Product Designer",
          company: "Acme",
          location: "",
          start: "2020",
          end: "",
          current: true,
          bullets: ["Led Figma design system"],
        },
      ],
    },
    1,
  );
  const match = computeResumeMatch(resume, {
    jobDescription: "We need a Product Designer with Figma and research skills",
    targetRole: "Product Designer",
  });
  assert.ok(match.indicator >= 0 && match.indicator <= 100);
  assert.ok(match.matched_keywords.includes("figma") || match.matched_keywords.includes("product"));
  assert.ok(match.disclaimer.includes("not a guarantee"));
});

test("pdf export produces buffer", async () => {
  const resume = normalizeResume(
    {
      ...createBlankResume(1),
      basics: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        title: "Mathematician",
        summary: "Analytical engines",
        phone: "",
        location: "London",
        links: [],
      },
      template_id: "classic_ats",
    },
    1,
  );
  const pdf = await renderResumePdf(resume);
  assert.ok(Buffer.isBuffer(pdf.buffer));
  assert.ok(pdf.buffer.length > 100);
  assert.ok(pdf.filename.toLowerCase().endsWith(".pdf"));
  assert.equal(pdf.buffer.subarray(0, 4).toString(), "%PDF");
});

console.log("resume phase 3-5 tests passed");
