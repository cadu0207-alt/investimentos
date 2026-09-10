"use client";

import { useState } from "react";
import { upsertOptionPosition, deleteOptionPosition } from "./actions";
import { Button, Input, Select, Label, Textarea, Badge } from "@/components/ui";
import { formatBRL, formatDate, formatNumber } from "@/lib/domain/format";
import type { InvestOptionPosition } from "@/lib/domain/types";

const LEG_LABEL: Record<string, string> = {
  venda_put: "Venda de put",
  compra_call: "Compra de call",
  venda_call: "Venda de call",
  compra_put: "Compra de put",
};

function daysToExpiry(expiry: string | null): number | null {
  if (!expiry) return null;
  const ms = new Date(expiry + "T00:00:00Z").getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function OptionsTable({ positions }: { positions: InvestOptionPosition[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
            <th className="py-2 pr-4">Código</th>
            <th className="py-2 pr-4">Estrutura</th>
            <th className="py-2 pr-4">Objeto</th>
            <th className="py-2 pr-4">Strike</th>
            <th className="py-2 pr-4">Vencimento</th>
            <th className="py-2 pr-4">Qtd.</th>
            <th className="py-2 pr-4">Prêmio</th>
            <th className="py-2 pr-4">Delta</th>
            <th className="py-2 pr-4">Theta</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {positions.map((o) => {
            const dte = daysToExpiry(o.expiry);
            const isEditing = editingId === o.id;

            if (isEditing) {
              return (
                <tr key={o.id} className="border-b border-slate-900 bg-slate-900/40">
                  <td colSpan={11} className="py-3">
                    <EditForm option={o} onDone={() => setEditingId(null)} />
                  </td>
                </tr>
              );
            }

            return (
              <tr key={o.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                <td className="py-2.5 pr-4 font-medium text-slate-100">{o.option_code}</td>
                <td className="py-2.5 pr-4 text-slate-300">{o.strategy_leg ? LEG_LABEL[o.strategy_leg] : "—"}</td>
                <td className="py-2.5 pr-4 text-slate-300">{o.underlying}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatBRL(o.strike)}</td>
                <td className="py-2.5 pr-4 text-slate-400 text-xs">
                  {formatDate(o.expiry)}
                  {dte !== null && <span className="block text-slate-600">{dte >= 0 ? `${dte}d` : "vencida"}</span>}
                </td>
                <td className="py-2.5 pr-4 text-slate-300">{o.quantity}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatBRL(o.avg_price)}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatNumber(o.delta, 3)}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatNumber(o.theta, 2)}</td>
                <td className="py-2.5 pr-4">
                  <Badge tone={o.status === "aberta" ? "positive" : o.status === "rolada" ? "warning" : "default"}>
                    {o.status}
                  </Badge>
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-emerald-400 hover:underline" onClick={() => setEditingId(o.id)}>
                      Editar
                    </button>
                    <form action={deleteOptionPosition}>
                      <input type="hidden" name="id" value={o.id} />
                      <button className="text-xs text-red-400 hover:underline" type="submit">
                        Remover
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditForm({ option: o, onDone }: { option: InvestOptionPosition; onDone: () => void }) {
  return (
    <form
      action={async (fd) => {
        await upsertOptionPosition(fd);
        onDone();
      }}
      className="grid grid-cols-2 md:grid-cols-6 gap-3 px-2"
    >
      <input type="hidden" name="id" value={o.id} />
      <div>
        <Label>Código</Label>
        <Input name="option_code" defaultValue={o.option_code} required />
      </div>
      <div>
        <Label>Ativo-objeto</Label>
        <Input name="underlying" defaultValue={o.underlying} required />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select name="option_type" defaultValue={o.option_type ?? "put"}>
          <option value="call">Call</option>
          <option value="put">Put</option>
        </Select>
      </div>
      <div>
        <Label>Estrutura</Label>
        <Select name="strategy_leg" defaultValue={o.strategy_leg ?? "venda_put"}>
          {Object.entries(LEG_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Grupo da estratégia</Label>
        <Input name="strategy_group" defaultValue={o.strategy_group ?? ""} placeholder="ex: ROXO34-2026-06" />
      </div>
      <div>
        <Label>Status</Label>
        <Select name="status" defaultValue={o.status}>
          <option value="aberta">Aberta</option>
          <option value="fechada">Fechada</option>
          <option value="rolada">Rolada</option>
        </Select>
      </div>
      <div>
        <Label>Strike</Label>
        <Input name="strike" type="number" step="any" defaultValue={o.strike ?? ""} />
      </div>
      <div>
        <Label>Vencimento</Label>
        <Input name="expiry" type="date" defaultValue={o.expiry ?? ""} />
      </div>
      <div>
        <Label>Quantidade</Label>
        <Input name="quantity" type="number" step="1" defaultValue={o.quantity} required />
      </div>
      <div>
        <Label>Prêmio médio</Label>
        <Input name="avg_price" type="number" step="any" defaultValue={o.avg_price} required />
      </div>
      <div>
        <Label>Prêmio atual</Label>
        <Input name="current_price" type="number" step="any" defaultValue={o.current_price ?? ""} />
      </div>
      <div>
        <Label>Delta</Label>
        <Input name="delta" type="number" step="any" defaultValue={o.delta ?? ""} />
      </div>
      <div>
        <Label>Gamma</Label>
        <Input name="gamma" type="number" step="any" defaultValue={o.gamma ?? ""} />
      </div>
      <div>
        <Label>Theta</Label>
        <Input name="theta" type="number" step="any" defaultValue={o.theta ?? ""} />
      </div>
      <div>
        <Label>Vega</Label>
        <Input name="vega" type="number" step="any" defaultValue={o.vega ?? ""} />
      </div>
      <div>
        <Label>IV (%)</Label>
        <Input name="iv" type="number" step="any" defaultValue={o.iv ?? ""} />
      </div>
      <div className="col-span-2 md:col-span-6">
        <Label>Notas</Label>
        <Textarea name="notes" defaultValue={o.notes ?? ""} rows={2} />
      </div>
      <div className="col-span-2 md:col-span-6 flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
