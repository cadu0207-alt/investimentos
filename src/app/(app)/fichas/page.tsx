import { PageHeader, Card, Label, Input, Select, Textarea, Button, Badge } from "@/components/ui";
import { formatBRL, formatPct, formatNumber, formatDate } from "@/lib/domain/format";
import { getPositionPlans } from "@/lib/domain/queries";
import type { InvestPositionPlan, PlanAction } from "@/lib/domain/types";
import { getSnapshot, SECTOR_LABEL } from "@/lib/fase0/snapshot";
import { savePlan } from "./actions";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<PlanAction, string> = {
  a_definir: "A definir",
  manter: "Manter",
  reduzir: "Reduzir",
  encerrar: "Encerrar",
  rolar: "Rolar",
  aceitar_exercicio: "Aceitar exercício",
  call_coberta: "Call coberta",
};

const isComplete = (p: InvestPositionPlan | undefined) =>
  !!p && p.action !== "a_definir" && !!p.thesis && (p.exit_price !== null || p.stop_price !== null) && !!p.deadline;

export default async function FichasPage() {
  const [rows, plans] = await Promise.all([getSnapshot(), getPositionPlans()]);
  const planByTicker = new Map(plans.map((p) => [p.ticker, p]));

  // Opções primeiro (vencem antes), depois ações do maior para o menor peso
  const ordered = [...rows].sort((a, b) => {
    if (!!a.option !== !!b.option) return a.option ? -1 : 1;
    return Math.abs(b.positionValue) - Math.abs(a.positionValue);
  });
  const done = ordered.filter((r) => isComplete(planByTicker.get(r.ticker))).length;

  return (
    <div>
      <PageHeader
        title="Fichas de posição"
        subtitle="Uma regra escrita por ativo: por que está na carteira, o que fazer e quando sair"
        action={
          <Badge tone={done === ordered.length ? "positive" : "warning"}>
            {done} de {ordered.length} completas
          </Badge>
        }
      />

      <p className="text-xs text-slate-500 mb-6 max-w-3xl">
        Ficha completa = ação escolhida, tese, ao menos um gatilho de preço (saída ou stop) e prazo. Quem decide é você; os números ao
        lado de cada ativo vêm do snapshot da Necton de 22/10/2026.
      </p>

      <div className="space-y-4">
        {ordered.map((r) => {
          const plan = planByTicker.get(r.ticker);
          const complete = isComplete(plan);
          return (
            <Card key={r.ticker}>
              <details open={!complete}>
                <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 cursor-pointer list-none">
                  <span className="font-semibold text-slate-100 w-24">{r.ticker}</span>
                  <Badge tone={complete ? "positive" : "warning"}>{complete ? ACTION_LABEL[plan!.action] : "Pendente"}</Badge>
                  <span className="text-xs text-slate-500">
                    {r.option
                      ? `${r.kind === "opcao_put" ? "Put" : "Call"} ${r.side === "venda" ? "vendida" : "comprada"} · strike ${formatNumber(
                          r.option.strike
                        )} · vence ${formatDate(r.option.expiry)}`
                      : `${SECTOR_LABEL[r.sector] ?? r.sector} · ${formatNumber(r.quantity, 0)} × PM ${formatNumber(r.avgPrice)} · atual ${formatNumber(
                          r.currentPrice
                        )}`}
                  </span>
                  <span className={`text-xs font-medium ml-auto ${r.openResult >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatBRL(r.openResult)} ({formatPct((r.openResult / Math.abs(r.invested)) * 100, 1)})
                  </span>
                </summary>

                <form action={savePlan} className="mt-4 space-y-3">
                  <input type="hidden" name="ticker" value={r.ticker} />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <Label>Ação</Label>
                      <Select name="action" defaultValue={plan?.action ?? "a_definir"}>
                        {Object.entries(ACTION_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Saída (alvo) R$</Label>
                      <Input name="exit_price" inputMode="decimal" defaultValue={plan?.exit_price ?? ""} />
                    </div>
                    <div>
                      <Label>Stop R$</Label>
                      <Input name="stop_price" inputMode="decimal" defaultValue={plan?.stop_price ?? ""} />
                    </div>
                    <div>
                      <Label>Prazo</Label>
                      <Input name="deadline" type="date" defaultValue={plan?.deadline ?? r.option?.expiry ?? ""} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label>Gatilho de revisão</Label>
                      <Input name="review_trigger" placeholder="ex: resultado 3T26" defaultValue={plan?.review_trigger ?? ""} />
                    </div>
                  </div>
                  <div>
                    <Label>Tese (por que está na carteira)</Label>
                    <Textarea name="thesis" rows={2} defaultValue={plan?.thesis ?? ""} />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea name="notes" rows={2} defaultValue={plan?.notes ?? ""} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit">Salvar ficha</Button>
                    {plan && <span className="text-xs text-slate-500">Atualizada em {formatDate(plan.updated_at)}</span>}
                  </div>
                </form>
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
