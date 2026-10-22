-- Limites de risco ajustáveis (um registro por usuário). Valores nulos usam o padrão do app.
create table if not exists public.invest_limits (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  max_asset_pct numeric check (max_asset_pct > 0 and max_asset_pct <= 100),
  max_sector_pct numeric check (max_sector_pct > 0 and max_sector_pct <= 100),
  near_expiry_business_days integer check (near_expiry_business_days > 0),
  almost_worthless_pct numeric check (almost_worthless_pct > 0 and almost_worthless_pct <= 100),
  deadline_warning_days integer check (deadline_warning_days >= 0),
  max_risk_per_trade_pct numeric check (max_risk_per_trade_pct > 0 and max_risk_per_trade_pct <= 100),
  monthly_option_premium_pct numeric check (monthly_option_premium_pct >= 0 and monthly_option_premium_pct <= 100),
  short_puts_need_cash boolean,
  updated_at timestamptz not null default now()
);

alter table public.invest_limits enable row level security;

create policy "owner access limits" on public.invest_limits
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
