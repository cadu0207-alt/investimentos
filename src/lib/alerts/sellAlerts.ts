import type { InvestPositionPlan } from "@/lib/domain/types";
import { formatDate, formatNumber } from "@/lib/domain/format";
import { isPlanComplete } from "@/lib/domain/plans";
import type { AccountSnapshot, SnapshotRow } from "@/lib/fase0/snapshot";
import { DEFAULT_LIMITS, type Limits } from "./limits";

/** Limite legal de vendas de ações no mês com ganho isento de IR (swing trade). */
const MONTHLY_EXEMPT_SALES = 20_000;

export type AlertLevel = 1 | 2 | 3;

export interface SellAlert {
  level: AlertLevel;
  ticker: string;
  kind: string;
  title: string;
  detail: string;
}

export interface SellAlertInput {
  rows: SnapshotRow[];
  account: AccountSnapshot;
  plans: InvestPositionPlan[];
  monthStockSales: number;
  /** Mês a que monthStockSales se refere, ex.: "out/2026". */
  salesMonthLabel: string;
  today: Date;
  limits?: Limits;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const daysUntil = (iso: string, today: Date) =>
  Math.ceil((new Date(`${iso}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000);

export function computeSellAlerts({ rows, account, plans, monthStockSales, salesMonthLabel, today, limits = DEFAULT_LIMITS }: SellAlertInput) {
  const alerts: SellAlert[] = [];
  const planByTicker = new Map(plans.map((p) => [p.ticker, p]));
  const stocks = rows.filter((r) => !r.option);
  const stocksValue = stocks.reduce((acc, r) => acc + r.positionValue, 0);
  const cash = account.saldo_disponivel;

  // ---------------- Nível 1: risco com prazo
  for (const r of rows) {
    if (!r.option || r.side !== "venda") continue;
    const { strike, underlyingPrice, businessDays, expiry, underlying } = r.option;
    const isPut = r.kind === "opcao_put";
    const itm = isPut ? underlyingPrice < strike : underlyingPrice > strike;
    if (itm && businessDays <= limits.nearExpiryBusinessDays) {
      alerts.push({
        level: 1,
        ticker: r.ticker,
        kind: "vendida_itm",
        title: `${isPut ? "Put" : "Call"} vendida dentro do dinheiro a ${businessDays} dias úteis do vencimento`,
        detail: `${underlying} a ${formatNumber(underlyingPrice)} contra strike ${formatNumber(strike)}; vence ${formatDate(expiry)}. Recomprar hoje: ${brl(
          r.quantity * r.currentPrice
        )}.`,
      });
    }
    if (isPut) {
      const notional = r.quantity * strike;
      if (notional > cash) {
        alerts.push({
          level: 1,
          ticker: r.ticker,
          kind: "exercicio_sem_caixa",
          title: "Exercício que o caixa não cobre",
          detail: `Pagar ${brl(notional)} com ${brl(cash)} de caixa livre: faltam ${brl(
            notional - cash
          )}, que viriam de crédito (Invest Flex) ou venda de ações.`,
        });
      }
    }
  }
  if (cash < 0) {
    alerts.push({
      level: 1,
      ticker: "CONTA",
      kind: "credito_em_uso",
      title: "Crédito em uso",
      detail: `Saldo negativo de ${brl(cash)}: há juros correndo.`,
    });
  }

  // ---------------- Nível 2: regra quebrada
  for (const r of rows) {
    const plan = planByTicker.get(r.ticker);
    const shortOption = !!r.option && r.side === "venda";
    if (plan?.stop_price != null) {
      // posição comprada: preço caiu até o stop; opção vendida: prêmio subiu até o stop
      const hit = shortOption ? r.currentPrice >= plan.stop_price : r.currentPrice <= plan.stop_price;
      if (hit) {
        alerts.push({
          level: 2,
          ticker: r.ticker,
          kind: "stop",
          title: "Stop da ficha atingido",
          detail: `Preço ${formatNumber(r.currentPrice)} contra stop ${formatNumber(plan.stop_price)}.`,
        });
      }
    }
    if (plan?.deadline) {
      const days = daysUntil(plan.deadline, today);
      if (days <= limits.deadlineWarningDays) {
        alerts.push({
          level: 2,
          ticker: r.ticker,
          kind: "prazo",
          title: days < 0 ? "Prazo da ficha vencido" : `Prazo da ficha em ${days} dia(s)`,
          detail: `Prazo ${formatDate(plan.deadline)}; ação planejada: ${plan.action}.`,
        });
      }
    }
    if (!isPlanComplete(plan)) {
      alerts.push({
        level: 2,
        ticker: r.ticker,
        kind: "sem_ficha",
        title: "Sem plano escrito",
        detail: "Ficha incompleta: falta ação, tese, gatilho de preço ou prazo.",
      });
    }
  }

  for (const r of stocks) {
    const share = (r.positionValue / stocksValue) * 100;
    if (share > limits.maxAssetPct) {
      alerts.push({
        level: 2,
        ticker: r.ticker,
        kind: "concentracao_ativo",
        title: `Ativo acima de ${limits.maxAssetPct}% da carteira`,
        detail: `${pct(share)} (${brl(r.positionValue)}). Voltar ao limite exige vender ~${brl(
          r.positionValue - (limits.maxAssetPct / 100) * stocksValue
        )}.`,
      });
    }
  }
  const bySector = new Map<string, number>();
  for (const r of stocks) bySector.set(r.sector, (bySector.get(r.sector) ?? 0) + r.positionValue);
  for (const [sector, value] of bySector) {
    const share = (value / stocksValue) * 100;
    if (share > limits.maxSectorPct) {
      alerts.push({
        level: 2,
        ticker: sector.toUpperCase(),
        kind: "concentracao_setor",
        title: `Setor acima de ${limits.maxSectorPct}% da carteira`,
        detail: `${pct(share)} (${brl(value)}): ${stocks
          .filter((s) => s.sector === sector)
          .map((s) => s.ticker)
          .join(", ")}.`,
      });
    }
  }

  // ---------------- Nível 3: oportunidade de realizar
  for (const r of rows) {
    const plan = planByTicker.get(r.ticker);
    const shortOption = !!r.option && r.side === "venda";
    if (plan?.exit_price != null) {
      const hit = shortOption ? r.currentPrice <= plan.exit_price : r.currentPrice >= plan.exit_price;
      if (hit) {
        alerts.push({
          level: 3,
          ticker: r.ticker,
          kind: "alvo",
          title: "Alvo da ficha atingido",
          detail: `Preço ${formatNumber(r.currentPrice)} contra alvo ${formatNumber(plan.exit_price)}.`,
        });
      }
    }
    if (r.option && r.side === "compra") {
      const left = (r.positionValue / r.invested) * 100;
      if (left < limits.almostWorthlessPct && r.option.businessDays <= limits.nearExpiryBusinessDays) {
        alerts.push({
          level: 3,
          ticker: r.ticker,
          kind: "quase_po",
          title: "Opção comprada quase sem valor perto do vencimento",
          detail: `Vale ${brl(r.positionValue)} (${pct(left)} do investido de ${brl(r.invested)}); ${r.option.businessDays} dias úteis.`,
        });
      }
    }
  }

  const exemptRoom = MONTHLY_EXEMPT_SALES - monthStockSales;
  const gains = stocks.filter((s) => s.kind === "acao" && s.openResult > 0);
  if (exemptRoom > 0 && gains.length) {
    alerts.push({
      level: 3,
      ticker: "IR",
      kind: "janela_fiscal",
      title: "Janela de isenção do mês",
      detail: `Vendas de ações em ${salesMonthLabel}: ${brl(monthStockSales)}. Ainda cabem ${brl(
        exemptRoom
      )} em vendas com ganho isento. Ações com ganho em aberto: ${gains
        .sort((a, b) => b.openResult - a.openResult)
        .slice(0, 5)
        .map((g) => `${g.ticker} (+${brl(g.openResult)})`)
        .join(", ")}.`,
    });
  }

  return alerts.sort((a, b) => a.level - b.level);
}
