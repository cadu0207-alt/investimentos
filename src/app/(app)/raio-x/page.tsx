import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { formatBRL, formatPct, formatNumber, formatDate } from "@/lib/domain/format";
import { getSnapshot, getAccountSnapshot, getIrSnapshot, SECTOR_LABEL, SNAPSHOT_DATE } from "@/lib/fase0/snapshot";

const PENDENCIAS = [
  "Preencher a ficha de cada posição em Fichas de posição (/fichas): tese, ação, gatilho de saída e prazo.",
  "Opcional: posição e custo médio em 31/12/2025 para conciliar o prejuízo acumulado ao centavo.",
];

const RESOLVIDAS = [
  "Strikes, vencimentos e cotação dos objetos das opções (Necton).",
  "Caixa e bloqueios da conta (Invest Flex é crédito, não saldo).",
  "Conta única: Necton/BTG Pactual.",
  "Prejuízo acumulado a compensar (IR de out/2026).",
  "Histórico de perdas de 2026 a partir das 50 notas (docs/fase0/historico-2026.md).",
  "PM: os valores do Profit estavam errados (ex.: CYRE3 33,00 × 22,20 real; PETR4 29,19 × 43,96 real). Fonte passa a ser a Necton.",
];

export default async function RaioXPage() {
  const [rows, account, ir] = await Promise.all([getSnapshot(), getAccountSnapshot(), getIrSnapshot()]);
  const carriedLosses = ir.swing_trade.prejuizo_a_compensar + ir.day_trade.prejuizo_a_compensar;
  const irMonthLabel = new Date(`${ir.mes}-01T00:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

  const stocks = rows.filter((r) => r.kind === "acao" || r.kind === "fii");
  const options = rows.filter((r) => r.option !== null);

  const sum = (list: typeof rows, pick: (r: (typeof rows)[number]) => number) => list.reduce((acc, r) => acc + pick(r), 0);
  const totalResult = sum(rows, (r) => r.openResult);
  const totalDividends = sum(rows, (r) => r.dividends);
  const stocksValue = sum(stocks, (r) => r.positionValue);
  const stocksInvested = sum(stocks, (r) => r.invested);
  const stocksResult = sum(stocks, (r) => r.openResult);
  const optionsResult = sum(options, (r) => r.openResult);
  const givenBackPct = stocksResult > 0 ? (-optionsResult / stocksResult) * 100 : null;
  const cash = account.saldo_disponivel;
  const credit = account.saldo_mais_invest_flex - account.saldo_disponivel;

  const optionRows = options
    .map((o) => {
      const opt = o.option!;
      const isPut = o.kind === "opcao_put";
      const itm = isPut ? opt.underlyingPrice < opt.strike : opt.underlyingPrice > opt.strike;
      return {
        ...o,
        opt,
        isPut,
        itm,
        moveToStrikePct: (opt.strike / opt.underlyingPrice - 1) * 100,
        resultPct: (o.openResult / Math.abs(o.invested)) * 100,
      };
    })
    .sort((a, b) => a.openResult - b.openResult);

  const soldPuts = optionRows.filter((o) => o.side === "venda" && o.isPut);
  const assignmentNotional = soldPuts.reduce((acc, o) => acc + o.quantity * o.opt.strike, 0);

  const blocked = stocks.filter((s) => s.blockedQuantity > 0);
  const blockedValue = blocked.reduce((acc, s) => acc + s.blockedQuantity * s.currentPrice, 0);

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
        subtitle={`Fase 0 · snapshot de ${formatDate(SNAPSHOT_DATE)} · fonte: Necton`}
        action={<Badge tone="warning">Dados estáticos até a Fase 1</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Resultado com proventos"
          value={formatBRL(totalResult + totalDividends)}
          hint={`${formatBRL(totalResult)} de preço + ${formatBRL(totalDividends)} de proventos`}
          tone={totalResult + totalDividends >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Ações + FII"
          value={formatBRL(stocksResult)}
          hint={`${formatPct((stocksResult / stocksInvested) * 100, 1)} sobre o investido · ${stocks.length} ativos`}
          tone={stocksResult >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Opções"
          value={formatBRL(optionsResult)}
          hint={givenBackPct === null ? undefined : `Devolve ${formatPct(givenBackPct, 0)} do ganho de ações + FII`}
          tone={optionsResult >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Caixa (saldo livre)"
          value={formatBRL(cash)}
          hint={`+ ${formatBRL(credit)} de limite Invest Flex (crédito, não é saldo)`}
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Prejuízos realizados e IR</p>
            <p className="text-xs text-slate-500 mt-0.5">Consolidado de {irMonthLabel} na Necton · conta única (BTG Pactual)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase">Prejuízo acumulado a compensar</p>
            <p className="text-lg font-semibold text-red-400">{formatBRL(carriedLosses)}</p>
            <p className="text-xs text-slate-500">Abate lucros futuros antes do IR</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Swing trade (ações e opções)", data: ir.swing_trade, rate: 0.15 },
            { label: "Day trade", data: ir.day_trade, rate: 0.2 },
          ].map(({ label, data, rate }) => (
            <div key={label} className="rounded-lg border border-slate-800 p-4">
              <p className="text-xs text-slate-500 uppercase">{label}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Resultado do mês</p>
                  <p className={data.resultado_mes >= 0 ? "text-emerald-400" : "text-red-400"}>{formatBRL(data.resultado_mes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prejuízo a compensar</p>
                  <p className="text-red-400">{formatBRL(data.prejuizo_a_compensar)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Alíquota de {formatPct(rate * 100, 0)}: lucros futuros de até {formatBRL(data.prejuizo_a_compensar)} nessa modalidade não pagam
                IR (até {formatBRL(data.prejuizo_a_compensar * rate)} de imposto evitado).
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Vendas de ações no mês: {formatBRL(ir.swing_trade.total_vendas_acoes)} (limite de isenção{" "}
          {formatBRL(ir.swing_trade.limite_isencao)}; opções não entram na isenção).
        </p>
      </Card>

      <Card className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Opções</p>
            <p className="text-xs text-slate-500 mt-0.5">
              &quot;Até o strike&quot; = quanto o objeto precisa andar para a opção mudar de lado (ITM ↔ OTM).
            </p>
          </div>
          {soldPuts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase">Compra obrigatória se exercida</p>
              <p className="text-lg font-semibold text-amber-400">{formatBRL(assignmentNotional)}</p>
              <p className="text-xs text-slate-500">
                Caixa livre {formatBRL(cash)} · {formatPct((assignmentNotional / stocksValue) * 100, 0)} do valor em ações
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
                <th className="py-2 pr-3 text-right">B&amp;S</th>
                <th className="py-2 pr-3 text-right">Objeto</th>
                <th className="py-2 pr-3 text-right">Strike</th>
                <th className="py-2 pr-3 text-right">Até o strike</th>
                <th className="py-2 pr-3 text-right">Vencimento</th>
                <th className="py-2 pr-3 text-right">Resultado</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {optionRows.map((o) => (
                <tr key={o.ticker} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-medium text-slate-100">{o.ticker}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <Badge tone={o.side === "venda" ? "warning" : "default"}>
                      {o.isPut ? "Put" : "Call"} {o.side === "venda" ? "vendida" : "comprada"}
                    </Badge>{" "}
                    <Badge tone={o.itm ? (o.side === "venda" ? "negative" : "positive") : "default"}>{o.itm ? "ITM" : "OTM"}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.quantity, 0)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.avgPrice)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.currentPrice)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">{formatNumber(o.opt.blackScholes)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300 whitespace-nowrap">
                    <span className="text-slate-500 text-xs mr-1">{o.opt.underlying}</span>
                    {formatNumber(o.opt.underlyingPrice)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(o.opt.strike)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">
                    {o.moveToStrikePct > 0 ? "+" : ""}
                    {formatPct(o.moveToStrikePct, 1)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-400 whitespace-nowrap">
                    {formatDate(o.opt.expiry)}
                    <span className={`ml-1.5 text-xs ${o.opt.businessDays <= 45 ? "text-amber-400" : "text-slate-500"}`}>
                      ({o.opt.businessDays} d.u.)
                    </span>
                  </td>
                  <td className={`py-2 pr-3 text-right font-medium ${o.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatBRL(o.openResult)}
                  </td>
                  <td className={`py-2 text-right ${o.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPct(o.resultPct, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {soldPuts.map((p) => {
          const premium = Math.abs(p.invested);
          const effectiveCost = p.opt.strike - p.avgPrice;
          const lossIfAssigned = p.quantity * (effectiveCost - p.opt.underlyingPrice);
          return (
            <div key={p.ticker} className="mt-4 rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm">
              <p className="font-medium text-amber-300">{p.ticker}: cenários até {formatDate(p.opt.expiry)}</p>
              <ul className="mt-2 space-y-1.5 text-slate-300">
                <li>
                  <span className="text-slate-500">Fechar agora:</span> recompra por {formatBRL(p.quantity * p.currentPrice)} e realiza{" "}
                  <span className="text-red-400">{formatBRL(p.openResult)}</span> (prêmio recebido {formatBRL(premium)}).
                </li>
                <li>
                  <span className="text-slate-500">Ser exercido:</span> compra {formatNumber(p.quantity, 0)} {p.opt.underlying} por{" "}
                  {formatBRL(p.quantity * p.opt.strike)} — custo efetivo {formatBRL(effectiveCost)}/ação contra{" "}
                  {formatBRL(p.opt.underlyingPrice)} de mercado (<span className="text-red-400">{formatBRL(-lossIfAssigned)}</span> no dia
                  do exercício, se o preço não mudar).{" "}
                  {cash >= p.quantity * p.opt.strike ? (
                    <>O caixa cobre: sobram {formatBRL(cash - p.quantity * p.opt.strike)}.</>
                  ) : (
                    <span className="text-red-400">
                      O caixa não cobre: faltam {formatBRL(p.quantity * p.opt.strike - cash)}, que viriam do Invest Flex (empréstimo, com
                      juros) ou da venda de ações.
                    </span>
                  )}
                </li>
                <li>
                  <span className="text-slate-500">Virar pó:</span> {p.opt.underlying} precisa subir{" "}
                  {formatPct(p.moveToStrikePct, 1)} em {p.opt.businessDays} dias úteis. Empate (sem perda) a partir de{" "}
                  {formatBRL(effectiveCost)} (+{formatPct((effectiveCost / p.opt.underlyingPrice - 1) * 100, 1)}).
                </li>
                <li>
                  <span className="text-slate-500">Rolar:</span> comparar custo líquido da rolagem × prazo ganho × nova exposição (Fase 2).
                </li>
              </ul>
              {blocked.length > 0 && (
                <p className="mt-3 text-xs text-slate-400">
                  Garantia: {formatBRL(blockedValue)} em ações bloqueadas ({blocked.map((b) => b.ticker).join(", ")}). Elas só
                  podem ser vendidas depois de liberadas.
                </p>
              )}
            </div>
          );
        })}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <p className="text-sm font-medium text-slate-300">Concentração por setor (ações + FII)</p>
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
          <p className="text-xs text-slate-500 uppercase mt-5 mb-2">Resolvido</p>
          <ul className="space-y-1.5 text-xs text-slate-500">
            {RESOLVIDAS.map((r) => (
              <li key={r}>✓ {r}</li>
            ))}
          </ul>
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
                <th className="py-2 pr-3 text-right">PM c/ prov.</th>
                <th className="py-2 pr-3 text-right">Atual</th>
                <th className="py-2 pr-3 text-right">Posição</th>
                <th className="py-2 pr-3 text-right">Peso</th>
                <th className="py-2 pr-3 text-right">Resultado</th>
                <th className="py-2 pr-3 text-right">%</th>
                <th className="py-2 pr-3 text-right">Proventos</th>
                <th className="py-2 text-right">Bloq.</th>
              </tr>
            </thead>
            <tbody>
              {stocksByResult.map((s) => (
                <tr key={s.ticker} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-medium text-slate-100">{s.ticker}</td>
                  <td className="py-2 pr-3 text-slate-400">{SECTOR_LABEL[s.sector] ?? s.sector}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.quantity, 0)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.avgPrice)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">{formatNumber(s.avgPriceWithDividends)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatNumber(s.currentPrice)}</td>
                  <td className="py-2 pr-3 text-right text-slate-300">{formatBRL(s.positionValue)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400">{formatPct((s.positionValue / stocksValue) * 100, 1)}</td>
                  <td className={`py-2 pr-3 text-right font-medium ${s.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatBRL(s.openResult)}
                  </td>
                  <td className={`py-2 pr-3 text-right ${s.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPct((s.openResult / s.invested) * 100, 1)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-400">{s.dividends > 0 ? formatBRL(s.dividends) : "—"}</td>
                  <td className="py-2 text-right text-slate-500">{s.blockedQuantity > 0 ? formatNumber(s.blockedQuantity, 0) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
