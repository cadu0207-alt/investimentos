-- invest_assets não tem user_id e o Auth é compartilhado com outros apps do mesmo projeto:
-- a escrita deixa de valer para qualquer usuário logado e fica só com o dono da carteira.
drop policy if exists "authenticated write assets" on public.invest_assets;

create policy "owner insert assets" on public.invest_assets
  for insert with check ((select auth.uid()) = 'eb9da0ad-9877-4f17-ac5a-6f1da5eebc9b'::uuid);

create policy "owner update assets" on public.invest_assets
  for update using ((select auth.uid()) = 'eb9da0ad-9877-4f17-ac5a-6f1da5eebc9b'::uuid)
  with check ((select auth.uid()) = 'eb9da0ad-9877-4f17-ac5a-6f1da5eebc9b'::uuid);

create policy "owner delete assets" on public.invest_assets
  for delete using ((select auth.uid()) = 'eb9da0ad-9877-4f17-ac5a-6f1da5eebc9b'::uuid);
