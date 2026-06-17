// Block URL schemes that execute script when followed.
// Matches the trimmed input case-insensitively against a fixed list.
// Anything that isn't dangerous is returned unchanged — relative URLs,
// fragments, https, mailto, tel all pass through.
const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;
export const safeUrl = (u) => (UNSAFE_SCHEME.test(String(u).trim()) ? "" : u);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const safe = safeUrl(url);
      return safe ? `<a href="${safe}">${text}</a>` : text;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>");

export function toHtml(md) {
  if (!md) return "";
  return md
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith("# ")) return `<h2>${inline(b.slice(2))}</h2>`;
      if (/^[-*] /.test(b)) {
        const items = b
          .split(/\n/)
          .map((l) => l.replace(/^[-*] /, ""))
          .map((l) => `<li>${inline(l)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(b.replace(/\n/g, "<br>"))}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function nodeToMd(node) {
  if (node.nodeType === 3) return node.nodeValue;
  if (node.nodeType !== 1) return "";
  const tag = node.tagName;
  const inner = Array.from(node.childNodes).map(nodeToMd).join("");
  if (tag === "STRONG" || tag === "B") return `**${inner}**`;
  if (tag === "EM" || tag === "I") return `*${inner}*`;
  if (tag === "U") return `__${inner}__`;
  if (tag === "A") return `[${inner}](${node.getAttribute("href") || ""})`;
  if (tag === "BR") return "\n";
  if (tag === "H1" || tag === "H2" || tag === "H3") return `## ${inner}\n\n`;
  if (tag === "LI") return `- ${inner}\n`;
  if (tag === "UL" || tag === "OL") return `${inner}\n`;
  if (tag === "P" || tag === "DIV") return `${inner}\n\n`;
  return inner;
}

export function toMd(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;
  return nodeToMd(root).replace(/\n{3,}/g, "\n\n").trim();
}
