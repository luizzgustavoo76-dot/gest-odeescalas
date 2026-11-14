# Banco de dados com login (Supabase) — passo a passo

O app já está preparado. Ele só liga o login e a nuvem quando `supabase-config.js` estiver preenchido; sem isso funciona como antes, só neste aparelho.

## 1. Criar o projeto
1. Entre em https://supabase.com, crie a conta e clique em **New project** (plano gratuito serve).
2. Dê um nome (ex.: `bom-dia-escalas`), defina uma senha do banco (guarde) e escolha a região **South America (São Paulo)**.

## 2. Criar as tabelas e as regras de segurança
1. No projeto: **SQL Editor → New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.

## 3. Fechar o cadastro público
**Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up** (só você cria os usuários). Se não quiser e-mail de confirmação, desligue também **Confirm email**.

## 4. Criar os usuários
**Authentication → Users → Add user → Create new user**: e-mail + senha (marque *Auto Confirm User*).
Depois, no **SQL Editor**, rode (trocando os e-mails):
```sql
-- você, administrador (vê e edita tudo)
update public.perfis set papel = 'admin' where email = 'SEU_EMAIL';

-- um gerente que edita só a Padaria
update public.perfis set setores = array['padaria'] where email = 'gerente@exemplo.com';
```
Ids dos setores: `frente-caixa`, `acougue-frios`, `loja-deposito`, `padaria`, `horti-fruit`. Usuário sem setor liberado só consegue ver.

## 5. Ligar o app
**Project Settings → API**: copie a **Project URL** e a chave **anon public** e coloque em `supabase-config.js`. (Nunca use a chave `service_role`.)

## Como funciona
- Cada setor é uma linha na tabela `escalas`; a linha `_config` guarda a data de referência e as regras gerais.
- O app salva no aparelho e envia para a nuvem ~1 segundo depois de cada mudança. O texto no topo mostra "Sincronizado com a nuvem".
- Outros aparelhos recebem a mudança na hora (tempo real).
- Na primeira entrada, se a nuvem já tiver escalas, elas substituem as do aparelho (uma cópia fica em `localStorage` na chave `bom-dia-antes-da-nuvem`). Setores que ainda não existem na nuvem sobem do aparelho.
- Duas pessoas editando o **mesmo setor ao mesmo tempo**: vale a última gravação.
