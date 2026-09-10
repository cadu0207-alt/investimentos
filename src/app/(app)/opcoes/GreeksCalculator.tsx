"use client";

import { useMemo, useState } from "react";
import { Card, Input, Label, Select } from "@/components/ui";
import { calculateGreeks } from "@/lib/domain/blackScholes";
import { formatNumber, formatBRL } from "@/lib/domain/format";

export function GreeksCalculator() {
  const [spot, setSpot] = useState("");
  const [strike, setStrike] = useState("");
  const [days, setDays] = useState("");
  const [iv, setIv] = useState("");
  const [rate, setRate] = useState("13.25");
  const [optionType, setOptionType] = useState<"call" | "put">("put");

  const result = useMemo(() => {
    const s = Number(spot);
    const k = Number(strike);
    const d = Number(days);
    const v = Number(iv);
    const r = Number(rate);
    if (!s || !k || !d || !v) return null;
    return calculateGreeks({
      spot: s,
      strike: k,
      daysToExpiry: d,
      volatility: v / 100,
      riskFreeRate: r / 100,
      optionType,
    });
  }, [spot, strike, days, iv, rate, optionType]);

  return (
    <Card>
      <h2 className="text-sm font-medium text-slate-300 mb-1">Calculadora de Greeks (Black-Scholes)</h2>
      <p className="text-xs text-slate-500 mb-4">
        Estimativa a partir do preço do ativo, strike, dias até o vencimento, volatilidade implícita e taxa livre de risco (Selic). Use para
        preencher os campos de Greeks das posições abaixo.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div>
          <Label>Preço do ativo</Label>
          <Input type="number" step="any" value={spot} onChange={(e) => setSpot(e.target.value)} />
        </div>
        <div>
          <Label>Strike</Label>
          <Input type="number" step="any" value={strike} onChange={(e) => setStrike(e.target.value)} />
        </div>
        <div>
          <Label>Dias p/ vencimento</Label>
          <Input type="number" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div>
          <Label>Vol. implícita (%)</Label>
          <Input type="number" step="any" value={iv} onChange={(e) => setIv(e.target.value)} />
        </div>
        <div>
          <Label>Taxa livre de risco (%)</Label>
          <Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={optionType} onChange={(e) => setOptionType(e.target.value as "call" | "put")}>
            <option value="call">Call</option>
            <option value="put">Put</option>
          </Select>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800">
          <Metric label="Preço teórico" value={formatBRL(result.price)} />
          <Metric label="Delta" value={formatNumber(result.delta, 4)} />
          <Metric label="Gamma" value={formatNumber(result.gamma, 4)} />
          <Metric label="Theta / dia" value={formatBRL(result.theta)} />
          <Metric label="Vega (1pp vol)" value={formatBRL(result.vega)} />
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}
