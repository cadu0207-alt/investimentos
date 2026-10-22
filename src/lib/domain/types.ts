export type AssetClass = "acao" | "fii" | "etf" | "cripto" | "indice" | "outro";

export interface InvestAsset {
  id: string;
  ticker: string;
  name: string | null;
  asset_class: AssetClass;
  sector: string | null;
  created_at: string;
}

export interface InvestPosition {
  id: string;
  user_id: string;
  ticker: string;
  quantity: number;
  avg_price: number;
  current_price: number | null;
  broker: string | null;
  managed_portfolio_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface InvestManagedPortfolio {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  description: string | null;
  reinvest_dividends: boolean;
  min_initial_investment: number | null;
  min_balance: number | null;
  min_movement: number | null;
  benchmark_name: string | null;
  benchmark_accum_pct: number | null;
  portfolio_accum_pct: number | null;
  period_return_pct: number | null;
  period_benchmark_pct: number | null;
  account_balance: number | null;
  account_return_pct: number | null;
  reference_month: string | null;
  updated_at: string;
  created_at: string;
}

export type OptionType = "call" | "put";
export type StrategyLeg = "venda_put" | "compra_call" | "venda_call" | "compra_put";
export type OptionStatus = "aberta" | "fechada" | "rolada";

export interface InvestOptionPosition {
  id: string;
  user_id: string;
  option_code: string;
  underlying: string;
  option_type: OptionType | null;
  strategy_leg: StrategyLeg | null;
  strategy_group: string | null;
  strike: number | null;
  expiry: string | null;
  quantity: number;
  avg_price: number;
  current_price: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  iv: number | null;
  status: OptionStatus;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export type TradeSide = "compra" | "venda";

export interface InvestTrade {
  id: string;
  user_id: string;
  trade_date: string;
  instrument: string;
  side: TradeSide | null;
  quantity: number;
  price: number;
  fees: number | null;
  notes: string | null;
  created_at: string;
}

export type RobotName = "Skyfall" | "Sniper" | "The Stairway";
export type SignalType = "compra" | "venda" | "fechamento";

export interface InvestRobotSignal {
  id: string;
  user_id: string;
  robot_name: RobotName | null;
  asset: string;
  signal_type: SignalType | null;
  signal_time: string;
  price: number | null;
  quantity: number | null;
  pnl: number | null;
  notes: string | null;
  created_at: string;
}

export interface InvestPortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  ibov_index: number | null;
  cdi_accum_pct: number | null;
  notes: string | null;
  created_at: string;
}

export interface InvestStrategyNote {
  id: string;
  user_id: string;
  note_date: string;
  title: string | null;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export type PlanAction =
  | "a_definir"
  | "manter"
  | "reduzir"
  | "encerrar"
  | "rolar"
  | "aceitar_exercicio"
  | "call_coberta";

export interface InvestPositionPlan {
  id: string;
  user_id: string;
  ticker: string;
  thesis: string | null;
  action: PlanAction;
  exit_price: number | null;
  stop_price: number | null;
  review_trigger: string | null;
  deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
