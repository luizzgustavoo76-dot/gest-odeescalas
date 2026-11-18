# Metas da Loja — Bom Dia São Luiz Araruna

Site de metas por setor com login (Supabase projeto **Metas Loja**, `chjderobmzdsumulxdwd`, região São Paulo).

Endereço: https://luizzgustavoo76-dot.github.io/gest-odeescalas/metas/

## Acessos
- **Gerente**: vê a loja inteira, lança qualquer setor, define metas, importa planilhas e cadastra usuários.
- **Encarregado**: vê e lança apenas os setores marcados no cadastro. Não vê metas nem vendas da loja inteira.
- As regras ficam no banco (RLS). A chave `service_role` nunca vai para este repositório; o cadastro de usuários roda na Edge Function `usuarios`.

## Arquivos
- `index.html`, `estilo.css`, `app.js` — o site.
- `parser.js` — leitura de relatórios e da planilha mensal antiga (META DIARIA / PERCA-VENDA SETORES / Planilha1…31).
- `config.js` — URL e chave pública do Supabase.
- Banco: tabelas `setores`, `perfis`, `meses`, `metas_setor`, `dias`, `lancamentos`, `diarias` + função `metas_diarias_setor` e Edge Function `usuarios` (no projeto Supabase).

Nenhum dado de vendas fica neste repositório: tudo está no banco, protegido por login.
