import assert from "node:assert/strict";
import { roleHasPermission, resolveProjectRole } from "./authz.js";
import { isPrivateOrReservedIp, parseTargetUrl } from "./url-safety.js";
import { generateTestsFromRequirement } from "./generate.js";
import { normalizeRequirement } from "./schema.js";
import { compareScreenshotBuffers, screenshotFingerprint } from "./visual.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("blocks localhost hostname", () => {
  assert.throws(() => parseTargetUrl("http://localhost:3000"), /blocked|Localhost/i);
});

test("blocks private IPv4 literal", () => {
  assert.throws(() => parseTargetUrl("http://192.168.1.10"), /Private|blocked/i);
  assert.equal(isPrivateOrReservedIp("10.0.0.5"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
});

test("allows public https URL", () => {
  const parsed = parseTargetUrl("https://example.com/app");
  assert.equal(parsed.hostname, "example.com");
});

test("permission map grants owner delete", () => {
  assert.equal(roleHasPermission("owner", "project_delete"), true);
  assert.equal(roleHasPermission("viewer", "project_delete"), false);
  assert.equal(roleHasPermission("tester", "runs_trigger"), true);
});

test("resolveProjectRole prefers owner then member", () => {
  const store = {
    testlab_projects: [{ id: "p1", owner_user_id: 2, deleted_at: null }],
    testlab_project_members: [{ project_id: "p1", user_id: 3, role: "tester" }],
  };
  assert.equal(resolveProjectRole(store, "p1", { id: 2, role: "professional" }), "owner");
  assert.equal(resolveProjectRole(store, "p1", { id: 3, role: "professional" }), "tester");
  assert.equal(resolveProjectRole(store, "p1", { id: 9, role: "professional" }), null);
  assert.equal(resolveProjectRole(store, "p1", { id: 9, role: "admin" }), "owner");
});

test("heuristic generation covers smoke + AC + a11y + visual", () => {
  const req = normalizeRequirement(
    {
      title: "Checkout",
      description: "Users can pay",
      acceptance_criteria: ["Shows total", "Confirms order"],
    },
    "p1",
  );
  const tests = generateTestsFromRequirement(req, "p1");
  assert.ok(tests.length >= 4);
  assert.ok(tests.some((t) => t.type === "smoke"));
  assert.ok(tests.some((t) => t.type === "accessibility"));
  assert.ok(tests.some((t) => t.type === "visual"));
});

test("visual compare detects identical buffers", () => {
  const buf = Buffer.from("PNG-FAKE-BASELINE-CONTENT-1234567890");
  const cmp = compareScreenshotBuffers(buf, Buffer.from(buf));
  assert.equal(cmp.match, true);
  assert.equal(screenshotFingerprint(buf).length, 64);
});

test("visual compare detects different buffers", () => {
  const a = Buffer.alloc(200, 1);
  const b = Buffer.alloc(200, 2);
  const cmp = compareScreenshotBuffers(a, b, 0.01);
  assert.equal(cmp.match, false);
  assert.ok(cmp.diff_ratio > 0);
});

console.log("testlab tests passed");
