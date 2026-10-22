import { PageHeader, Card, Button } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { importNotes, rebuildPositions } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportarPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [trades, realized, baselines, positions, options] = await Promise.all([
    supabase.from("invest_trades").select("trade_date", { count: "exact" }).eq("source", "nota").order("trade_date", { ascending: false }).limit(1),
    supabase.from("invest_realized").select("result"),
    supabase.from("invest_position_baselines").select("as_of").order("as_of", { ascending: false }).limit(1),
    supabase.from("invest_positions").select("source", { count: "exact" }).limit(1),
    supabase.from("invest_option_positions").select("id", { count: "exact" }).limit(1),
  ]);
  const realizedTotal = (realized.data ?? []).reduce((acc, r) => acc + Number(r.result), 0);

  return (
    <div>
      <PageHeader title="Importar notas" subtitle="Leva as operações das notas para o banco e recalcula as posições" />

      {ok && <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2 mb-4">{ok}</p>}
      {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2 mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-medium text-slate-300">1. Operações e resultados</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Lê os CSVs gerados por <code>scripts/historico_notas.py</code> a partir dos PDFs da Necton. Rodar de novo não duplica.
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt className="text-xs text-slate-500">Operações no banco</dt>
              <dd className="text-slate-100">{trades.count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Última operação</dt>
              <dd className="text-slate-100">{formatDate(trades.data?.[0]?.trade_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Resultados registrados</dt>
              <dd className="text-slate-100">{realized.data?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Soma realizada (com custos)</dt>
              <dd className={realizedTotal < 0 ? "text-red-400" : "text-emerald-400"}>{formatBRL(realizedTotal)}</dd>
            </div>
          </dl>
          <form action={importNotes}>
            <Button type="submit">Importar operações e resultados</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-slate-300">2. Posições</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Posição = saldo inicial (foto da Necton) + operações das notas depois dessa data. Substitui as posições antigas digitadas à
            mão (backup em Documentos\Investimentos\backup).
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt className="text-xs text-slate-500">Saldo inicial</dt>
              <dd className="text-slate-100">{formatDate(baselines.data?.[0]?.as_of)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Origem atual das posições</dt>
              <dd className="text-slate-100">{positions.data?.[0]?.source ?? "digitadas à mão (10/09)"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ações/FII</dt>
              <dd className="text-slate-100">{positions.count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Opções</dt>
              <dd className="text-slate-100">{options.count ?? 0}</dd>
            </div>
          </dl>
          <form action={rebuildPositions}>
            <Button type="submit">Recalcular posições</Button>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-medium text-slate-300">Quando chegarem notas novas</h2>
        <ol className="text-xs text-slate-400 mt-2 space-y-1 list-decimal list-inside">
          <li>Salve os PDFs em Documentos\Investimentos\Notas de Corretagem\2026\&lt;mês&gt;\&lt;categoria&gt;.</li>
          <li>
            Rode <code>python -I scripts/historico_notas.py &quot;&lt;pasta das notas&gt;&quot; docs/fase0/historico-2026</code>.
          </li>
          <li>Clique em &quot;Importar operações e resultados&quot; e depois em &quot;Recalcular posições&quot;.</li>
        </ol>
      </Card>
    </div>
  );
}
