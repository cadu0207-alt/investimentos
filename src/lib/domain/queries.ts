import { createClient } from "@/lib/supabase/server";
import { limitsFromRow, type Limits } from "@/lib/alerts/limits";
import type {
  InvestAsset,
  InvestManagedPortfolio,
  InvestOptionPosition,
  InvestPortfolioSnapshot,
  InvestPosition,
  InvestPositionPlan,
  InvestRobotSignal,
  InvestStrategyNote,
  InvestTrade,
} from "./types";

export async function getPositions(): Promise<InvestPosition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_positions")
    .select("*")
    .order("ticker", { ascending: true });
  return (data as InvestPosition[]) ?? [];
}

export async function getManagedPortfolios(): Promise<InvestManagedPortfolio[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invest_managed_portfolios").select("*").order("name");
  return (data as InvestManagedPortfolio[]) ?? [];
}

export async function getAssets(): Promise<InvestAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invest_assets").select("*").order("ticker");
  return (data as InvestAsset[]) ?? [];
}

export async function getOptionPositions(): Promise<InvestOptionPosition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_option_positions")
    .select("*")
    .order("status", { ascending: true })
    .order("expiry", { ascending: true });
  return (data as InvestOptionPosition[]) ?? [];
}

export async function getTrades(): Promise<InvestTrade[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_trades")
    .select("*")
    .order("trade_date", { ascending: false })
    .limit(200);
  return (data as InvestTrade[]) ?? [];
}

export async function getRobotSignals(): Promise<InvestRobotSignal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_robot_signals")
    .select("*")
    .order("signal_time", { ascending: false })
    .limit(300);
  return (data as InvestRobotSignal[]) ?? [];
}

export async function getSnapshots(): Promise<InvestPortfolioSnapshot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_portfolio_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true });
  return (data as InvestPortfolioSnapshot[]) ?? [];
}

export async function getStrategyNotes(): Promise<InvestStrategyNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invest_strategy_notes")
    .select("*")
    .order("note_date", { ascending: false });
  return (data as InvestStrategyNote[]) ?? [];
}

export async function getPositionPlans(): Promise<InvestPositionPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invest_position_plans").select("*").order("ticker");
  return (data as InvestPositionPlan[]) ?? [];
}

export async function getLimits(): Promise<Limits> {
  const supabase = await createClient();
  const { data } = await supabase.from("invest_limits").select("*").maybeSingle();
  return limitsFromRow(data);
}
