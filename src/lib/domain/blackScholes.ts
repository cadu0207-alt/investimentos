// Modelo de Black-Scholes para cálculo de Greeks de opções europeias.
// Uso educacional/analítico — opções brasileiras (B3) costumam ser americanas,
// mas Black-Scholes é uma aproximação padrão amplamente usada para estimar os Greeks.

function erf(x: number): number {
  // Aproximação numérica (Abramowitz & Stegun 7.1.26)
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function cdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface GreeksInput {
  spot: number; // preço do ativo-objeto
  strike: number; // preço de exercício
  daysToExpiry: number; // dias corridos até o vencimento
  volatility: number; // volatilidade implícita anualizada, em decimal (ex: 0.35 para 35%)
  riskFreeRate: number; // taxa livre de risco anualizada, em decimal (ex: 0.13 para 13% ~ Selic)
  optionType: "call" | "put";
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number; // por dia (corrido)
  vega: number; // por 1 ponto percentual de vol
  price: number; // preço teórico
}

export function calculateGreeks({
  spot,
  strike,
  daysToExpiry,
  volatility,
  riskFreeRate,
  optionType,
}: GreeksInput): Greeks | null {
  if (spot <= 0 || strike <= 0 || daysToExpiry <= 0 || volatility <= 0) {
    return null;
  }

  const t = daysToExpiry / 365;
  const sqrtT = Math.sqrt(t);
  const d1 =
    (Math.log(spot / strike) + (riskFreeRate + (volatility * volatility) / 2) * t) /
    (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;

  const isCall = optionType === "call";

  const delta = isCall ? cdf(d1) : cdf(d1) - 1;
  const gamma = pdf(d1) / (spot * volatility * sqrtT);
  const vega = (spot * pdf(d1) * sqrtT) / 100; // por 1pp de vol

  const term1 = -(spot * pdf(d1) * volatility) / (2 * sqrtT);
  const thetaAnnual = isCall
    ? term1 - riskFreeRate * strike * Math.exp(-riskFreeRate * t) * cdf(d2)
    : term1 + riskFreeRate * strike * Math.exp(-riskFreeRate * t) * cdf(-d2);
  const theta = thetaAnnual / 365;

  const price = isCall
    ? spot * cdf(d1) - strike * Math.exp(-riskFreeRate * t) * cdf(d2)
    : strike * Math.exp(-riskFreeRate * t) * cdf(-d2) - spot * cdf(-d1);

  return { delta, gamma, theta, vega, price };
}
