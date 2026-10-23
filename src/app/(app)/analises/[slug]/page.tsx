import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { readAnalysis } from "@/lib/analises/docs";

export const dynamic = "force-dynamic";

/** Links entre dossiês (ex.: "sapr11.md") viram rotas do app; links externos abrem em outra aba. */
function resolveHref(href: string | undefined) {
  if (!href) return { href: "#", external: false };
  if (/^https?:\/\//.test(href)) return { href, external: true };
  const md = href.match(/^(?:\.\/)?([\w-]+)\.md(#.*)?$/);
  if (md) return { href: `/analises/${md[1]}${md[2] ?? ""}`, external: false };
  return { href: null, external: false }; // caminho do repositório (ex.: ../../scripts): só texto
}

const components: Components = {
  h1: ({ children }) => <h1 className="text-xl font-semibold text-slate-50 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-100 mt-8 mb-3 pb-1 border-b border-slate-800">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-6 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-slate-300">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-amber-700 bg-amber-950/20 pl-3 py-1 my-3 text-slate-400">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-200">{children}</code>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th style={style} className="text-left text-xs text-slate-500 uppercase font-medium border-b border-slate-800 py-2 pr-3">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="text-slate-300 border-b border-slate-800/60 py-2 pr-3 align-top">
      {children}
    </td>
  ),
  a: ({ href, children }) => {
    const link = resolveHref(href);
    if (link.href === null) return <span className="text-slate-300">{children}</span>;
    if (link.external)
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
          {children}
        </a>
      );
    return (
      <Link href={link.href} className="text-emerald-400 hover:underline">
        {children}
      </Link>
    );
  },
};

export default async function AnaliseDetalhePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await readAnalysis(slug);
  if (!result) notFound();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
        <Link href="/analises" className="text-emerald-400 hover:underline">
          ← Análises
        </Link>
        <span>
          atualizado em {result.doc.updatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {result.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
