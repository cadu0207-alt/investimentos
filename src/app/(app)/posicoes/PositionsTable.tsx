"use client";

import { useState } from "react";
import { upsertPosition, deletePosition } from "./actions";
import { Button, Input, Select, Label } from "@/components/ui";
import { formatBRL, formatPct, formatDate } from "@/lib/domain/format";
import type { InvestPosition } from "@/lib/domain/types";

const ASSET_CLASSES = [
  { value: "acao", label: "Ação" },
  { value: "fii", label: "FII" },
  { value: "etf", label: "ETF" },
  { value: "cripto", label: "Cripto" },
  { value: "outro", label: "Outro" },
];

export function PositionsTable({ positions }: { positions: InvestPosition[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-800">
            <th className="py-2 pr-4">Ticker</th>
            <th className="py-2 pr-4">Qtd.</th>
            <th className="py-2 pr-4">Preço médio</th>
            <th className="py-2 pr-4">Preço atual</th>
            <th className="py-2 pr-4">Valor de mercado</th>
            <th className="py-2 pr-4">P&L</th>
            <th className="py-2 pr-4">Corretora</th>
            <th className="py-2 pr-4">Atualizado</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const marketValue = p.quantity * (p.current_price ?? p.avg_price);
            const cost = p.quantity * p.avg_price;
            const pnl = marketValue - cost;
            const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
            const isEditing = editingId === p.id;

            if (isEditing) {
              return (
                <tr key={p.id} className="border-b border-slate-900 bg-slate-900/40">
                  <td colSpan={9} className="py-3">
                    <form
                      action={async (fd) => {
                        await upsertPosition(fd);
                        setEditingId(null);
                      }}
                      className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end px-2"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <div>
                        <Label>Ticker</Label>
                        <Input name="ticker" defaultValue={p.ticker} required />
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
                        <Input name="quantity" type="number" step="any" defaultValue={p.quantity} required />
                      </div>
                      <div>
                        <Label>Preço médio</Label>
                        <Input name="avg_price" type="number" step="any" defaultValue={p.avg_price} required />
                      </div>
                      <div>
                        <Label>Preço atual</Label>
                        <Input name="current_price" type="number" step="any" defaultValue={p.current_price ?? ""} />
                      </div>
                      <div>
                        <Label>Corretora</Label>
                        <Input name="broker" defaultValue={p.broker ?? "BTG"} />
                      </div>
                      <div className="col-span-2 md:col-span-6 flex gap-2 pt-1">
                        <Button type="submit">Salvar</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={p.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                <td className="py-2.5 pr-4 font-medium text-slate-100">{p.ticker}</td>
                <td className="py-2.5 pr-4 text-slate-300">{p.quantity}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatBRL(p.avg_price)}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatBRL(p.current_price)}</td>
                <td className="py-2.5 pr-4 text-slate-300">{formatBRL(marketValue)}</td>
                <td className={`py-2.5 pr-4 ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatBRL(pnl)} <span className="text-xs opacity-70">({formatPct(pnlPct, 1)})</span>
                </td>
                <td className="py-2.5 pr-4 text-slate-400">{p.broker}</td>
                <td className="py-2.5 pr-4 text-slate-500 text-xs">{formatDate(p.updated_at)}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-emerald-400 hover:underline"
                      onClick={() => setEditingId(p.id)}
                    >
                      Editar
                    </button>
                    <form action={deletePosition}>
                      <input type="hidden" name="id" value={p.id} />
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
