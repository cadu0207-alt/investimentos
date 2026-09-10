/**
 * Integração com o plano gratuito da brapi.dev.
 * Limites do free tier: 15.000 requisições/mês, 1 ticker por requisição,
 * delay de ~30min, sem dados de opções e sem dividendos.
 * https://brapi.dev/docs
 */

export interface BrapiQuote {
  ticker: string;
  price: number | null;
  updatedAt: string | null;
}

const BRAPI_BASE_URL = "https://brapi.dev/api/quote";

export async function fetchBrapiQuote(ticker: string): Promise<BrapiQuote | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) {
    throw new Error("BRAPI_TOKEN não configurado nas variáveis de ambiente.");
  }

  const url = `${BRAPI_BASE_URL}/${encodeURIComponent(ticker)}?token=${token}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const result = data?.results?.[0];

  if (!result || typeof result.regularMarketPrice !== "number") {
    return null;
  }

  return {
    ticker,
    price: result.regularMarketPrice,
    updatedAt: result.regularMarketTime ?? null,
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
