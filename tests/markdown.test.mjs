import "./_jsdom-setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { toHtml, toMd } from "../src/markdown.js";

test("toHtml: heading", () => {
  assert.equal(toHtml("## Hello"), "<h2>Hello</h2>");
});

test("toHtml: paragraph with bold and italic", () => {
  assert.equal(toHtml("a **b** c *d* e"), "<p>a <strong>b</strong> c <em>d</em> e</p>");
});

test("toHtml: unordered list", () => {
  assert.equal(toHtml("- one\n- two"), "<ul><li>one</li><li>two</li></ul>");
});

test("toHtml: link", () => {
  assert.equal(toHtml("[t](https://x.com)"), '<p><a href="https://x.com">t</a></p>');
});

test("toHtml: empty input", () => {
  assert.equal(toHtml(""), "");
});

test("toMd: heading", () => {
  assert.equal(toMd("<h2>Hello</h2>"), "## Hello");
});

test("toMd: bold", () => {
  assert.equal(toMd("<p>a <strong>b</strong> c</p>"), "a **b** c");
});

test("toMd: list", () => {
  assert.equal(toMd("<ul><li>one</li><li>two</li></ul>"), "- one\n- two");
});

test("toMd: empty input", () => {
  assert.equal(toMd(""), "");
});

test("round-trip stability: paragraph + bold", () => {
  const md = "Hello **world**";
  assert.equal(toMd(toHtml(md)), md);
});
