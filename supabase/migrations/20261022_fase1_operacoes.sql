-- Fase 1: operações das notas, resultados realizados e saldo inicial das posições.
-- Posição atual = saldo inicial (Necton em as_of) + operações importadas depois de as_of.

-- Operações das notas de corretagem
alter table public.invest_trades
  add column if not exists market text,
  add column if not exists broker_note text,
  add column if not exists day_trade boolean not null default false,
  add column if not exists option_expiry text,
  add column if not exists source text not null default 'manual',
  add column if not exists import_key text;

create unique index if not exists invest_trades_user_import_key
  on public.invest_trades (user_id, import_key);

-- Resultados realizados (por dia, ativo e estratégia) e custos mensais
create table if not exists public.invest_realized (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  realized_date date not null,
  instrument text not null,
  asset_class text not null,
  strategy text not null,
  result numeric not null,
  notes text,
  import_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, import_key)
);
alter table public.invest_realized enable row level security;
create policy "owner access realized" on public.invest_realized
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Saldo inicial das posições (foto da corretora numa data)
create table if not exists public.invest_position_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  as_of date not null,
  ticker text not null,
  kind text not null check (kind in ('acao', 'fii', 'opcao_call', 'opcao_put')),
  side text not null check (side in ('compra', 'venda')),
  quantity numeric not null,
  avg_price numeric not null,
  avg_price_with_dividends numeric,
  current_price numeric,
  dividends numeric,
  blocked_quantity numeric,
  sector text,
  underlying text,
  strike numeric,
  expiry date,
  underlying_price numeric,
  created_at timestamptz not null default now(),
  unique (user_id, as_of, ticker)
);
alter table public.invest_position_baselines enable row level security;
create policy "owner access baselines" on public.invest_position_baselines
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Campos extras nas posições calculadas
alter table public.invest_positions
  add column if not exists avg_price_with_dividends numeric,
  add column if not exists dividends numeric,
  add column if not exists blocked_quantity numeric,
  add column if not exists source text;

alter table public.invest_option_positions
  add column if not exists underlying_price numeric,
  add column if not exists source text;
