import { PageHeader, Card, Label, Input, Button } from "@/components/ui";
import { getLimits } from "@/lib/domain/queries";
import { LIMIT_FIELDS } from "@/lib/alerts/limits";
import { saveLimits } from "./actions";

export const dynamic = "force-dynamic";

const GROUPS = {
  venda: { title: "Alertas de venda", subtitle: "Usados agora no painel de alertas" },
  compra: { title: "Regras de compra", subtitle: "Usadas no checklist \"posso comprar?\" (próximo passo)" },
} as const;

export default async function LimitesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [limits, { ok, error }] = await Promise.all([getLimits(), searchParams]);

  return (
    <div>
      <PageHeader title="Limites de risco" subtitle="As regras que o sistema confere por você. Campo vazio volta ao valor padrão." />

      {ok && (
        <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2 mb-4">Limites salvos.</p>
      )}
      {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2 mb-4">{error}</p>}

      <form action={saveLimits} className="space-y-6">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((group) => (
          <Card key={group}>
            <h2 className="text-sm font-medium text-slate-300">{GROUPS[group].title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">{GROUPS[group].subtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {LIMIT_FIELDS.filter((f) => f.group === group).map((f) =>
                f.kind === "boolean" ? (
                  <label key={f.key} className="flex items-start gap-3 md:col-span-2">
                    <input
                      type="checkbox"
                      name={f.column}
                      defaultChecked={limits[f.key] as boolean}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-sm text-slate-200">{f.label}</span>
                      <span className="block text-xs text-slate-500">{f.help}</span>
                    </span>
                  </label>
                ) : (
                  <div key={f.key}>
                    <Label>
                      {f.label} {f.unit && <span className="text-slate-600">({f.unit})</span>}
                    </Label>
                    <Input
                      name={f.column}
                      inputMode="decimal"
                      defaultValue={String(limits[f.key])}
                      placeholder={`padrão ${f.default}`}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {f.help} Padrão: {String(f.default)}
                      {f.unit === "%" ? "%" : f.unit ? ` ${f.unit}` : ""}.
                    </p>
                  </div>
                )
              )}
            </div>
          </Card>
        ))}
        <Button type="submit">Salvar limites</Button>
      </form>
    </div>
  );
}
