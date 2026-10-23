import Link from "next/link";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { listAnalyses } from "@/lib/analises/docs";

export const dynamic = "force-dynamic";

export default async function AnalisesPage() {
  const docs = await listAnalyses();

  return (
    <div>
      <PageHeader
        title="Análises"
        subtitle="Dossiês de decisão por posição. A tela lê os arquivos de docs/analises: toda alteração aparece aqui."
      />
      {docs.length === 0 ? (
        <EmptyState title="Nenhuma análise encontrada" />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Link key={d.slug} href={`/analises/${d.slug}`} className="block">
              <Card className="py-3 hover:border-emerald-800 transition-colors">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">{d.title}</span>
                  <span className="text-xs text-slate-500">
                    atualizado em {d.updatedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
