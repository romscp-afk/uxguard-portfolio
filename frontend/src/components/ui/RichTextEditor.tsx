import { forwardRef, useEffect, useImperativeHandle, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Heading3,
} from "lucide-react";
import { FontSize } from "../../lib/tiptapFontSize";
import { normalizeEditorHtml, toEditorHtml } from "../../lib/htmlContent";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const FONT_SIZES = ["", "14px", "16px", "18px", "20px", "24px", "28px"];

const COLORS = [
  "",
  "#0f172a",
  "#334155",
  "#64748b",
  "#0eb5bd",
  "#0369a1",
  "#b45309",
  "#b91c1c",
  "#15803d",
  "#7c3aed",
];

export type RichTextEditorHandle = {
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  hasError?: boolean;
  className?: string;
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded p-1.5 transition ${
        active ? "bg-brand-100 text-brand-800" : "text-ink-600 hover:bg-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor(
  {
    value,
    onChange,
    placeholder = "Write here…",
    minHeightClass = "min-h-[140px]",
    hasError = false,
    className = "",
  },
  ref,
) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: `rich-text-editor-content outline-none ${minHeightClass}`,
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(normalizeEditorHtml(ed.getHTML()));
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus("end"),
  }));

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    const current = normalizeEditorHtml(editor.getHTML());
    if (next === current || (isSameContent(next, current))) return;
    editor.commands.setContent(next || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div
      className={`rich-text-editor overflow-hidden rounded-lg border bg-white ${
        hasError ? "border-red-400 ring-2 ring-red-100" : "border-ink-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-ink-50/80 px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-ink-200" />
        <ToolbarButton
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Subheading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-ink-200" />
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-ink-200" />
        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-ink-200" />
        <label className="sr-only" htmlFor="rte-font">
          Font
        </label>
        <select
          id="rte-font"
          className="max-w-[7.5rem] rounded border-0 bg-transparent py-1 text-xs text-ink-700"
          value={editor.getAttributes("textStyle").fontFamily || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(v).run();
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border-0 bg-transparent py-1 text-xs text-ink-700"
          value={editor.getAttributes("textStyle").fontSize || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
          title="Font size"
        >
          <option value="">Size</option>
          {FONT_SIZES.filter(Boolean).map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 px-1 text-xs text-ink-600" title="Text color">
          <span className="sr-only">Color</span>
          <input
            type="color"
            className="h-6 w-6 cursor-pointer rounded border border-ink-200 bg-white p-0"
            value={normalizeColor(editor.getAttributes("textStyle").color)}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <select
          className="rounded border-0 bg-transparent py-1 text-xs text-ink-700"
          value={editor.getAttributes("textStyle").color || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetColor().run();
            else editor.chain().focus().setColor(v).run();
          }}
          title="Preset colors"
        >
          <option value="">Color</option>
          {COLORS.filter(Boolean).map((c) => (
            <option key={c} value={c} style={{ color: c }}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} className="px-3 py-2.5 text-sm text-ink-900" />
    </div>
  );
});

function normalizeColor(color: unknown): string {
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "#0f172a";
}

function isSameContent(a: string, b: string): boolean {
  if (a === b) return true;
  const normalize = (html: string) =>
    html
      .replace(/\s+/g, " ")
      .replace(/<p><\/p>/g, "")
      .trim();
  return normalize(a) === normalize(b);
}
