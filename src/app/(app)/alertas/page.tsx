import Link from "next/link";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/domain/format";
import { getLimits, getPositionPlans } from "@/lib/domain/queries";
import { computeSellAlerts, type AlertLevel } from "@/lib/alerts/sellAlerts";
import { getAccountSnapshot, getIrSnapshot, getSnapshot, SNAPSHOT_DATE } from "@/lib/fase0/snapshot";

export const dynamic = "force-dynamic";

const LEVELS: Record<AlertLevel, { title: string; subtitle: string; tone: "negative" | "warning" | "default"; border: string }> = {
  1: { title: "Nível 1 · Risco com prazo", subtitle: "Resolver primeiro", tone: "negative", border: "border-red-900/70" },
  2: { title: "Nível 2 · Regra quebrada", subtitle: "Plano ou limite fora do combinado", tone: "warning", border: "border-amber-900/60" },
  3: { title: "Nível 3 · Oportunidade de realizar", subtitle: "Avaliar quando houver tempo", tone: "default", border: "border-slate-800" },
};

export default async function AlertasPage() {
  const [rows, account, plans, ir, limits] = await Promise.all([
    getSnapshot(),
    getAccountSnapshot(),
    getPositionPlans(),
    getIrSnapshot(),
    getLimits(),
  ]);
  const alerts = computeSellAlerts({
    rows,
    account,
    plans,
    monthStockSales: ir.swing_trade.total_vendas_acoes,
    salesMonthLabel: ir.mes.split("-").reverse().join("/"),
    today: new Date(),
    limits,
  });

  // "Sem plano escrito" é um alerta por ativo; agrupamos para não esconder o resto
  const missingPlans = alerts.filter((a) => a.kind === "sem_ficha");
  const others = alerts.filter((a) => a.kind !== "sem_ficha");

  return (
    <div>
      <PageHeader
        title="Alertas de venda"
        subtitle={`O que olhar primeiro, do mais urgente ao menos urgente · posições de ${formatDate(SNAPSHOT_DATE)}`}
        action={
          <div className="flex gap-2">
            {([1, 2, 3] as AlertLevel[]).map((l) => (
              <Badge key={l} tone={LEVELS[l].tone}>
                N{l}: {alerts.filter((a) => a.level === l).length}
              </Badge>
            ))}
          </div>
        }
      />

      <p className="text-xs text-slate-500 mb-6 max-w-3xl">
        Sinais calculados a partir das posições, das fichas e dos limites. Quem decide o que fazer é você. Limites atuais: ativo até{" "}
        {limits.maxAssetPct}%, setor até {limits.maxSectorPct}%, vencimento próximo = {limits.nearExpiryBusinessDays}{" "}
        dias úteis.{" "}
        <Link href="/limites" className="text-emerald-400 hover:underline">
          Ajustar limites
        </Link>
      </p>

      {alerts.length === 0 ? (
        <EmptyState title="Nenhum alerta" description="Nenhuma posição fora das regras." />
      ) : (
        <div className="space-y-6">
          {([1, 2, 3] as AlertLevel[]).map((level) => {
            const list = others.filter((a) => a.level === level);
            const showMissing = level === 2 && missingPlans.length > 0;
            if (!list.length && !showMissing) return null;
            return (
              <section key={level}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-slate-200">{LEVELS[level].title}</h2>
                  <span className="text-xs text-slate-500">{LEVELS[level].subtitle}</span>
                </div>
                <div className="space-y-2">
                  {list.map((a, i) => (
                    <Card key={`${a.ticker}-${a.kind}-${i}`} className={`py-3 ${LEVELS[level].border}`}>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-semibold text-slate-100 w-28">{a.ticker}</span>
                        <span className="text-sm text-slate-200">{a.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 sm:pl-31">{a.detail}</p>
                    </Card>
                  ))}
                  {showMissing && (
                    <Card className={`py-3 ${LEVELS[2].border}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm text-slate-200">
                          {missingPlans.length} posições sem plano escrito
                        </span>
                        <Link href="/fichas" className="text-xs text-emerald-400 hover:underline">
                          Preencher fichas →
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{missingPlans.map((a) => a.ticker).join(", ")}</p>
                    </Card>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
