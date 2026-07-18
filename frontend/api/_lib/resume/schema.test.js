import assert from "node:assert/strict";
import { calculateCompletion, normalizeResume, createBlankResume } from "./schema.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("blank resume has low completion", () => {
  const resume = createBlankResume(1, { title: "Test" });
  assert.equal(resume.completion_percentage, 0);
});

test("basics + summary + experience raises completion", () => {
  const resume = normalizeResume(
    {
      ...createBlankResume(1),
      basics: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "",
        title: "Engineer",
        location: "",
        summary: "Pioneer of computing.",
        links: [],
      },
      experience: [
        {
          id: "e1",
          company: "Analytical Engine Co",
          role: "Mathematician",
          location: "",
          start: "1842",
          end: "",
          current: false,
          bullets: ["Wrote algorithms"],
        },
      ],
      education: [{ id: "ed1", school: "Home", degree: "", field: "", start: "", end: "", details: "" }],
      skills: [{ id: "s1", name: "Mathematics", category: "Technical" }],
    },
    1,
  );
  assert.ok(resume.completion_percentage >= 65);
  assert.equal(calculateCompletion(resume), resume.completion_percentage);
});

test("legacy string skills normalize to objects", () => {
  const resume = normalizeResume({ skills: ["React", "Figma"] }, 1);
  assert.equal(resume.skills.length, 2);
  assert.equal(resume.skills[0].name, "React");
  assert.ok(resume.skills[0].id);
});

console.log("resume schema tests passed");
