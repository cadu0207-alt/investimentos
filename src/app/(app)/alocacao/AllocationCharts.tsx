"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatBRL, formatPct } from "@/lib/domain/format";

const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#0ea5e9", "#38bdf8", "#7dd3fc", "#f59e0b", "#fbbf24", "#ef4444"];

export function AllocationCharts({
  byTicker,
  byClass,
}: {
  byTicker: { name: string; value: number }[];
  byClass: { name: string; value: number }[];
}) {
  const total = byTicker.reduce((a, b) => a + b.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Concentração por ativo</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byTicker} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1}>
                {byTicker.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => {
                  const value = Number(v) || 0;
                  return [`${formatBRL(value)} (${formatPct((value / total) * 100, 1)})`, String(n)];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Exposição por classe de ativo</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byClass} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => formatBRL(Number(v) || 0)}
              />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
