"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/domain/format";

interface Point {
  date: string;
  carteira: number;
  ibov: number | null;
  cdi: number | null;
}

export function BenchmarkChart({ data }: { data: Point[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            labelFormatter={(d) => formatDate(d as string)}
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="carteira" name="Carteira" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ibov" name="Ibovespa" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cdi" name="CDI" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
