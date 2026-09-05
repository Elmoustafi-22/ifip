"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useEffect, useState } from "react";
import {
  HiOutlineBold,
  HiOutlineItalic,
  HiOutlineListBullet,
  HiOutlineNumberedList,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowUturnRight,
  HiOutlineCodeBracket,
  HiOutlineEye
} from "react-icons/hi2";
import {
  RiH1,
  RiH2,
  RiH3,
  RiDoubleQuotesL,
  RiTableLine,
  RiInsertRowBottom,
  RiInsertColumnRight,
  RiDeleteRow,
  RiDeleteColumn,
  RiDeleteBin7Line
} from "react-icons/ri";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "tiptap-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[260px] max-h-[500px] overflow-y-auto px-4 py-3 focus:outline-none text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none font-sans",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Sync external value changes if not focused
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Check if value is markdown or plain text, or empty
      if (editor.getText() === "" && value) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xl p-4 min-h-[260px] flex items-center justify-center text-xs text-slate-400">
        Loading rich text editor...
      </div>
    );
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
      {/* Top Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-1 select-none text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("heading", { level: 1 }) ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Heading 1"
          >
            <RiH1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("heading", { level: 2 }) ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Heading 2"
          >
            <RiH2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("heading", { level: 3 }) ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Heading 3"
          >
            <RiH3 className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-slate-300 mx-1" />

          {/* Formats */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("bold") ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Bold (Ctrl+B)"
          >
            <HiOutlineBold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("italic") ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Italic (Ctrl+I)"
          >
            <HiOutlineItalic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("blockquote") ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Quote / Highlight Card"
          >
            <RiDoubleQuotesL className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-slate-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("bulletList") ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Bullet List"
          >
            <HiOutlineListBullet className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-white transition-colors ${
              editor.isActive("orderedList") ? "bg-white font-bold text-[#000666] shadow-xs" : "text-slate-600"
            }`}
            title="Numbered List"
          >
            <HiOutlineNumberedList className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-slate-300 mx-1" />

          {/* Table Tools */}
          <button
            type="button"
            onClick={addTable}
            className="p-1.5 rounded hover:bg-white text-slate-600 transition-colors flex items-center gap-1"
            title="Insert Table (or paste directly from Google Docs)"
          >
            <RiTableLine className="w-4 h-4 text-[#000666]" />
            <span className="text-[10px] font-bold text-[#000666]">Table</span>
          </button>

          {editor.isActive("table") && (
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded px-1 py-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="p-1 text-slate-600 hover:text-[#000666] hover:bg-slate-100 rounded"
                title="Add Row Below"
              >
                <RiInsertRowBottom className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="p-1 text-slate-600 hover:text-[#000666] hover:bg-slate-100 rounded"
                title="Add Column Right"
              >
                <RiInsertColumnRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                title="Delete Row"
              >
                <RiDeleteRow className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                title="Delete Column"
              >
                <RiDeleteColumn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                title="Delete Entire Table"
              >
                <RiDeleteBin7Line className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="w-[1px] h-4 bg-slate-300 mx-1" />

          {/* Undo/Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <HiOutlineArrowUturnLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <HiOutlineArrowUturnRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("visual")}
            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              viewMode === "visual" ? "bg-[#000666] text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineEye className="w-3.5 h-3.5" /> Visual Docs
          </button>
          <button
            type="button"
            onClick={() => setViewMode("html")}
            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              viewMode === "html" ? "bg-[#000666] text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <HiOutlineCodeBracket className="w-3.5 h-3.5" /> Source HTML
          </button>
        </div>
      </div>

      {/* Helper notice */}
      <div className="bg-sky-50/50 border-b border-sky-100/80 px-3 py-1.5 text-[11px] text-sky-800 flex items-center justify-between">
        <span>
          💡 <strong>Tip:</strong> You can copy directly from <strong>Google Docs / Word</strong> and paste (<kbd className="bg-white border border-sky-200 px-1 py-0.5 rounded text-[10px] font-mono">Ctrl+V</kbd>) here — all tables, bold headings, and lists are automatically formatted.
        </span>
      </div>

      {/* Editor Content Body */}
      {viewMode === "visual" ? (
        <div className="tiptap-wrapper">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (editor) {
              editor.commands.setContent(e.target.value);
            }
          }}
          className="w-full min-h-[260px] p-4 font-mono text-xs text-slate-800 focus:outline-none resize-y"
          placeholder="Raw HTML / Markdown source..."
        />
      )}
    </div>
  );
}
