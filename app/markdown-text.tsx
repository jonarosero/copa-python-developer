"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function MarkdownText({ children }: { children: string }) {
  return <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>, table: ({ children, ...props }) => <div className="markdown-table-scroll"><table {...props}>{children}</table></div> }}>{children || "*Todavía no hay un enunciado para este reto.*"}</ReactMarkdown></div>;
}
export function markdownSummary(value: string) {
  return value.replace(/^#{1,6}\s+.*$/gm, "").replace(/```[\s\S]*?```/g, "").replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>#]/g, "").trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").slice(0, 135) || "Abre el reto para ver el enunciado completo.";
}
