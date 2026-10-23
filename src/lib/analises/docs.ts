import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Dossiês de análise escritos em docs/analises/*.md.
 * A tela lê os arquivos a cada acesso: editar o .md (e publicar) já atualiza o app.
 */

const DIR = path.join(process.cwd(), "docs", "analises");

export interface AnalysisDoc {
  slug: string;
  title: string;
  updatedAt: Date;
}

export async function listAnalyses(): Promise<AnalysisDoc[]> {
  const files = (await readdir(DIR).catch(() => [])).filter((f) => f.endsWith(".md"));
  const docs = await Promise.all(
    files.map(async (file) => {
      const full = path.join(DIR, file);
      const [text, info] = await Promise.all([readFile(full, "utf8"), stat(full)]);
      const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
      return { slug: file.replace(/\.md$/, ""), title, updatedAt: info.mtime };
    })
  );
  // cronograma primeiro, depois os mais recentes
  return docs.sort((a, b) =>
    a.slug === "cronograma" ? -1 : b.slug === "cronograma" ? 1 : b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export async function readAnalysis(slug: string): Promise<{ doc: AnalysisDoc; content: string } | null> {
  const doc = (await listAnalyses()).find((d) => d.slug === slug); // só nomes conhecidos: evita ler fora da pasta
  if (!doc) return null;
  const content = await readFile(path.join(DIR, `${slug}.md`), "utf8");
  return { doc, content };
}

/** Dossiê principal de um ativo (ex.: VIVTX430 → vivt3-vivtx430, TOTS3 → tots3). */
export function findDossier(ticker: string, docs: AnalysisDoc[]) {
  const t = ticker.toLowerCase();
  return docs
    .filter((d) => d.slug === t || d.slug.split("-").includes(t))
    .sort((a, b) => a.slug.length - b.slug.length)[0];
}
