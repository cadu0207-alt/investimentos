import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBrapiQuote, sleep } from "@/lib/marketData/brapi";

export const maxDuration = 60;

interface UpdateResult {
  ticker: string;
  ok: boolean;
  price?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  // Plano gratuito da brapi não cobre opções — atualiza só ações/FIIs autogeridos e administrados.
  const { data: positions, error } = await supabase
    .from("invest_positions")
    .select("ticker");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const tickers = Array.from(new Set((positions ?? []).map((p) => p.ticker)));
  const results: UpdateResult[] = [];

  for (const ticker of tickers) {
    try {
      const quote = await fetchBrapiQuote(ticker);

      if (!quote || quote.price === null) {
        results.push({ ticker, ok: false, error: "sem cotação retornada pela brapi" });
      } else {
        const { error: updateError } = await supabase
          .from("invest_positions")
          .update({ current_price: quote.price, updated_at: new Date().toISOString() })
          .eq("ticker", ticker);

        results.push(
          updateError
            ? { ticker, ok: false, error: updateError.message }
            : { ticker, ok: true, price: quote.price }
        );
      }
    } catch (err) {
      results.push({
        ticker,
        ok: false,
        error: err instanceof Error ? err.message : "erro desconhecido",
      });
    }

    // Pequeno intervalo entre chamadas pra não estourar rate limit da brapi.
    await sleep(250);
  }

  const updated = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: true,
    updated,
    total: tickers.length,
    results,
  });
}
