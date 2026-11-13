# Bom Dia – Gestão de Escalas (v9)

Protótipo web local para organizar a escala semanal da frente de caixa.

## Como abrir

Abra o arquivo `index.html` em um navegador moderno. Para publicar, envie o conteúdo desta pasta (ou o ZIP entregue) para o Netlify Drop.

## Novidades da v9 (conformidade CLT / EC 141/2026 / CCT de Campo Mourão)

- Painel "Conformidade trabalhista" com erros, atenções e informações para as quatro semanas do setor; erros da semana aberta bloqueiam a impressão.
- Jornada e saída calculadas pela data da semana: 44h até 15/12/2026, 42h a partir de 16/12/2026 e 40h a partir de 16/12/2027 (EC 141/2026); aviso para 6x1 após 16/12/2026.
- Verificações: trabalho contínuo acima de 6h sem almoço (art. 71), mais de 6 dias seguidos sem descanso (art. 67), jornada após 22h ou antes das 5h (adicional noturno).
- CCT dos mercados: mínimo de 2 domingos de folga por mês, domingos alternados, restrição de escala após as 18h para estudante/mãe, feriados (100%) e lojas fechadas em Natal, Ano-Novo, Páscoa e 1º de maio, horários máximos (22h / domingo 18h).
- Feriados nacionais, Paraná, Sexta-feira Santa e Páscoa calculados automaticamente; feriados municipais cadastráveis na aba Regras.
- Botão "Sugerir domingos alternados (4 semanas)". Ninguém pode trabalhar dois domingos seguidos: o app recusa a marcação com alerta e aponta o erro se vier de cópia de semana.
- "Sugerir folgas" usa os domingos: quem não está escalado no domingo fica com o domingo de folga; se nenhum domingo estiver definido, aplica antes o revezamento.
- Correção: o domingo sem trabalho agora conta como folga (antes uma colaboradora podia ficar com 3 folgas sem aviso).
- Horários de fechamento configuráveis (antes fixos em 19h30 / 12h).
- Copiar semana (equipe ou preenchimento completo) revezando automaticamente os domingos: as semanas seguintes recebem quem não trabalhou, sem domingos seguidos.
- Feriado com loja fechada (Natal, Ano-Novo, Páscoa, 1º de maio) vira folga automática para todas, sem descontar das folgas obrigatórias.
- Nova coluna "Carga semanal" com as horas reais de cada colaboradora (domingo é turno curto) e erro se passar do limite legal.
- Domingo: intervalo de 15 min para turnos de 4h a 6h e nenhum intervalo até 4h (em vez do almoço de 2h cortado).
- Botão "Sugerir folgas em todas as semanas".
- 6x1: a sugestão de folgas agora evita mais de 6 dias seguidos (semana com domingo = 1 folga; semana sem domingo = domingo + 1 folga extra no meio da semana). A 6x1 aceita de 1 a 2 folgas por semana.

Aviso: validação auxiliar. O texto integral da CCT não foi consultado (pontos vindos de reportagens); confirme com o sindicato ou jurídico.

## Incluído nas versões anteriores

- Quantidade configurável de operadoras ativas.
- Indicador de operadoras ativas no painel.
- De 1 a 5 turnos configuráveis por semana, ordenados da entrada mais cedo à mais tarde.
- Alternância semanal entre os modelos 5x2 e 6x1, com jornada e retorno do almoço calculados automaticamente.
- Prévia da escala no painel principal.
- Posto semanal por operadora na Frente de Caixa: PDV, Pacote ou Fiscal.
- Rodízio opcional por turno: defina a quantidade em cada horário e aplique a distribuição automática, por número de colaboradora, nas quatro semanas.
- Cópia opcional da semana aberta para as outras três: equipe, nomes, modelo, turnos e postos juntos, ou cada grupo de configuração separadamente.
- Sugestão de folgas distribuídas, equilibrando os dias sempre que a quantidade de colaboradoras permitir.
- Quadro de cobertura em faixas de uma hora (com o último intervalo de 19h a 19h30).
- Folgas exibidas com as respectivas datas no formato DD/MM/AA.
- Seleção de trabalho no domingo por operadora, com a data do próximo domingo.
- Impressões separadas: escala semanal e escala de domingo.
- Configurações organizadas nas abas Equipe, Turnos e PDVs.
- Escalas independentes por setor: Frente de Caixa, Açougue e Frios, Loja e Depósito, Padaria e Horti Fruit.
- Seleção de até dois dias de folga por colaboradora, entre todos os dias da semana.
- A impressão reúne a escala semanal e a escala de domingo em folhas separadas.
- A referência da escala é sempre ajustada para uma segunda-feira.
- PDVs são usados apenas na Frente de Caixa; os demais setores não exibem esse campo.
- Quatro abas semanais independentes, com datas sequenciais calculadas a partir da segunda-feira de referência.
- Quadro de disposição de horários por dia, com cores para menor e maior cobertura.
- A impressão é bloqueada até que todas as colaboradoras tenham as folgas obrigatórias: duas no 5x2 e uma no 6x1.
- Mínimos de escala de domingo por setor e alertas de cobertura da Frente de Caixa.
- Salvamento local no navegador.

## Ainda não incluído

Login, banco de dados na nuvem, acesso simultâneo por gerentes, sincronização entre dispositivos, geração de PDF como arquivo e validação trabalhista/jurídica automatizada.

## Ajustes finais da v9

- Domingo cumpre a carga horária completa do modelo (5x2: 8h20; 6x1: 7h20); intervalo só quando a jornada passa de 6h. Fechamento de domingo padrão: 18h (limite da CCT). Aviso se o turno de quem trabalha no domingo termina depois do fechamento.
- Ao digitar entrada ou almoço, o app corrige o horário para nunca ter mais de 6h seguidas sem intervalo e nunca ficar abaixo da carga horária; a aba Turnos mostra a carga de cada modelo.
- "Sugerir domingos" e "Sugerir folgas" exigem que a Semana 1 tenha as colaboradoras de domingo escolhidas; as demais semanas são preenchidas por revezamento a partir dela, sem substituir semanas que você já preencheu.
- Coluna "Carga semanal" trocada por "Limite c/ extras (máx. 1h30)" (saída + 1h30), na tela e na impressão, nos dois modelos.
- Botão discreto "Restaurar todas as semanas…" (restaura as 4 semanas do setor aberto).
- Rodízio de Pacote e Fiscal: campo "Rodízio" na ficha da colaboradora com posto Pacote ou Fiscal e botão "Aplicar rodízio de postos nas outras semanas" na aba Rodízio.

## Backup e cadastro (v9)

- **Exportar backup / Importar backup…** (rodapé do painel de configuração): salva e restaura todos os setores, semanas, cadastro e regras em um arquivo `.json`. A importação pede confirmação e rejeita arquivos que não sejam do app, sem alterar os dados atuais. O aviso no topo fica amarelo quando nunca houve backup ou o último tem 7 dias ou mais.
- **Nome e restrição de estudante/mãe** são editados na ficha de "Colaboradoras ativas" e valem para as 4 semanas do setor; não são apagados ao restaurar semanas.

## Geração automática (opcional)

Aba **Gerar**: o botão "Gerar escala do setor" só age quando clicado. Exige os domingos da Semana 1 escolhidos. Preenche domingos das semanas vazias (revezamento), gira e equilibra os turnos (opcional) trocando quem trabalha no domingo para um turno que termina antes do fechamento, respeita a restrição de estudante/mãe (turno que termina até 18h), refaz as folgas (sem mais de 6 dias seguidos), rodízio de Pacote/Fiscal e distribui os PDVs sem repetir no mesmo dia e horário. Mostra um resumo da conformidade e permite **Desfazer última geração** por setor. O backup não inclui a cópia de desfazer.
