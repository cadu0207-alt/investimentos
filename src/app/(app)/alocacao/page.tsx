import { getPositions, getAssets } from "@/lib/domain/queries";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { AllocationCharts } from "./AllocationCharts";
import { formatBRL, formatPct } from "@/lib/domain/format";

export default async function AlocacaoPage() {
  const [positions, assets] = await Promise.all([getPositions(), getAssets()]);

  const assetClassByTicker = new Map(assets.map((a) => [a.ticker, a.asset_class]));

  const byTicker = positions
    .map((p) => ({ name: p.ticker, value: p.quantity * (p.current_price ?? p.avg_price) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  const classMap = new Map<string, number>();
  for (const p of positions) {
    const cls = assetClassByTicker.get(p.ticker) ?? "outro";
    const value = p.quantity * (p.current_price ?? p.avg_price);
    classMap.set(cls, (classMap.get(cls) ?? 0) + value);
  }
  const CLASS_LABEL: Record<string, string> = { acao: "Ações", fii: "FIIs", etf: "ETFs", cripto: "Cripto", indice: "Índices", outro: "Outros" };
  const byClass = [...classMap.entries()].map(([name, value]) => ({ name: CLASS_LABEL[name] ?? name, value }));

  const total = byTicker.reduce((a, b) => a + b.value, 0);
  const top = byTicker[0];
  const concentrationTop3Pct = total > 0 ? (byTicker.slice(0, 3).reduce((a, b) => a + b.value, 0) / total) * 100 : 0;

  return (
    <div>
      <PageHeader title="Alocação e diversificação" subtitle="Concentração por ativo e por classe, a partir das posições cadastradas" />

      {positions.length === 0 ? (
        <EmptyState
          title="Sem posições para analisar"
          description="Cadastre suas posições em Posições para ver a distribuição da carteira aqui."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <p className="text-xs text-slate-500 uppercase">Maior posição</p>
              <p className="text-xl font-semibold text-slate-50 mt-1.5">{top?.name ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-1">{top ? formatPct((top.value / total) * 100, 1) : "—"} da carteira</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 uppercase">Concentração top 3</p>
              <p className="text-xl font-semibold text-slate-50 mt-1.5">{formatPct(concentrationTop3Pct, 1)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {concentrationTop3Pct > 50 ? "Concentração elevada — considere diversificar" : "Concentração dentro do razoável"}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 uppercase">Valor total em ações/FIIs</p>
              <p className="text-xl font-semibold text-slate-50 mt-1.5">{formatBRL(total)}</p>
              <p className="text-xs text-slate-500 mt-1">{positions.length} posições</p>
            </Card>
          </div>

          <Card>
            <AllocationCharts byTicker={byTicker} byClass={byClass} />
          </Card>
        </>
      )}
    </div>
  );
}
