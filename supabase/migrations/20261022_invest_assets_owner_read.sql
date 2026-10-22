-- A lista de ativos revela os tickers da carteira: leitura também só para o dono.
drop policy if exists "authenticated read assets" on public.invest_assets;

create policy "owner read assets" on public.invest_assets
  for select using ((select auth.uid()) = 'eb9da0ad-9877-4f17-ac5a-6f1da5eebc9b'::uuid);
