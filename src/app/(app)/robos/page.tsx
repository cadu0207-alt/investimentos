import { getRobotSignals } from "@/lib/domain/queries";
import { PageHeader, Card, Label, Input, Select, Textarea, Button, EmptyState, Badge } from "@/components/ui";
import { addSignal, deleteSignal } from "./actions";
import { formatBRL } from "@/lib/domain/format";

const ROBOTS = ["Skyfall", "Sniper", "The Stairway"];

export default async function RobosPage() {
  const signals = await getRobotSignals();

  const summary = ROBOTS.map((robot) => {
    const rows = signals.filter((s) => s.robot_name === robot);
    const pnl = rows.reduce((a, s) => a + (s.pnl ?? 0), 0);
    return { robot, count: rows.length, pnl };
  });

  return (
    <div>
      <PageHeader title="Robôs automatizados" subtitle="Sinais e resultados do Skyfall, Sniper e The Stairway (PETR4, WIN, BITFUT)" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summary.map((s) => (
          <Card key={s.robot}>
            <p className="text-xs text-slate-500 uppercase">{s.robot}</p>
            <p className={`text-2xl font-semibold mt-1.5 ${s.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatBRL(s.pnl)}</p>
            <p className="text-xs text-slate-500 mt-1">{s.count} sinais registrados</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-4">Registrar sinal</h2>
        <form action={addSignal} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Robô</Label>
            <Select name="robot_name" defaultValue="Skyfall">
              {ROBOTS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Ativo</Label>
            <Input name="asset" placeholder="PETR4 / WIN / BITFUT" required />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="signal_type" defaultValue="compra">
              <option value="compra">Compra</option>
              <option value="venda">Venda</option>
              <option value="fechamento">Fechamento</option>
            </Select>
          </div>
          <div>
            <Label>Data/hora</Label>
            <Input name="signal_time" type="datetime-local" />
          </div>
          <div>
            <Label>Preço</Label>
            <Input name="price" type="number" step="any" />
          </div>
          <div>
            <Label>P&L</Label>
            <Input name="pnl" type="number" step="any" />
          </div>
          <div className="col-span-2 md:col-span-5">
            <Label>Notas</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <div>
            <Button type="submit" className="w-full">Registrar</Button>
          </div>
        </form>
      </Card>

      {signals.length === 0 ? (
        <EmptyState title="Nenhum sinal registrado" description="Registre as entradas e saídas dos robôs para acompanhar performance aqui." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Robô</th>
                  <th className="py-2 pr-4">Ativo</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Preço</th>
                  <th className="py-2 pr-4">P&L</th>
                  <th className="py-2 pr-4">Notas</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                    <td className="py-2.5 pr-4 text-slate-400 text-xs">{new Date(s.signal_time).toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 pr-4 text-slate-200">{s.robot_name}</td>
                    <td className="py-2.5 pr-4 text-slate-200">{s.asset}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={s.signal_type === "compra" ? "positive" : s.signal_type === "venda" ? "negative" : "default"}>
                        {s.signal_type}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatBRL(s.price)}</td>
                    <td className={`py-2.5 pr-4 ${(s.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatBRL(s.pnl)}</td>
                    <td className="py-2.5 pr-4 text-slate-500 text-xs max-w-xs truncate">{s.notes}</td>
                    <td className="py-2.5 pr-4">
                      <form action={deleteSignal}>
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
