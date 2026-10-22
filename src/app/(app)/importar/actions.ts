"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSnapshot, SNAPSHOT_DATE, SECTOR_LABEL } from "@/lib/fase0/snapshot";
import { recomputePositions, type Baseline, type TradeRow } from "@/lib/positions/recompute";

const HISTORY_DIR = path.join(process.cwd(), "docs", "fase0", "historico-2026");

async function readCsv(file: string) {
  const text = await readFile(path.join(HISTORY_DIR, file), "utf8");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  // os CSVs gerados pelo script não têm vírgulas dentro dos campos, exceto "obs" (última coluna)
  return lines.map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    cols.forEach((c, i) => (row[c] = i === cols.length - 1 ? cells.slice(i).join(",") : cells[i]));
    return row;
  });
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

const fail = (message: string): never => redirect(`/importar?error=${encodeURIComponent(message)}`);

/** Importa operações e resultados das notas processadas por scripts/historico_notas.py. Pode rodar de novo sem duplicar. */
export async function importNotes() {
  const { supabase, user } = await requireUser();

  const seen = new Map<string, number>();
  const trades = (await readCsv("operacoes.csv")).map((r) => {
    const base = [r.nota, r.mercado, r.cv, r.ativo, r.qtd, r.preco].join("|");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      user_id: user.id,
      trade_date: r.data,
      instrument: r.ativo,
      side: r.cv === "C" ? "compra" : "venda",
      quantity: Number(r.qtd),
      price: Number(r.preco),
      market: r.mercado,
      broker_note: r.nota,
      day_trade: r.day_trade === "1",
      option_expiry: r.prazo || null,
      source: "nota",
      import_key: `${base}#${n}`,
    };
  });

  const realizedByKey = new Map<string, { date: string; instrument: string; cls: string; strategy: string; obs: string; result: number }>();
  for (const r of await readCsv("realizados.csv")) {
    // venda de posição comprada antes de 2026: é valor de venda, não resultado (o custo não está nas notas)
    if (r.estrategia === "sem_base") continue;
    const key = [r.data, r.ativo, r.classe, r.estrategia, r.obs].join("|");
    const cur = realizedByKey.get(key) ?? { date: r.data, instrument: r.ativo, cls: r.classe, strategy: r.estrategia, obs: r.obs, result: 0 };
    cur.result += Number(r.resultado);
    realizedByKey.set(key, cur);
  }
  for (const m of await readCsv("mensal.csv")) {
    const [y, mo] = m.mes.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
    realizedByKey.set(`${m.mes}|CUSTOS`, { date: lastDay, instrument: "CUSTOS", cls: "custo", strategy: "custos", obs: "corretagem, taxas e ISS do mês", result: Number(m.custos) });
  }
  const realized = [...realizedByKey.entries()].map(([key, r]) => ({
    user_id: user.id,
    realized_date: r.date,
    instrument: r.instrument,
    asset_class: r.cls,
    strategy: r.strategy,
    result: Math.round(r.result * 100) / 100,
    notes: r.obs || null,
    import_key: key,
  }));

  const t = await supabase.from("invest_trades").upsert(trades, { onConflict: "user_id,import_key", ignoreDuplicates: true });
  if (t.error) fail(`Operações: ${t.error.message}`);
  const r = await supabase.from("invest_realized").upsert(realized, { onConflict: "user_id,import_key" });
  if (r.error) fail(`Resultados: ${r.error.message}`);

  revalidatePath("/importar");
  redirect(`/importar?ok=${encodeURIComponent(`${trades.length} operações e ${realized.length} resultados conferidos no banco.`)}`);
}

/** Grava a foto da Necton como saldo inicial e recalcula posições = saldo inicial + operações depois dela. */
export async function rebuildPositions() {
  const { supabase, user } = await requireUser();

  // 1. Saldo inicial a partir do snapshot da Necton
  const rows = await getSnapshot();
  const baselineRows = rows.map((r) => ({
    user_id: user.id,
    as_of: SNAPSHOT_DATE,
    ticker: r.ticker,
    kind: r.kind,
    side: r.side,
    quantity: r.quantity,
    avg_price: r.avgPrice,
    avg_price_with_dividends: r.avgPriceWithDividends || null,
    current_price: r.currentPrice,
    dividends: r.dividends || null,
    blocked_quantity: r.blockedQuantity || null,
    sector: r.sector,
    underlying: r.option?.underlying ?? null,
    strike: r.option?.strike ?? null,
    expiry: r.option?.expiry ?? null,
    underlying_price: r.option?.underlyingPrice ?? null,
  }));
  const b = await supabase.from("invest_position_baselines").upsert(baselineRows, { onConflict: "user_id,as_of,ticker" });
  if (b.error) fail(`Saldo inicial: ${b.error.message}`);

  // 2. Saldo inicial mais recente + operações depois dele
  const { data: latest } = await supabase.from("invest_position_baselines").select("as_of").order("as_of", { ascending: false }).limit(1);
  const asOf = latest?.[0]?.as_of ?? SNAPSHOT_DATE;
  const [{ data: baselines }, { data: trades }, { data: oldPositions }] = await Promise.all([
    supabase.from("invest_position_baselines").select("*").eq("as_of", asOf),
    supabase
      .from("invest_trades")
      .select("trade_date,instrument,side,quantity,price,market,option_expiry")
      .gt("trade_date", asOf)
      .eq("day_trade", false),
    supabase.from("invest_positions").select("ticker,current_price,updated_at"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const positions = recomputePositions((baselines ?? []) as Baseline[], (trades ?? []) as TradeRow[], today);

  // preço atualizado pelo cron (brapi) vale mais que o preço da foto, se for mais recente
  const freshPrice = new Map(
    (oldPositions ?? []).filter((p) => p.current_price && p.updated_at.slice(0, 10) > asOf).map((p) => [p.ticker, Number(p.current_price)])
  );

  const stocks = positions.filter((p) => !p.kind.startsWith("opcao"));
  const options = positions.filter((p) => p.kind.startsWith("opcao"));

  // 3. Cadastro de ativos (exigido pela chave estrangeira de invest_positions)
  const assets = [...stocks.map((p) => ({ ticker: p.ticker, cls: p.kind, sector: p.sector })), ...options.map((o) => ({ ticker: o.underlying!, cls: "acao", sector: null }))]
    .filter((a) => a.ticker)
    .map((a) => ({ ticker: a.ticker, asset_class: a.cls === "fii" ? "fii" : "acao", sector: a.sector ? (SECTOR_LABEL[a.sector] ?? a.sector) : null }));
  const uniqueAssets = [...new Map(assets.map((a) => [a.ticker, a])).values()];
  const a = await supabase.from("invest_assets").upsert(uniqueAssets, { onConflict: "ticker" });
  if (a.error) fail(`Ativos: ${a.error.message}`);

  // 4. Substitui as posições calculadas (a versão antiga, de 10/09, tem backup fora do repositório)
  const delPos = await supabase.from("invest_positions").delete().eq("user_id", user.id);
  if (delPos.error) fail(`Posições: ${delPos.error.message}`);
  const insPos = await supabase.from("invest_positions").insert(
    stocks.map((p) => ({
      user_id: user.id,
      ticker: p.ticker,
      quantity: p.quantity,
      avg_price: Math.round(p.avg_price * 10000) / 10000,
      current_price: freshPrice.get(p.ticker) ?? p.current_price,
      broker: "Necton",
      avg_price_with_dividends: p.avg_price_with_dividends,
      dividends: p.dividends,
      blocked_quantity: p.blocked_quantity,
      source: `saldo ${asOf} + notas`,
    }))
  );
  if (insPos.error) fail(`Posições: ${insPos.error.message}`);

  const delOpt = await supabase.from("invest_option_positions").delete().eq("user_id", user.id);
  if (delOpt.error) fail(`Opções: ${delOpt.error.message}`);
  const insOpt = await supabase.from("invest_option_positions").insert(
    options.map((o) => {
      const type = o.kind === "opcao_put" ? "put" : "call";
      return {
        user_id: user.id,
        option_code: o.ticker,
        underlying: o.underlying,
        option_type: type,
        strategy_leg: `${o.side === "venda" ? "venda" : "compra"}_${type}`,
        strategy_group: o.underlying,
        strike: o.strike,
        expiry: o.expiry,
        quantity: o.quantity,
        avg_price: Math.round(o.avg_price * 10000) / 10000,
        current_price: o.current_price,
        underlying_price: o.underlying_price,
        status: "aberta",
        source: `saldo ${asOf} + notas`,
      };
    })
  );
  if (insOpt.error) fail(`Opções: ${insOpt.error.message}`);

  for (const p of ["/importar", "/dashboard", "/posicoes", "/opcoes", "/alocacao"]) revalidatePath(p);
  redirect(
    `/importar?ok=${encodeURIComponent(
      `Posições recalculadas: ${stocks.length} ações/FII e ${options.length} opções (saldo de ${asOf} + ${trades?.length ?? 0} operações depois dele).`
    )}`
  );
}
