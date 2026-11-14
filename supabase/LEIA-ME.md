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

## Contas individuais e painel de administração
Cada conta tem os **próprios dados** (escalas, colaboradoras, folgas), separados das outras. Uma conta nova começa em branco e importa a própria planilha. Só o administrador cria contas.

- **Usuário**: vê e edita apenas os seus dados.
- **Administrador**: gerencia contas e pode abrir e editar os dados de qualquer conta ("Abrir dados"; uma faixa amarela avisa de quem são os dados, com o botão "Voltar aos meus dados").

O botão **Painel ADM** (só para administradores) tem 4 abas:

- **Resumo**: totais, alertas (ex.: só 1 administrador, conta sem dados) e os dados de cada conta, com "Abrir dados".
- **Usuários**: criar conta, busca, filtros, ordenação, gerador de senha, copiar e-mail/senha, ações em lote (mudar nível, bloquear) e exportar CSV.
- **Atividade**: registro de quem salvou escalas (e de qual conta) e quem criou/editou/bloqueou contas.
- **Histórico de escalas**: versões anteriores de cada setor de cada conta, com botão para restaurar.
- **Backup**: baixa um arquivo `.json` com as escalas de todas as contas para o seu computador (faça toda semana; o app avisa quando passar de 7 dias) e restaura a partir de um arquivo.

## Recuperar e trocar senha
- **Trocar a própria senha**: botão "Trocar senha" no alto do app.
- **Esqueci minha senha**: na tela de login, o app envia um link por e-mail. Para o link voltar para o site, no Supabase vá em Authentication → URL Configuration e coloque em *Site URL* e em *Redirect URLs* o endereço do site (ex.: `https://SEU-USUARIO.github.io/gest-odeescalas/`). O e-mail padrão do Supabase tem limite de poucos envios por hora; se precisar de mais, configure um SMTP próprio em Authentication → SMTP. Se o e-mail não chegar, o administrador pode definir uma senha nova pelo painel.

## Conta nova
Uma conta sem dados abre em branco (1 colaboradora por semana) com um aviso para importar a planilha. Nada é salvo até a pessoa mexer em alguma coisa.

Ele usa a Edge Function `admin-usuarios` (código em `supabase/functions/admin-usuarios/index.ts`), publicada no Supabase com a chave de serviço guardada no servidor. Se precisar publicar de novo: Supabase → Edge Functions → Deploy a new function, nome `admin-usuarios`, cole o arquivo e desligue "Verify JWT" (a função confere o administrador sozinha).
