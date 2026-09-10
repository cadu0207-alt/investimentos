import { getSnapshots } from "@/lib/domain/queries";
import { PageHeader, Card, Label, Input, Textarea, Button, EmptyState } from "@/components/ui";
import { addSnapshot, deleteSnapshot } from "./actions";
import { BenchmarkChart } from "./BenchmarkChart";
import { formatBRL, formatDate, formatPct } from "@/lib/domain/format";

export default async function BenchmarkPage() {
  const snapshots = await getSnapshots();

  const base = snapshots[0];
  const chartData = snapshots.map((s) => ({
    date: s.snapshot_date,
    carteira: base ? ((s.total_value - base.total_value) / base.total_value) * 100 : 0,
    ibov:
      base?.ibov_index && s.ibov_index ? ((s.ibov_index - base.ibov_index) / base.ibov_index) * 100 : null,
    cdi: s.cdi_accum_pct ?? null,
  }));

  const last = snapshots[snapshots.length - 1];
  const portfolioReturnPct = base && last ? ((last.total_value - base.total_value) / base.total_value) * 100 : null;

  return (
    <div>
      <PageHeader title="Benchmark vs Ibovespa/CDI" subtitle="Rentabilidade da carteira comparada a índices de referência" />

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Registrar snapshot</h2>
        <form action={addSnapshot} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label>Data</Label>
            <Input name="snapshot_date" type="date" required />
          </div>
          <div>
            <Label>Valor total da carteira</Label>
            <Input name="total_value" type="number" step="any" required />
          </div>
          <div>
            <Label>Ibovespa (pontos)</Label>
            <Input name="ibov_index" type="number" step="any" />
          </div>
          <div>
            <Label>CDI acumulado (%)</Label>
            <Input name="cdi_accum_pct" type="number" step="any" />
          </div>
          <div>
            <Button type="submit" className="w-full">Salvar</Button>
          </div>
          <div className="col-span-2 md:col-span-5">
            <Label>Notas</Label>
            <Textarea name="notes" rows={2} />
          </div>
        </form>
      </Card>

      {snapshots.length < 2 ? (
        <EmptyState
          title="Registre pelo menos dois snapshots"
          description="Com dois ou mais pontos no tempo eu calculo a rentabilidade da carteira e comparo com Ibovespa e CDI."
        />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-300">Rentabilidade acumulada</h2>
              <span className={`text-sm font-medium ${(portfolioReturnPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Carteira: {formatPct(portfolioReturnPct)}
              </span>
            </div>
            <BenchmarkChart data={chartData} />
          </Card>
        </>
      )}

      {snapshots.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Valor total</th>
                  <th className="py-2 pr-4">Ibovespa</th>
                  <th className="py-2 pr-4">CDI acum.</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((s) => (
                  <tr key={s.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                    <td className="py-2.5 pr-4 text-slate-200">{formatDate(s.snapshot_date)}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatBRL(s.total_value)}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{s.ibov_index ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatPct(s.cdi_accum_pct)}</td>
                    <td className="py-2.5 pr-4">
                      <form action={deleteSnapshot}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="text-xs text-red-400 hover:underline" type="submit">
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
