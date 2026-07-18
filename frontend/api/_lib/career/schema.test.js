import assert from "node:assert/strict";
import {
  entryMatchKey,
  normalizeTimelineEntry,
  emptyTimelineEntry,
} from "./schema.js";
import { findDuplicateCandidates } from "./duplicates.js";
import { detectCareerGaps, buildCareerInsights } from "./gaps.js";
import { classifyImportCandidates, resumeToTimelineCandidates } from "./import.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("normalize timeline entry defaults", () => {
  const entry = normalizeTimelineEntry({
    title: "PM",
    organisation: "Acme",
    type: "employment",
  });
  assert.equal(entry.title, "PM");
  assert.equal(entry.organisation, "Acme");
  assert.equal(entry.visibility, "private");
  assert.equal(entry.source_type, "manual");
});

test("duplicate detection matches org+title", () => {
  const existing = [
    emptyTimelineEntry(1, {
      id: 1,
      type: "employment",
      title: "Product Manager",
      organisation: "Acme Corp",
      start_date: "2020-01",
      end_date: "2022-06",
    }),
  ];
  const candidate = emptyTimelineEntry(1, {
    type: "employment",
    title: "Product Manager",
    organisation: "Acme Corp",
    start_date: "2020-01",
    end_date: "2022-06",
  });
  assert.equal(entryMatchKey(existing[0]), entryMatchKey(candidate));
  const matches = findDuplicateCandidates(candidate, existing);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].confidence, "high");
});

test("gaps shorter than 3 months are ignored", () => {
  const entries = [
    emptyTimelineEntry(1, {
      id: 1,
      type: "employment",
      title: "A",
      organisation: "X",
      start_date: "2020-01",
      end_date: "2021-01",
    }),
    emptyTimelineEntry(1, {
      id: 2,
      type: "employment",
      title: "B",
      organisation: "Y",
      start_date: "2021-02",
      end_date: "2022-01",
    }),
  ];
  assert.equal(detectCareerGaps(entries).length, 0);
});

test("gaps of 3+ months are reported neutrally", () => {
  const entries = [
    emptyTimelineEntry(1, {
      id: 1,
      type: "employment",
      title: "A",
      organisation: "X",
      start_date: "2018-01",
      end_date: "2019-01",
    }),
    emptyTimelineEntry(1, {
      id: 2,
      type: "employment",
      title: "B",
      organisation: "Y",
      start_date: "2020-06",
      end_date: "2021-01",
    }),
  ];
  const gaps = detectCareerGaps(entries);
  assert.equal(gaps.length, 1);
  assert.match(gaps[0].message, /not represented/);
});

test("resume import maps experience and detects duplicates", () => {
  const resume = {
    id: 9,
    experience: [
      {
        id: "e1",
        company: "FinFlow",
        role: "UX Lead",
        start: "2022-01",
        end: "",
        current: true,
        bullets: ["Improved checkout"],
        tools: ["Figma"],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    awards: [],
    volunteering: [],
  };
  const candidates = resumeToTimelineCandidates(resume);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, "employment");
  assert.equal(candidates[0].source_resume_id, 9);

  const existing = [
    emptyTimelineEntry(1, {
      id: 3,
      type: "employment",
      title: "UX Lead",
      organisation: "FinFlow",
      start_date: "2022-01",
      is_current: true,
    }),
  ];
  const classified = classifyImportCandidates(candidates, existing);
  assert.equal(classified.ready.length, 0);
  assert.equal(classified.duplicates.length, 1);
});

test("insights count employers and roles", () => {
  const insights = buildCareerInsights([
    emptyTimelineEntry(1, {
      id: 1,
      type: "employment",
      title: "Designer",
      organisation: "A",
      start_date: "2019-01",
      end_date: "2020-01",
    }),
    emptyTimelineEntry(1, {
      id: 2,
      type: "employment",
      title: "Lead",
      organisation: "B",
      start_date: "2020-02",
      is_current: true,
    }),
    emptyTimelineEntry(1, {
      id: 3,
      type: "promotion",
      title: "Promotion",
      organisation: "B",
      start_date: "2021-01",
    }),
  ]);
  assert.equal(insights.employer_count, 2);
  assert.equal(insights.role_count, 2);
  assert.equal(insights.promotion_count, 1);
  assert.ok(insights.current_role);
});

console.log("career schema tests passed");
