/**
 * Posição atual = saldo inicial (foto da corretora) + operações das notas depois dessa data.
 * Preço médio pelo custo médio ponderado, como a corretora e a Receita calculam.
 */

export interface Baseline {
  ticker: string;
  kind: "acao" | "fii" | "opcao_call" | "opcao_put";
  side: "compra" | "venda";
  quantity: number;
  avg_price: number;
  avg_price_with_dividends: number | null;
  current_price: number | null;
  dividends: number | null;
  blocked_quantity: number | null;
  sector: string | null;
  underlying: string | null;
  strike: number | null;
  expiry: string | null;
  underlying_price: number | null;
}

export interface TradeRow {
  trade_date: string;
  instrument: string;
  side: "compra" | "venda";
  quantity: number;
  price: number;
  market: string | null;
  /** Prazo da opção na nota, "mm/aa". */
  option_expiry: string | null;
}

export interface ComputedPosition extends Baseline {
  /** Quantidade com sinal: negativa = vendida (opções). */
  signedQuantity: number;
}

const isOptionMarket = (m: string | null) => !!m && m.startsWith("OPCAO");

/** Vencimento padrão de opções na B3: terceira sexta-feira do mês. */
function expiryFromPrazo(prazo: string | null) {
  const m = prazo?.match(/^(\d\d)\/(\d\d)$/);
  if (!m) return null;
  const first = new Date(Date.UTC(2000 + Number(m[2]), Number(m[1]) - 1, 1));
  const day = 1 + ((5 - first.getUTCDay() + 7) % 7) + 14;
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)).toISOString().slice(0, 10);
}

export function recomputePositions(baselines: Baseline[], trades: TradeRow[], today: string): ComputedPosition[] {
  const book = new Map<string, ComputedPosition>();
  for (const b of baselines) {
    book.set(b.ticker, { ...b, signedQuantity: b.side === "venda" ? -b.quantity : b.quantity });
  }

  const underlyingOf = (code: string) =>
    baselines.find((b) => b.underlying && b.ticker.startsWith(code.slice(0, 4)))?.underlying ??
    [...book.keys()].find((t) => t.startsWith(code.slice(0, 4)) && !/^[A-Z]{5}\d/.test(t)) ??
    `${code.slice(0, 4)}3`;

  const apply = (ticker: string, side: "compra" | "venda", qty: number, price: number, template: Partial<Baseline>) => {
    const pos =
      book.get(ticker) ??
      ({
        ticker,
        kind: template.kind ?? "acao",
        side,
        quantity: 0,
        avg_price: 0,
        avg_price_with_dividends: null,
        current_price: price,
        dividends: null,
        blocked_quantity: null,
        sector: null,
        underlying: template.underlying ?? null,
        strike: null,
        expiry: template.expiry ?? null,
        underlying_price: null,
        signedQuantity: 0,
      } satisfies ComputedPosition);
    const delta = side === "compra" ? qty : -qty;
    const q = pos.signedQuantity;
    if (q === 0 || Math.sign(q) === Math.sign(delta)) {
      // aumenta a posição: novo custo médio
      const total = Math.abs(q) * pos.avg_price + qty * price;
      pos.signedQuantity = q + delta;
      pos.avg_price = total / Math.abs(pos.signedQuantity);
      pos.avg_price_with_dividends = null; // deixa de valer depois de nova compra
    } else {
      // reduz ou inverte: preço médio não muda na parte que fecha
      const next = q + delta;
      if (Math.sign(next) !== Math.sign(q) && next !== 0) pos.avg_price = price;
      pos.signedQuantity = next;
    }
    pos.side = pos.signedQuantity < 0 ? "venda" : "compra";
    pos.quantity = Math.abs(pos.signedQuantity);
    pos.current_price = price;
    book.set(ticker, pos);
  };

  for (const t of [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date))) {
    if (t.market?.startsWith("EXERC")) {
      // exercício: encerra a opção e movimenta a ação no strike
      const code = t.instrument.replace(/E$/, "");
      const opt = book.get(code);
      if (opt) book.delete(code);
      apply(opt?.underlying ?? underlyingOf(code), t.side, t.quantity, t.price, { kind: "acao" });
      continue;
    }
    const option = isOptionMarket(t.market);
    apply(t.instrument, t.side, t.quantity, t.price, {
      kind: option ? (t.market!.includes("VENDA") ? "opcao_put" : "opcao_call") : t.instrument.endsWith("11") ? "fii" : "acao",
      underlying: option ? underlyingOf(t.instrument) : null,
      expiry: option ? expiryFromPrazo(t.option_expiry) : null,
    });
  }

  // opções vencidas sem negociação de saída deixam de existir (viraram pó ou foram exercidas)
  return [...book.values()].filter((p) => p.quantity > 0 && !(p.expiry && p.kind.startsWith("opcao") && p.expiry < today));
}
