import Link from "next/link";
import { PageHeader, StatCard, Card, EmptyState, Badge } from "@/components/ui";
import { formatBRL, formatPct } from "@/lib/domain/format";
import {
  getPositions,
  getOptionPositions,
  getRobotSignals,
  getSnapshots,
} from "@/lib/domain/queries";

export default async function DashboardPage() {
  const [positions, optionPositions, signals, snapshots] = await Promise.all([
    getPositions(),
    getOptionPositions(),
    getRobotSignals(),
    getSnapshots(),
  ]);

  const positionsCost = positions.reduce((acc, p) => acc + p.quantity * p.avg_price, 0);
  const positionsMarket = positions.reduce(
    (acc, p) => acc + p.quantity * (p.current_price ?? p.avg_price),
    0
  );
  const positionsPnl = positionsMarket - positionsCost;
  const positionsPnlPct = positionsCost > 0 ? (positionsPnl / positionsCost) * 100 : 0;

  const openOptions = optionPositions.filter((o) => o.status === "aberta");
  const optionsPremium = openOptions.reduce((acc, o) => {
    const sign = o.strategy_leg?.startsWith("venda") ? 1 : -1;
    return acc + sign * o.quantity * o.avg_price;
  }, 0);

  const totalMarketValue = positionsMarket;

  const byTicker = [...positions]
    .map((p) => ({ ticker: p.ticker, value: p.quantity * (p.current_price ?? p.avg_price) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const recentSignals = signals.slice(0, 5);
  const lastSnapshot = snapshots[snapshots.length - 1];

  return (
    <div>
      <PageHeader
        title="Visão geral da carteira"
        subtitle="Posição consolidada de hoje — ações, FIIs e estrutura de opções"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Valor de mercado (ações/FIIs)" value={formatBRL(totalMarketValue)} hint={`${positions.length} posições`} />
        <StatCard
          label="P&L não realizado"
          value={formatBRL(positionsPnl)}
          hint={formatPct(positionsPnlPct)}
          tone={positionsPnl >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Prêmio líquido em opções"
          value={formatBRL(optionsPremium)}
          hint={`${openOptions.length} posições abertas`}
          tone={optionsPremium >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Último snapshot registrado"
          value={lastSnapshot ? formatBRL(lastSnapshot.total_value) : "—"}
          hint={lastSnapshot ? lastSnapshot.snapshot_date : "Nenhum snapshot ainda"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-300">Maiores posições</h2>
            <Link href="/alocacao" className="text-xs text-emerald-400 hover:underline">
              Ver alocação completa
            </Link>
          </div>
          {byTicker.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma posição cadastrada ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {byTicker.map((t) => {
                const pct = totalMarketValue > 0 ? (t.value / totalMarketValue) * 100 : 0;
                return (
                  <li key={t.ticker} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{t.ticker}</span>
                    <span className="text-slate-400">
                      {formatBRL(t.value)} <span className="text-slate-600">· {formatPct(pct, 1)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-300">Sinais recentes dos robôs</h2>
            <Link href="/robos" className="text-xs text-emerald-400 hover:underline">
              Ver todos
            </Link>
          </div>
          {recentSignals.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum sinal registrado ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentSignals.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">
                    {s.robot_name} · {s.asset}
                  </span>
                  <Badge tone={s.signal_type === "compra" ? "positive" : s.signal_type === "venda" ? "negative" : "default"}>
                    {s.signal_type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {positions.length === 0 && optionPositions.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Ainda sem dados na carteira"
            description="Cadastre suas posições atuais em Posições e as estruturas de opções em Risco de opções para começar a ver os números aqui."
          />
        </div>
      )}
    </div>
  );
}
