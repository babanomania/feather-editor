import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("dist artifacts exist after build", () => {
  assert.ok(existsSync("dist/index.esm.js"), "missing dist/index.esm.js");
  assert.ok(existsSync("dist/index.js"), "missing dist/index.js");
  assert.ok(existsSync("dist/core.esm.js"), "missing dist/core.esm.js");
  assert.ok(existsSync("dist/core.js"), "missing dist/core.js");
});

test("dist/core.js is a valid CJS module", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const mod = require("../dist/core.js");
  assert.equal(typeof mod.default, "function", "Editor default export should be a function");
});
