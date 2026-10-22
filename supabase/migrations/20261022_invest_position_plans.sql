-- Fichas de posição (Fase 0): tese, ação, gatilhos e prazo de cada ativo da carteira.
create table if not exists public.invest_position_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticker text not null,
  thesis text,
  action text not null default 'a_definir'
    check (action in ('a_definir', 'manter', 'reduzir', 'encerrar', 'rolar', 'aceitar_exercicio', 'call_coberta')),
  exit_price numeric,
  stop_price numeric,
  review_trigger text,
  deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.invest_position_plans enable row level security;

create policy "owner access position plans" on public.invest_position_plans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
