import { formatNumber } from "@/lib/domain/format";
import type { AccountSnapshot, SnapshotRow } from "@/lib/fase0/snapshot";
import type { Limits } from "./limits";

export type BuyKind = "acao" | "compra_call" | "compra_put" | "venda_put";

export interface BuyOrder {
  kind: BuyKind;
  ticker: string;
  sector: string;
  quantity: number;
  price: number; // preço da ação ou prêmio da opção
  stop: number | null; // na opção: preço do prêmio
  target: number | null;
  strike: number | null; // obrigatório para venda de put
  thesis: string;
}

export type CheckStatus = "ok" | "falha" | "aviso";

export interface Check {
  rule: string;
  status: CheckStatus;
  detail: string;
}

interface Context {
  rows: SnapshotRow[];
  account: AccountSnapshot;
  limits: Limits;
  monthOptionPremium: number;
  monthLabel: string;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function runBuyChecklist(order: BuyOrder, { rows, account, limits, monthOptionPremium, monthLabel }: Context) {
  const checks: Check[] = [];
  const cash = account.saldo_disponivel;
  const stocks = rows.filter((r) => !r.option);
  const stocksValue = stocks.reduce((acc, r) => acc + r.positionValue, 0);
  const equity = rows.reduce((acc, r) => acc + r.positionValue, 0) + cash;
  const isOptionBuy = order.kind === "compra_call" || order.kind === "compra_put";
  const isShortPut = order.kind === "venda_put";
  const orderValue = order.quantity * order.price;

  // Caixa que já está comprometido com puts vendidas abertas (exercício possível)
  const committed = rows
    .filter((r) => r.kind === "opcao_put" && r.side === "venda" && r.option)
    .reduce((acc, r) => acc + r.quantity * r.option!.strike, 0);

  // 1. Caixa próprio, sem crédito
  if (isShortPut) {
    const notional = order.quantity * (order.strike ?? 0);
    const free = cash - committed;
    if (!limits.shortPutsNeedCash) {
      checks.push({ rule: "Caixa reservado para o exercício", status: "aviso", detail: "Regra desligada em Limites de risco." });
    } else {
      checks.push({
        rule: "Caixa reservado para o exercício",
        status: notional <= free ? "ok" : "falha",
        detail: `Exercício custaria ${brl(notional)}. Caixa livre ${brl(cash)} menos ${brl(committed)} já comprometidos com puts vendidas = ${brl(
          free
        )}.`,
      });
    }
  } else {
    checks.push({
      rule: "Caixa próprio (sem crédito)",
      status: orderValue <= cash ? "ok" : "falha",
      detail: `Ordem de ${brl(orderValue)} contra ${brl(cash)} de saldo livre${
        orderValue > cash ? `: faltam ${brl(orderValue - cash)}` : ""
      }. Invest Flex é empréstimo e não conta.`,
    });
  }

  // 2 e 3. Concentração (ação comprada, ou ação recebida se a put for exercida)
  const addedStockValue = order.kind === "acao" ? orderValue : isShortPut ? order.quantity * (order.strike ?? 0) : 0;
  if (addedStockValue > 0) {
    const label = isShortPut ? " (se exercida)" : "";
    const current = stocks.filter((r) => r.ticker === order.ticker).reduce((acc, r) => acc + r.positionValue, 0);
    const newTotal = stocksValue + addedStockValue;
    const assetPct = ((current + addedStockValue) / newTotal) * 100;
    checks.push({
      rule: `Concentração no ativo${label}`,
      status: assetPct <= limits.maxAssetPct ? "ok" : "falha",
      detail: `${order.ticker} ficaria com ${pct(assetPct)} das ações + FII (limite ${limits.maxAssetPct}%).`,
    });
    const sectorNow = stocks.filter((r) => r.sector === order.sector).reduce((acc, r) => acc + r.positionValue, 0);
    const sectorPct = ((sectorNow + addedStockValue) / newTotal) * 100;
    checks.push({
      rule: `Concentração no setor${label}`,
      status: sectorPct <= limits.maxSectorPct ? "ok" : "falha",
      detail: `O setor ficaria com ${pct(sectorPct)} (limite ${limits.maxSectorPct}%).`,
    });
  }

  // 4. Plano escrito antes da ordem
  const missing = [!order.thesis.trim() && "tese", order.stop === null && "stop", order.target === null && "alvo"].filter(Boolean);
  checks.push({
    rule: "Plano escrito antes da ordem",
    status: missing.length ? "falha" : "ok",
    detail: missing.length ? `Falta: ${missing.join(", ")}.` : "Tese, stop e alvo definidos.",
  });

  // 5. Risco até o stop
  const maxRisk = (limits.maxRiskPerTradePct / 100) * equity;
  let risk: number | null = null;
  let stopProblem = "";
  if (order.stop !== null) {
    if (isShortPut) {
      if (order.stop <= order.price) stopProblem = "Na put vendida o stop é o prêmio subir: precisa ser maior que o prêmio de venda.";
      else risk = order.quantity * (order.stop - order.price);
    } else if (order.stop >= order.price) {
      stopProblem = "O stop precisa ficar abaixo do preço de entrada.";
    } else {
      risk = order.quantity * (order.price - order.stop);
    }
  } else if (isOptionBuy) {
    risk = orderValue; // sem stop, o risco é o prêmio inteiro
  }
  checks.push({
    rule: "Risco até o stop",
    status: stopProblem || risk === null ? "falha" : risk <= maxRisk ? "ok" : "falha",
    detail: stopProblem
      ? stopProblem
      : risk === null
        ? "Sem stop não dá para medir o risco."
        : `${order.stop === null ? "Sem stop, o risco é o prêmio inteiro" : "Perda até o stop"}: ${brl(risk)} (${((risk / equity) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% do patrimônio de ${brl(equity)}; limite ${
            limits.maxRiskPerTradePct
          }% = ${brl(maxRisk)}).`,
  });

  // 6. Orçamento mensal para comprar opções
  if (isOptionBuy) {
    const budget = (limits.monthlyOptionPremiumPct / 100) * equity;
    const total = monthOptionPremium + orderValue;
    checks.push({
      rule: "Orçamento mensal de opções",
      status: total <= budget ? "ok" : "falha",
      detail: `Já pago em ${monthLabel}: ${brl(monthOptionPremium)} (inclui recompras). Com esta ordem: ${brl(total)}; orçamento ${
        limits.monthlyOptionPremiumPct
      }% = ${brl(budget)}.`,
    });
  }

  // 7. Relação ganho/risco (não elimina, só avisa)
  if (order.stop !== null && order.target !== null && !stopProblem) {
    const reward = isShortPut ? order.price - order.target : order.target - order.price;
    const perUnitRisk = isShortPut ? order.stop - order.price : order.price - order.stop;
    if (reward > 0 && perUnitRisk > 0) {
      const ratio = reward / perUnitRisk;
      checks.push({
        rule: "Ganho até o alvo × perda até o stop",
        status: ratio >= 2 ? "ok" : "aviso",
        detail: `${formatNumber(ratio, 1)} para 1: para empatar, precisa acertar ${pct(100 / (1 + ratio))} das vezes${
          ratio < 2 ? " (abaixo de 2 para 1)" : ""
        }.`,
      });
    }
  }

  const passed = checks.every((c) => c.status !== "falha");
  return { checks, passed, equity };
}
