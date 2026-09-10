"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchBrapiQuote, sleep } from "@/lib/marketData/brapi";

export async function upsertPosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const ticker = String(formData.get("ticker") ?? "").toUpperCase().trim();
  const assetClass = String(formData.get("asset_class") ?? "acao");
  const quantity = Number(formData.get("quantity"));
  const avgPrice = Number(formData.get("avg_price"));
  const currentPrice = formData.get("current_price") ? Number(formData.get("current_price")) : null;
  const broker = String(formData.get("broker") ?? "BTG");
  const id = formData.get("id") ? String(formData.get("id")) : null;

  if (!ticker || Number.isNaN(quantity) || Number.isNaN(avgPrice)) {
    throw new Error("Preencha ticker, quantidade e preço médio corretamente.");
  }

  // Garante que o ativo existe na tabela de referência
  await supabase
    .from("invest_assets")
    .upsert({ ticker, asset_class: assetClass }, { onConflict: "ticker", ignoreDuplicates: true });

  if (id) {
    await supabase
      .from("invest_positions")
      .update({
        ticker,
        quantity,
        avg_price: avgPrice,
        current_price: currentPrice,
        broker,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("invest_positions").insert({
      user_id: user.id,
      ticker,
      quantity,
      avg_price: avgPrice,
      current_price: currentPrice,
      broker,
    });
  }

  revalidatePath("/posicoes");
  revalidatePath("/dashboard");
  revalidatePath("/alocacao");
}

export async function refreshPrices() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: positions } = await supabase
    .from("invest_positions")
    .select("ticker")
    .eq("user_id", user.id);

  const tickers = Array.from(new Set((positions ?? []).map((p) => p.ticker)));
  let updated = 0;

  for (const ticker of tickers) {
    try {
      const quote = await fetchBrapiQuote(ticker);
      if (quote?.price != null) {
        const { error } = await supabase
          .from("invest_positions")
          .update({ current_price: quote.price, updated_at: new Date().toISOString() })
          .eq("ticker", ticker)
          .eq("user_id", user.id);
        if (!error) updated += 1;
      }
    } catch {
      // brapi falhou pra esse ticker — segue pro próximo
    }
    await sleep(200);
  }

  revalidatePath("/posicoes");
  revalidatePath("/dashboard");
  revalidatePath("/alocacao");
  redirect(`/posicoes?atualizados=${updated}&total=${tickers.length}`);
}

export async function deletePosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = String(formData.get("id"));
  await supabase.from("invest_positions").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/posicoes");
  revalidatePath("/dashboard");
  revalidatePath("/alocacao");
}
