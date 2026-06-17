import "./_jsdom-setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { toHtml, toMd, safeUrl } from "../src/markdown.js";

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

test("safeUrl: blocks javascript:", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
});

test("safeUrl: blocks JavaScript: (case-insensitive)", () => {
  assert.equal(safeUrl("JaVaScRiPt:alert(1)"), "");
});

test("safeUrl: blocks data: URLs", () => {
  assert.equal(safeUrl("data:text/html,<script>alert(1)</script>"), "");
});

test("safeUrl: blocks vbscript:", () => {
  assert.equal(safeUrl("vbscript:msgbox()"), "");
});

test("safeUrl: blocks with leading whitespace", () => {
  assert.equal(safeUrl("  javascript:alert(1)"), "");
});

test("safeUrl: allows https", () => {
  assert.equal(safeUrl("https://example.com"), "https://example.com");
});

test("safeUrl: allows relative URLs", () => {
  assert.equal(safeUrl("/path/to/page"), "/path/to/page");
});

test("safeUrl: allows mailto", () => {
  assert.equal(safeUrl("mailto:a@b.com"), "mailto:a@b.com");
});

test("toHtml: strips javascript: link but keeps the text", () => {
  const out = toHtml("[click me](javascript:xss)");
  assert.equal(out, "<p>click me</p>");
  assert.ok(!out.includes("javascript:"), "javascript: leaked through");
  assert.ok(!out.includes("href"), "href emitted for unsafe URL");
});

test("toHtml: keeps safe link", () => {
  assert.equal(
    toHtml("[click](https://example.com)"),
    '<p><a href="https://example.com">click</a></p>',
  );
});
