import assert from "node:assert/strict";
import {
  buildExtractionPayload,
  heuristicStructureFromText,
  detectScannedPdf,
} from "./extraction.js";
import { createBlankResume, mergeParsedIntoResume } from "./schema.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const SAMPLE = `
Jane Designer
Senior Product Designer
jane@example.com
+1 555 0100
https://linkedin.com/in/janedesigner

Summary
Product designer with 8 years experience in B2B SaaS.

Experience
Senior Product Designer
Acme Corp
Jan 2020 – Present
• Led redesign of checkout increasing conversion
• Mentored 4 designers

Education
BFA Interaction Design
Skills
Figma, Research, Prototyping, Accessibility
`;

test("heuristic extracts email and name", () => {
  const parsed = heuristicStructureFromText(SAMPLE);
  assert.equal(parsed.basics.email, "jane@example.com");
  assert.ok(parsed.basics.name.toLowerCase().includes("jane"));
  assert.ok(parsed.skills.length >= 3);
});

test("confidence marks email high when present in source", () => {
  const base = createBlankResume(1);
  const parsed = heuristicStructureFromText(SAMPLE);
  const merged = mergeParsedIntoResume(base, parsed);
  const extraction = buildExtractionPayload({
    resume: merged,
    rawText: SAMPLE,
    parser: "heuristic",
    aiUsed: false,
  });
  assert.equal(extraction.status, "pending_review");
  assert.ok(extraction.fields["basics.email"].confidence >= 0.8);
  assert.equal(extraction.fields["basics.email"].status, "confirmed");
});

test("scanned pdf detection", () => {
  assert.equal(detectScannedPdf("hi"), true);
  assert.equal(detectScannedPdf(SAMPLE), false);
});

console.log("extraction tests passed");
