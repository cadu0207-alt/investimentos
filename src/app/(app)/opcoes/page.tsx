import { getOptionPositions } from "@/lib/domain/queries";
import { PageHeader, Card, Label, Input, Select, Button, EmptyState } from "@/components/ui";
import { upsertOptionPosition } from "./actions";
import { OptionsTable } from "./OptionsTable";
import { GreeksCalculator } from "./GreeksCalculator";
import { formatBRL, formatNumber } from "@/lib/domain/format";

export default async function OpcoesPage() {
  const positions = await getOptionPositions();
  const open = positions.filter((o) => o.status === "aberta");

  // Resumo por grupo de estratégia (ex: venda de put + compra de call sobre o mesmo objeto)
  const groups = new Map<string, typeof open>();
  for (const o of open) {
    const key = o.strategy_group || o.underlying;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }

  const netDeltaTotal = open.reduce((acc, o) => acc + (o.delta ?? 0) * o.quantity, 0);
  const netThetaTotal = open.reduce((acc, o) => acc + (o.theta ?? 0) * o.quantity, 0);
  const netPremium = open.reduce((acc, o) => {
    const sign = o.strategy_leg?.startsWith("venda") ? 1 : -1;
    return acc + sign * o.quantity * o.avg_price;
  }, 0);

  return (
    <div>
      <PageHeader
        title="Risco de opções"
        subtitle="Greeks, prêmio líquido e cenários por estrutura (venda de put + compra de call, etc.)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs text-slate-500 uppercase">Delta líquido</p>
          <p className="text-2xl font-semibold text-slate-50 mt-1.5">{formatNumber(netDeltaTotal, 2)}</p>
          <p className="text-xs text-slate-500 mt-1">Exposição direcional agregada</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase">Theta líquido / dia</p>
          <p className={`text-2xl font-semibold mt-1.5 ${netThetaTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatBRL(netThetaTotal)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Decaimento de tempo estimado</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase">Prêmio líquido em aberto</p>
          <p className={`text-2xl font-semibold mt-1.5 ${netPremium >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatBRL(netPremium)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Vendido menos comprado</p>
        </Card>
      </div>

      <div className="mb-6">
        <GreeksCalculator />
      </div>

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Adicionar posição de opção</h2>
        <form action={upsertOptionPosition} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Código</Label>
            <Input name="option_code" placeholder="ROXOF123" required />
          </div>
          <div>
            <Label>Ativo-objeto</Label>
            <Input name="underlying" placeholder="ROXO34" required />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="option_type" defaultValue="put">
              <option value="call">Call</option>
              <option value="put">Put</option>
            </Select>
          </div>
          <div>
            <Label>Estrutura</Label>
            <Select name="strategy_leg" defaultValue="venda_put">
              <option value="venda_put">Venda de put</option>
              <option value="compra_call">Compra de call</option>
              <option value="venda_call">Venda de call</option>
              <option value="compra_put">Compra de put</option>
            </Select>
          </div>
          <div>
            <Label>Grupo da estratégia</Label>
            <Input name="strategy_group" placeholder="ex: ROXO34-2026-06" />
          </div>
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="aberta">
              <option value="aberta">Aberta</option>
              <option value="fechada">Fechada</option>
              <option value="rolada">Rolada</option>
            </Select>
          </div>
          <div>
            <Label>Strike</Label>
            <Input name="strike" type="number" step="any" />
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input name="expiry" type="date" />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input name="quantity" type="number" step="1" required />
          </div>
          <div>
            <Label>Prêmio médio</Label>
            <Input name="avg_price" type="number" step="any" required />
          </div>
          <div>
            <Label>Delta</Label>
            <Input name="delta" type="number" step="any" />
          </div>
          <div>
            <Label>Theta</Label>
            <Input name="theta" type="number" step="any" />
          </div>
          <div className="col-span-2 md:col-span-6">
            <Button type="submit">Adicionar posição</Button>
          </div>
        </form>
      </Card>

      {positions.length === 0 ? (
        <EmptyState
          title="Nenhuma posição de opção cadastrada"
          description="Cadastre suas estruturas (venda de put + compra de call, etc.) para acompanhar Greeks e cenários de rolagem."
        />
      ) : (
        <Card>
          <OptionsTable positions={positions} />
        </Card>
      )}
    </div>
  );
}
