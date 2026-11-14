-- Bom Dia · Gestão de Escalas — banco de dados no Supabase
-- Cole TODO este arquivo em: Supabase → SQL Editor → New query → Run.
-- Modelo: CADA CONTA TEM OS PRÓPRIOS DADOS. O administrador pode abrir e editar os de qualquer conta.
-- (Em um projeto já em uso, a migração "dados_individuais_por_usuario" já foi aplicada.)

-- 1) Perfis: nível de cada conta (admin ou usuario)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  papel text not null default 'usuario' check (papel in ('admin','usuario')),
  criado_em timestamptz not null default now()
);

create or replace function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.novo_perfil();
insert into public.perfis (id, email) select id, email from auth.users on conflict (id) do nothing;

-- 2) Escalas: uma linha por conta (dono) e setor, + "_config" (data e regras gerais)
create table if not exists public.escalas (
  dono uuid not null references auth.users(id) on delete cascade,
  setor text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  primary key (dono, setor)
);

create or replace function public.carimbo() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end $$;
drop trigger if exists carimbar_escala on public.escalas;
create trigger carimbar_escala before insert or update on public.escalas for each row execute function public.carimbo();

-- 3) Função de apoio
create or replace function public.sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

-- 4) Segurança (RLS): cada um só lê/grava o que é seu; o admin lê/grava tudo
alter table public.perfis  enable row level security;
alter table public.escalas enable row level security;
drop policy if exists perfis_ler on public.perfis;
drop policy if exists perfis_admin on public.perfis;
drop policy if exists escalas_ler on public.escalas;
drop policy if exists escalas_inserir on public.escalas;
drop policy if exists escalas_alterar on public.escalas;
drop policy if exists escalas_apagar on public.escalas;
create policy perfis_ler on public.perfis for select to authenticated using (id = auth.uid() or public.sou_admin());
create policy perfis_admin on public.perfis for all to authenticated using (public.sou_admin()) with check (public.sou_admin());
create policy escalas_ler on public.escalas for select to authenticated using (dono = auth.uid() or public.sou_admin());
create policy escalas_inserir on public.escalas for insert to authenticated with check (dono = auth.uid() or public.sou_admin());
create policy escalas_alterar on public.escalas for update to authenticated using (dono = auth.uid() or public.sou_admin()) with check (dono = auth.uid() or public.sou_admin());
create policy escalas_apagar on public.escalas for delete to authenticated using (dono = auth.uid() or public.sou_admin());

-- 5) Atualização em tempo real entre aparelhos
do $$ begin
  alter publication supabase_realtime add table public.escalas;
exception when duplicate_object then null; end $$;

-- 6) Registro de atividades e histórico de escalas (painel de administração)
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  ultima_em timestamptz not null default now(),
  ator uuid, ator_email text, acao text not null, alvo text, detalhes jsonb,
  qtd int not null default 1
);
create index if not exists auditoria_quando_idx on public.auditoria (quando desc);
alter table public.auditoria enable row level security;
drop policy if exists auditoria_admin_ler on public.auditoria;
create policy auditoria_admin_ler on public.auditoria for select to authenticated using (public.sou_admin());

create table if not exists public.escalas_historico (
  id bigint generated always as identity primary key,
  dono uuid references auth.users(id) on delete cascade,
  setor text not null, dados jsonb not null, resumo jsonb,
  versao_em timestamptz, versao_por uuid references auth.users(id) on delete set null,
  salvo_em timestamptz not null default now()
);
create index if not exists escalas_historico_dono_idx on public.escalas_historico (dono, setor, id desc);
alter table public.escalas_historico enable row level security;
drop policy if exists historico_admin_ler on public.escalas_historico;
create policy historico_admin_ler on public.escalas_historico for select to authenticated using (public.sou_admin());

create or replace function public.resumo_setor(d jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'colaboradoras', coalesce(jsonb_array_length(d->'weeks'->0->'employees'), 0),
    'semanas', coalesce(jsonb_array_length(d->'weeks'), 0),
    'primeiros', (select coalesce(jsonb_agg(e->>'name'), '[]'::jsonb) from (select e from jsonb_array_elements(coalesce(d->'weeks'->0->'employees','[]'::jsonb)) e limit 3) q)
  );
$$;

create or replace function public.guarda_historico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.dados is distinct from new.dados and new.setor <> '_config' then
    if not exists (select 1 from public.escalas_historico h where h.dono = old.dono and h.setor = old.setor and h.salvo_em > now() - interval '2 minutes') then
      insert into public.escalas_historico (dono, setor, dados, resumo, versao_em, versao_por)
      values (old.dono, old.setor, old.dados, public.resumo_setor(old.dados), old.atualizado_em, old.atualizado_por);
      delete from public.escalas_historico
       where dono = old.dono and setor = old.setor
         and id not in (select id from public.escalas_historico where dono = old.dono and setor = old.setor order by id desc limit 60);
    end if;
  end if;
  return new;
end $$;
create or replace trigger historico_escala before update on public.escalas for each row execute function public.guarda_historico();

create or replace function public.audita_escala() returns trigger
language plpgsql security definer set search_path = public as $$
declare ult record; mail text; dmail text; det jsonb;
begin
  select email into mail from auth.users where id = auth.uid();
  select email into dmail from auth.users where id = new.dono;
  det := public.resumo_setor(new.dados) || jsonb_build_object('dono', new.dono, 'dono_email', dmail);
  select id, ator, ultima_em into ult from public.auditoria
   where acao = 'escala_salva' and alvo = new.setor and detalhes->>'dono' = new.dono::text order by id desc limit 1;
  if found and ult.ator is not distinct from auth.uid() and ult.ultima_em > now() - interval '10 minutes' then
    update public.auditoria set qtd = qtd + 1, ultima_em = now(), detalhes = det where id = ult.id;
  else
    insert into public.auditoria (ator, ator_email, acao, alvo, detalhes) values (auth.uid(), mail, 'escala_salva', new.setor, det);
  end if;
  return new;
end $$;
create or replace trigger auditar_escala after insert or update on public.escalas for each row execute function public.audita_escala();

-- 7) Endurecimento: só o necessário fica executável
revoke execute on function public.novo_perfil() from public, anon, authenticated;
revoke execute on function public.guarda_historico() from public, anon, authenticated;
revoke execute on function public.audita_escala() from public, anon, authenticated;
revoke execute on function public.sou_admin() from public, anon;
grant execute on function public.sou_admin() to authenticated;

-- 8) DEPOIS de criar seu usuário em Authentication → Users, rode UMA vez
--    (troque pelo seu e-mail) para virar administrador:
--
--   update public.perfis set papel = 'admin' where email = 'SEU_EMAIL_AQUI';
--
--    (Depois, contas são criadas e gerenciadas pelo botão "Administração" do app.)
