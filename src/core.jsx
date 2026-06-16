import { useRef } from "react";

const x = (c, v) => document.execCommand(c, false, v);

export default function Editor({ value = "", onChange }) {
  const r = useRef(null);
  const s = () => onChange?.(r.current.innerHTML);
  const B = ({ c, v, l }) => (
    <button onMouseDown={(e) => (e.preventDefault(), x(c, v), s())}>{l}</button>
  );
  return (
    <div className="feather-editor">
      <div className="feather-bar">
        <B c="bold" l="B" />
        <B c="italic" l="I" />
        <B c="formatBlock" v="<h2>" l="H2" />
        <B c="insertUnorderedList" l="List" />
      </div>
      <div
        ref={r}
        className="feather-content"
        contentEditable
        suppressContentEditableWarning
        onInput={s}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}
