-- Bom Dia · Gestão de Escalas — banco de dados no Supabase
-- Cole TODO este arquivo em: Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem problemas (é seguro repetir).

-- 1) Perfis: quem pode entrar e quais setores pode editar --------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  papel text not null default 'gerente' check (papel in ('admin','gerente')),
  setores text[] not null default '{}',
  criado_em timestamptz not null default now()
);

-- cria o perfil automaticamente quando você cadastra um usuário em Authentication → Users
create or replace function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_perfil();

-- perfis dos usuários que já existirem
insert into public.perfis (id, email)
select id, email from auth.users on conflict (id) do nothing;

-- 2) Escalas: uma linha por setor (+ a linha "_config" com a data e as regras gerais)
create table if not exists public.escalas (
  setor text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);

create or replace function public.carimbo() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end $$;

drop trigger if exists carimbar_escala on public.escalas;
create trigger carimbar_escala before insert or update on public.escalas
  for each row execute function public.carimbo();

-- 3) Funções de apoio (evitam recursão nas regras de segurança)
create or replace function public.sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.posso_editar(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and (p.papel = 'admin' or s = any (p.setores) or s = '_config')
  );
$$;

-- 4) Segurança (RLS): só quem fez login lê; só quem tem permissão grava -------
alter table public.perfis  enable row level security;
alter table public.escalas enable row level security;

drop policy if exists perfis_ler      on public.perfis;
drop policy if exists perfis_admin    on public.perfis;
drop policy if exists escalas_ler     on public.escalas;
drop policy if exists escalas_inserir on public.escalas;
drop policy if exists escalas_alterar on public.escalas;
drop policy if exists escalas_apagar  on public.escalas;

create policy perfis_ler   on public.perfis for select to authenticated
  using (id = auth.uid() or public.sou_admin());
create policy perfis_admin on public.perfis for all to authenticated
  using (public.sou_admin()) with check (public.sou_admin());

create policy escalas_ler     on public.escalas for select to authenticated using (true);
create policy escalas_inserir on public.escalas for insert to authenticated
  with check (public.posso_editar(setor));
create policy escalas_alterar on public.escalas for update to authenticated
  using (public.posso_editar(setor)) with check (public.posso_editar(setor));
create policy escalas_apagar  on public.escalas for delete to authenticated
  using (public.sou_admin());

-- 5) Atualização em tempo real entre aparelhos
do $$ begin
  alter publication supabase_realtime add table public.escalas;
exception when duplicate_object then null; end $$;

-- 6) DEPOIS de criar seu usuário em Authentication → Users, rode UMA vez
--    (troque pelo seu e-mail) para virar administrador:
--
--   update public.perfis set papel = 'admin' where email = 'SEU_EMAIL_AQUI';
--
--    Para liberar setores a um gerente (ids: frente-caixa, acougue-frios,
--    loja-deposito, padaria, horti-fruit):
--
--   update public.perfis set setores = array['padaria'] where email = 'gerente@exemplo.com';
