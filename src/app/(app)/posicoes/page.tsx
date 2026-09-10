import { getPositions, getManagedPortfolios } from "@/lib/domain/queries";
import { PageHeader, Card, Label, Input, Select, Button, EmptyState, Badge } from "@/components/ui";
import { upsertPosition } from "./actions";
import { PositionsTable } from "./PositionsTable";
import { formatBRL, formatPct } from "@/lib/domain/format";

const ASSET_CLASSES = [
  { value: "acao", label: "Ação" },
  { value: "fii", label: "FII" },
  { value: "etf", label: "ETF" },
  { value: "cripto", label: "Cripto" },
  { value: "outro", label: "Outro" },
];

export default async function PosicoesPage() {
  const [positions, managedPortfolios] = await Promise.all([getPositions(), getManagedPortfolios()]);

  const selfDirected = positions.filter((p) => !p.managed_portfolio_id);
  const grouped = managedPortfolios.map((mp) => ({
    portfolio: mp,
    positions: positions.filter((p) => p.managed_portfolio_id === mp.id),
  }));

  return (
    <div>
      <PageHeader
        title="Posições"
        subtitle="Ações, FIIs e demais ativos em carteira — separados entre autogeridos e carteiras administradas"
      />

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Adicionar posição</h2>
        <form action={upsertPosition} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Ticker</Label>
            <Input name="ticker" placeholder="PETR4" required />
          </div>
          <div>
            <Label>Classe</Label>
            <Select name="asset_class" defaultValue="acao">
              {ASSET_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input name="quantity" type="number" step="any" required />
          </div>
          <div>
            <Label>Preço médio</Label>
            <Input name="avg_price" type="number" step="any" required />
          </div>
          <div>
            <Label>Preço atual</Label>
            <Input name="current_price" type="number" step="any" />
          </div>
          <div>
            <Label>Corretora</Label>
            <Input name="broker" defaultValue="BTG" />
          </div>
          <div className="col-span-2 md:col-span-6">
            <Button type="submit">Adicionar posição (autogerida)</Button>
          </div>
        </form>
        <p className="text-xs text-slate-600 mt-2">
          Posições adicionadas por aqui entram como autogeridas. Para vincular a uma carteira administrada, edite a posição depois.
        </p>
      </Card>

      {/* Carteiras administradas */}
      {grouped.map(({ portfolio, positions: ps }) => {
        const market = ps.reduce((a, p) => a + p.quantity * (p.current_price ?? p.avg_price), 0);
        return (
          <div key={portfolio.id} className="mb-8">
            <Card className="mb-3 bg-emerald-950/10 border-emerald-900/40">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-100">{portfolio.name}</h2>
                    <Badge tone="positive">Administrada</Badge>
                    {portfolio.reinvest_dividends && <Badge>Reinv. proventos automático</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{portfolio.provider} · Referência {portfolio.reference_month}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-slate-500">Saldo aplicado</p>
                    <p className="text-sm font-medium text-slate-100">{formatBRL(portfolio.account_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rentabilidade (posição)</p>
                    <p className={`text-sm font-medium ${(portfolio.account_return_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatPct(portfolio.account_return_pct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Acumulada vs {portfolio.benchmark_name}</p>
                    <p className="text-sm font-medium text-slate-100">
                      {formatPct(portfolio.portfolio_accum_pct)} <span className="text-slate-600">/ {formatPct(portfolio.benchmark_accum_pct)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Valor de mercado (ativos)</p>
                    <p className="text-sm font-medium text-slate-100">{formatBRL(market)}</p>
                  </div>
                </div>
              </div>
              {portfolio.description && <p className="text-xs text-slate-500 mt-3 max-w-3xl">{portfolio.description}</p>}
            </Card>
            <Card>
              <PositionsTable positions={ps} />
            </Card>
          </div>
        );
      })}

      {/* Autogeridas */}
      <div>
        <h2 className="text-sm font-medium text-slate-300 mb-3">Posições autogeridas</h2>
        {selfDirected.length === 0 ? (
          <EmptyState
            title="Nenhuma posição autogerida cadastrada"
            description="Use o formulário acima para lançar posições que você mesmo gerencia, fora das carteiras administradas."
          />
        ) : (
          <Card>
            <PositionsTable positions={selfDirected} />
          </Card>
        )}
      </div>
    </div>
  );
}
