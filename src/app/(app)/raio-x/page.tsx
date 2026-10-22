import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { formatBRL, formatPct, formatNumber, formatDate, daysBetween } from "@/lib/domain/format";
import { getSnapshot, parseOptionCode, monthLabel, SECTOR_LABEL, SNAPSHOT_DATE } from "@/lib/fase0/snapshot";

const PENDENCIAS = [
  "Cotação dos subjacentes (VIVT3, KLBN, WIZC3, VAMO3) e confirmação de strike/vencimento de cada opção.",
  "Caixa livre e garantia bloqueada em cada conta — define se o exercício da put é suportável.",
  "Painel Posição da outra conta (este snapshot cobre uma conta só).",
  "Prejuízos realizados nos últimos meses (notas de corretagem ou aba Prejuízos).",
  "PM marcado com \"!\" no Profit: confirmar se é ajuste por proventos ou divergência (PETR4 a R$ 29,19).",
];

export default async function RaioXPage() {
  const rows = await getSnapshot();
  const snapshotDate = new Date(`${SNAPSHOT_DATE}T00:00:00Z`);

  const stocks = rows.filter((r) => r.kind === "acao" || r.kind === "fii");
  const options = rows.filter((r) => r.kind === "opcao_call" || r.kind === "opcao_put");

  const sum = (list: typeof rows, pick: (r: (typeof rows)[number]) => number) => list.reduce((acc, r) => acc + pick(r), 0);
  const totalValue = sum(rows, (r) => r.positionValue);
  const totalResult = sum(rows, (r) => r.openResult);
  const stocksValue = sum(stocks, (r) => r.positionValue);
  const stocksResult = sum(stocks, (r) => r.openResult);
  const stocksCost = stocksValue - stocksResult;
  const optionsResult = sum(options, (r) => r.openResult);
  const givenBackPct = stocksResult > 0 ? (-optionsResult / stocksResult) * 100 : null;

  const optionRows = options
    .map((o) => {
      const info = parseOptionCode(o.ticker, snapshotDate);
      const cashFlowIn = o.quantity * o.avgPrice;
      return {
        ...o,
        info,
        cashFlowIn,
        resultPct: cashFlowIn > 0 ? (o.openResult / cashFlowIn) * 100 : null,
        days: info ? daysBetween(snapshotDate, info.presumedExpiry) : null,
      };
    })
    .sort((a, b) => a.openResult - b.openResult);

  const soldPuts = optionRows.filter((o) => o.side === "venda" && o.info?.type === "put");
  const assignmentNotional = soldPuts.reduce((acc, o) => acc + o.quantity * (o.info?.presumedStrike ?? 0), 0);

  const sectorMap = new Map<string, number>();
  for (const s of stocks) sectorMap.set(s.sector, (sectorMap.get(s.sector) ?? 0) + s.positionValue);
  const sectors = [...sectorMap.entries()].map(([sector, value]) => ({ sector, value })).sort((a, b) => b.value - a.value);

  const byWeight = [...stocks].sort((a, b) => b.positionValue - a.positionValue);
  const top = byWeight[0];
  const top5Pct = (sum(byWeight.slice(0, 5), (r) => r.positionValue) / stocksValue) * 100;

  const stocksByResult = [...stocks].sort((a, b) => a.openResult - b.openResult);

  return (
    <div>
      <PageHeader
        title="Raio-X da carteira"
        subtitle={`Fase 0 · snapshot de ${formatDate(SNAPSHOT_DATE)} (painel Posição do Profit, uma conta)`}
        action={<Badge tone="warning">Dados estáticos até a Fase 1</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Resultado em aberto"
          value={formatBRL(totalResult)}
          hint={`${formatPct((totalResult / (totalValue - totalResult)) * 100)} · posição ${formatBRL(totalValue)}`}
          tone={totalResult >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Ações + FII"
          value={formatBRL(stocksResult)}
          hint={`${formatPct((stocksResult / stocksCost) * 100, 1)} sobre o custo · ${stocks.length} ativos`}
          tone={stocksResult >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Opções"
          value={formatBRL(optionsResult)}
          hint={`${options.length} posições`}
          tone={optionsResult >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Lucro das ações devolvido"
          value={givenBackPct === null ? "—" : formatPct(givenBackPct, 0)}
          hint="Perda em opções ÷ ganho em ações"
          tone={givenBackPct !== null && givenBackPct > 50 ? "negative" : "default"}
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Opções</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Vencimento e strike deduzidos do código (3ª sexta-feira do mês) — confirmar na cadeia de opções.
            </p>
          </div>
          {soldPuts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase">Compra obrigatória se exercida</p>
              <p className="text-lg font-semibold text-amber-400">{formatBRL(assignmentNotional)}</p>
              <p className="text-xs text-slate-500">
                {formatPct((assignmentNotional / stocksValue) * 100, 0)} do valor em ações · strike presumido
              </p>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
                <th className="py-2 pr-3">Opção</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3 text-right">Qtd</th>
                <th className="py-2 pr-3 text-right">PM</th>
                <th className="py-2 pr-3 text-right">Atual</th>
                <th className="py-2 pr-3 text-right">Resultado</th>
                <th className="py-2 pr-3 text-right">%</th>
                <th className="py-2 pr-3 text-right">Strike*</th>
                <th className="py-2 text-right">Vencimento*</th>
              </tr>
            </thead>
            <tbody>
              {optionRows.map((o) => (
                <tr key={o.ticker} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-medium text-slate-100">{o.ticker}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={o.side === "venda" ? "warning" : "default"}>
                      {o.info?.type === "put" ? "Put" : "Call"} {o.side === "venda" ? "vendida" : "comprada"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.quantity, 0)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.avgPrice)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.currentPrice)}</td>
                  <td className={`py-2 pr-3 text-right font-medium ${o.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatBRL(o.openResult)}
                  </td>
                  <td className={`py-2 pr-3 text-right ${o.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPct(o.resultPct, 0)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-400">{o.info ? formatNumber(o.info.presumedStrike) : "—"}</td>
                  <td className="py-2 text-right text-slate-400">
                    {o.info ? (
                      <>
                        {monthLabel(o.info.monthIndex, o.info.presumedExpiry)}
                        <span className={`ml-1.5 text-xs ${o.days !== null && o.days <= 60 ? "text-amber-400" : "text-slate-500"}`}>
                          ({o.days}d)
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {soldPuts.map((p) => (
          <div key={p.ticker} className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm">
            <p className="font-medium text-amber-300">{p.ticker}: cenários</p>
            <ul className="mt-2 space-y-1 text-slate-300">
              <li>
                <span className="text-slate-500">Fechar agora:</span> recompra por {formatBRL(p.quantity * p.currentPrice)}, realiza{" "}
                <span className="text-red-400">{formatBRL(p.openResult)}</span> (prêmio recebido {formatBRL(p.cashFlowIn)}).
              </li>
              {p.info && (
                <li>
                  <span className="text-slate-500">Ser exercido:</span> compra {formatNumber(p.quantity, 0)} {p.info.underlying} por{" "}
                  {formatBRL(p.quantity * p.info.presumedStrike)}; custo efetivo {formatBRL(p.info.presumedStrike - p.avgPrice)} por ação.
                </li>
              )}
              <li>
                <span className="text-slate-500">Rolar:</span> comparar custo líquido da rolagem × prazo ganho × nova exposição (Fase 2).
              </li>
            </ul>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <p className="text-sm font-medium text-slate-300">Concentração por setor</p>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Maior posição: {top.ticker} com {formatPct((top.positionValue / stocksValue) * 100, 1)} · top 5 somam{" "}
            {formatPct(top5Pct, 0)}
          </p>
          <div className="space-y-2.5">
            {sectors.map(({ sector, value }) => {
              const pct = (value / stocksValue) * 100;
              return (
                <div key={sector}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{SECTOR_LABEL[sector] ?? sector}</span>
                    <span className="text-slate-500">
                      {formatBRL(value)} · {formatPct(pct, 1)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-1.5 rounded-full ${pct > 25 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-300 mb-4">O que falta para fechar a Fase 0</p>
          <ol className="space-y-2.5 text-sm text-slate-400 list-decimal list-inside">
            {PENDENCIAS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <p className="text-sm font-medium text-slate-300 mb-4">Ações e FII — do pior ao melhor resultado</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
                <th className="py-2 pr-3">Ativo</th>
                <th className="py-2 pr-3">Setor</th>
                <th className="py-2 pr-3 text-right">Qtd</th>
                <th className="py-2 pr-3 text-right">PM</th>
                <th className="py-2 pr-3 text-right">Atual</th>
                <th className="py-2 pr-3 text-right">Posição</th>
                <th className="py-2 pr-3 text-right">Peso</th>
                <th className="py-2 pr-3 text-right">Resultado</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {stocksByResult.map((s) => {
                const cost = s.positionValue - s.openResult;
                return (
                  <tr key={s.ticker} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 font-medium text-slate-100">{s.ticker}</td>
                    <td className="py-2 pr-3 text-slate-400">{SECTOR_LABEL[s.sector] ?? s.sector}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.quantity, 0)}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.avgPrice)}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.currentPrice)}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{formatBRL(s.positionValue)}</td>
                    <td className="py-2 pr-3 text-right text-slate-400">{formatPct((s.positionValue / stocksValue) * 100, 1)}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${s.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatBRL(s.openResult)}
                    </td>
                    <td className={`py-2 text-right ${s.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPct((s.openResult / cost) * 100, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
