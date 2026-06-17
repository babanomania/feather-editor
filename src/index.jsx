import { useRef } from "react";
import { toHtml, toMd, safeUrl } from "./markdown.js";

const cmd = (c, v) => document.execCommand(c, false, v);

export default function Editor({ markdown = "", onChange, theme, className = "", style }) {
  const ref = useRef(null);
  const sync = () => onChange?.(toMd(ref.current.innerHTML));
  const B = ({ c, v, label }) => (
    <button
      type="button"
      className="feather-btn"
      onMouseDown={(e) => {
        e.preventDefault();
        ref.current?.focus();
        if (c === "createLink") {
          const raw = window.prompt("Link URL", "https://");
          const url = raw && safeUrl(raw);
          if (url) cmd(c, url);
        } else {
          cmd(c, v);
        }
        sync();
      }}
    >
      {label}
    </button>
  );
  const cls = ["feather-editor", theme && `feather-theme-${theme}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} style={style}>
      <div className="feather-bar">
        <B c="bold" label="B" />
        <B c="italic" label="I" />
        <B c="underline" label="U" />
        <B c="formatBlock" v="<h2>" label="H2" />
        <B c="insertUnorderedList" label="• List" />
        <B c="createLink" label="↗ Link" />
      </div>
      <div
        ref={ref}
        className="feather-content"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        dangerouslySetInnerHTML={{ __html: toHtml(markdown) }}
      />
    </div>
  );
}
