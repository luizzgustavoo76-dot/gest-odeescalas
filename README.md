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
- A referência da escala é sempre ajustada para um domingo: a semana vai de domingo a sábado.
- PDVs são usados apenas na Frente de Caixa; os demais setores não exibem esse campo.
- Quatro abas semanais independentes, com datas sequenciais calculadas a partir do domingo de referência.
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
- Rodízio de turnos por posto (Pacote, Fiscal e Recepção): veja a seção abaixo.

## Backup e cadastro (v9)

- **Backup** (Painel ADM → Backup): baixa o backup completo (todas as contas) ou só a conta aberta, em arquivo `.json`; ao restaurar, o app reconhece sozinho o tipo do arquivo e pede confirmação antes de substituir.
- **Ciclo de 4 semanas** (aba Gerar): "Avançar para o próximo ciclo" move as datas 28 dias, mantém equipe/turnos/postos, continua a sequência dos domingos e guarda o ciclo anterior (até 6 por setor).
- **Ajuste direto nas tabelas** (Análise de folgas e Cobertura por hora): "Ajustar escala por aqui" liga os botões + e −, que movem folgas entre dias ou pessoas entre turnos sem quebrar as regras.
- **Nome e restrição de estudante/mãe** são editados na ficha de "Colaboradoras ativas" e valem para as 4 semanas do setor; não são apagados ao restaurar semanas.

## Geração automática (opcional)

Aba **Gerar**: o botão "Gerar escala do setor" só age quando clicado. Exige os domingos da Semana 1 escolhidos. Preenche domingos das semanas vazias (revezamento), gira e equilibra os turnos (opcional) trocando quem trabalha no domingo para um turno que termina antes do fechamento, respeita a restrição de estudante/mãe (turno que termina até 18h), refaz as folgas (sem mais de 6 dias seguidos), rodízio de Pacote/Fiscal e distribui os PDVs sem repetir no mesmo dia e horário. Mostra um resumo da conformidade e permite **Desfazer última geração** por setor. O backup não inclui a cópia de desfazer.

- Novo posto **Recepção** na Frente de Caixa, ao lado de PDV, Pacote e Fiscal, com rodízio entre as semanas como os demais.

## Rodízio de turnos por posto (cedo/tarde)

Na aba **Rodízio** (Frente de Caixa), defina para cada posto (**Pacote**, **Fiscal**, **Recepção**) quantas colaboradoras ficam no turno **cedo** e quantas no **tarde** (cedo = entrada antes de 09:00, ajustável). O **posto de cada colaboradora é o da ficha e não muda**: o rodízio é de turnos. A cada semana cada uma avança uma vaga e alterna entre cedo e tarde; cada posto é contado separadamente. Estudante/mãe com restrição ficam nas vagas cedo. Se o número de colaboradoras do posto for diferente do de vagas, o app avisa. A geração automática usa essa configuração.

## Turno de domingo (novo)

A aba **Turnos** tem um cartão **Domingo** por semana, com dois tipos: **Até o meio-dia** (padrão: entrada 07:40, saída 12:00, direto e sem intervalo; acima de 6h seguidas o app dá erro) e **Dia todo** (entrada, saída para almoço de 2h, retorno e saída calculada pela carga do modelo, como nos dias normais). Na Frente de Caixa, o domingo exige pelo menos 1 colaboradora no posto **Fiscal** e 1 na **Recepção**: a Semana 1 só libera o revezamento quando isso é atendido, e a conformidade acusa erro nas demais semanas.


## Postos por setor (novo)

O mesmo modelo da Frente de Caixa vale para os outros setores. O posto é fixo da colaboradora (escolhido na ficha, vale nas 4 semanas) e o rodízio é de turnos cedo/tarde por posto, na aba **Rodízio**:

| Setor | Postos | Obrigatórios no domingo |
|---|---|---|
| Frente de Caixa | PDV, Pacote, Fiscal, Recepção | Fiscal e Recepção |
| Açougue e Frios | Açougue, Frios, Repositor de Frios, Limpeza | Açougue e Frios |
| Loja e Depósito | Depósito, Reposição, Troca de Etiqueta, Cartaz, Limpeza | Depósito e Reposição |
| Padaria | Produção, Atendimento, Limpeza | Produção e Atendimento |

Horti Fruit segue sem postos. A Semana 1 só libera o revezamento de domingos quando cada posto obrigatório tem alguém marcada; nas demais semanas a conformidade acusa erro se faltar. As exigências de domingo ficam na constante `SUNDAY_POSTS` do `app.js`, se quiser ajustar (por exemplo, incluir Limpeza).


## Excluir colaboradora, folgas sem sábado e importação de planilha

- **Excluir:** botão vermelho "Excluir" ao lado do número de cada colaboradora na ficha. Ela sai das 4 semanas, a numeração é refeita, o rodízio é reajustado e folgas e PDVs são recalculados (domingos e turnos das demais ficam como estão). Dá para desfazer na aba Gerar.
- **Folgas sem sábado:** a sugestão de folgas, no 5x2 e no 6x1, não usa mais o sábado (só segunda a sexta). Escolhas manuais continuam livres.
- **Importar planilha:** no topo, "Importar planilha…" aceita .xlsx ou .csv com as colunas Nome, Setor e Posto (opcional: Estudante/Mãe). O app reconhece o setor e o posto de cada colaboradora, ajusta a quantidade nas 4 semanas e aplica nomes, postos e restrições. Se o arquivo tiver uma aba por setor, o nome da aba vale como setor; sem coluna Setor, vale o setor aberto. "Baixar modelo" gera um exemplo. Antes de aplicar, o app mostra um resumo e avisos de nomes de setor/posto não reconhecidos; dá para desfazer na aba Gerar.


## Logo

A logo do Supermercados Bom Dia · São Luiz fica em `logo.png` (mantenha o arquivo na mesma pasta do `index.html`). Para trocar, substitua esse arquivo.


## Rodízio único + Operadora Caixa (novo)

- A aba **Rodízio** agora tem somente o **rodízio de turnos dos postos** (cedo/tarde), em todos os setores. O rodízio antigo por quantidade de turnos foi removido. Sem ajuste manual, as vagas são metade cedo e metade tarde das colaboradoras do posto; edite os números quando quiser.
- **Frente de Caixa:** postos Operadora Caixa, Pacote, Fiscal e Recepção. O PDV deixou de ser posto: quando a colaboradora é "Operadora Caixa", aparece na ficha a caixa **PDV da semana** para escolher o número (cada semana pode ter um PDV diferente). A geração automática distribui PDVs sem repetir no mesmo dia e horário.
- **Horti Fruit** usa o posto único "Equipe" para poder ter rodízio de turnos cedo/tarde. Os demais setores seguem com seus postos (Açougue/Frios/Limpeza, Depósito/Reposição/Limpeza, Produção/Atendimento/Limpeza).
- Posto exigido no domingo com só 1 colaboradora: como ninguém pode trabalhar dois domingos seguidos, o app acusa erro nas semanas alternadas; para evitar, tenha pelo menos 2 colaboradoras nesse posto.

- **Planilha de funcionários da folha:** o importador acha o cabeçalho mesmo com linhas acima (ex.: "Empresa: ..."), usa só Nome e Departamento (ignora PIS, CPF etc.) e converte o departamento em setor + posto: FRENTE DE CAIXA → Frente de Caixa/Operadora Caixa; PACOTE, RECEPÇÃO → Frente de Caixa; AÇOUGUE, FRIOS → Açougue e Frios; REPOSIÇÃO, DEPÓSITO, LIMPEZA, ADMINISTRATIVO, GERAL → Loja e Depósito; PADARIA → Padaria; FLV → Horti Fruit. Nomes em MAIÚSCULAS viram "Nome Sobrenome".

- **PDV só na Frente de Caixa:** nos demais setores some o cartão "PDVs em uso", a aba PDVs, a escolha de PDV na ficha e o painel de alertas de atendimento.


## Tela responsiva e análise de folgas (novo)

- A tabela da escala se adapta à largura da tela e, no celular, vira um cartão por colaboradora (nada mais fica cortado).
- No fim da página, a seção **Análise de folgas** mostra, para a semana aberta: pontos de atenção (dias mais vazios, folgas desiguais, sábado, domingo abaixo do mínimo, posto com 1 só pessoa); quadro por turno e por posto com quantas trabalham em cada dia e o que sobra se mais 1 folgar (vermelho/amarelo); e quem está de folga em cada dia.
- A sugestão de folgas do 5x2 agora espalha melhor as folgas de segunda a sexta.

- **Recepção e Fiscal sem folga no mesmo dia:** a sugestão e a geração de folgas distribuem as folgas das colaboradoras de cada um desses postos em dias diferentes (segunda a sábado; o domingo segue a regra de domingo alternado). Na ficha, o app bloqueia marcar uma folga que outra do mesmo posto já tem, e a conformidade acusa erro se houver coincidência. Com mais de 3 colaboradoras no posto a coincidência pode ser inevitável e vira só um aviso.

- **Folgas equilibradas por turno:** "Sugerir folgas" e "Gerar" escolhem os dias de folga olhando o turno de cada colaboradora, para que cedo, meio e tarde fiquem com quantidades parecidas em todos os dias (nos testes a diferença entre dois dias do mesmo turno ficou em no máximo 1 pessoa). Mantém: sem sábado, Recepção/Fiscal em dias diferentes, domingo alternado e no máximo 6 dias seguidos. Na geração automática, os turnos do rodízio dos postos são definidos antes das folgas.

- **Domingo "Dia todo":** a saída agora é um campo editável (a sugestão inicial vem da carga do modelo, mas nada é recalculado depois). Se mudar a entrada, a saída acompanha o mesmo deslocamento. A conformidade avisa se a jornada ficar abaixo da carga do modelo e dá erro acima de 10h por dia.

- **Conferência de folgas:** a Análise de folgas mostra "N colaboradoras × 2 folgas = X" contra a soma real da semana (5x2) e aponta quem está fora do padrão. O domingo não trabalhado conta como uma das 2 folgas; no 6x1 quem trabalha no domingo tem 1 folga e quem não trabalha tem o domingo mais 1 extra.

- **Folgas pensadas pelo atendimento:** na aba Gerar, "Movimento esperado por dia" (Baixo/Médio/Alto/Muito alto, com padrão de supermercado: segunda e terça fracas, sexta alta, sábado muito alto). A sugestão e a geração de folgas concentram as folgas nos dias fracos e poupam os de pico, por turno; mantêm ao menos metade de cada turno presente e nunca deixam um posto (Fiscal, Recepção, Pacote…) sem ninguém. A Análise de folgas mostra o movimento de cada dia.

- Corrigido: aviso antigo "o turno termina depois do fechamento de domingo" não aparece mais; o domingo usa apenas o horário do cartão Domingo.

- **Rodízio de turnos corrigido:** todas as colaboradoras do posto entram no rodízio (antes quem estava nas primeiras posições ficava sempre cedo nas 4 semanas). A cada semana o grupo avança o número de vagas "cedo", então quem estava cedo vai para a tarde e vice-versa. Se o número de vagas não bate com o de colaboradoras, o app mantém a proporção cedo/tarde e avisa. Posto com 1 colaboradora só alterna se você configurar 1 cedo e 1 tarde.

## Impressão resumida
"Imprimir escala" gera exatamente 2 folhas A4 paisagem: 1 folha com a escala da semana (colaboradora, posto, entrada, almoço, saída e folgas) e 1 folha com a escala de domingo. A densidade da letra se ajusta ao número de colaboradoras.

## PDV ao gerar as semanas
Ao gerar as escalas, quem trabalha no 1º turno (entrada mais cedo) recebe os PDVs mais baixos (1 a 4 primeiro); os turnos seguintes pegam os números livres seguintes. Ninguém divide o mesmo PDV no mesmo dia e horário.

## PDVs de cada turno (selecionável)
Na aba **Regras** (Frente de Caixa) há o bloco "PDVs de cada turno": marque quais PDVs cada turno usa (ex.: 1º turno = PDV 1 a 4). Mostra quantas operadoras há em cada horário e avisa se faltarem PDVs marcados. Vale ao aplicar o rodízio, ao gerar a escala e no botão "Aplicar PDVs nas 4 semanas". Sem marcação, o sistema escolhe automático. Quem passar da quantidade marcada usa outro PDV livre.

### Troca de operadora no mesmo PDV
Se há mais operadoras do que PDVs, o mesmo PDV pode ser marcado em mais de um turno. Sem PDV livre, a operadora do turno seguinte assume o PDV de quem sai antes, e o painel lista "Trocas de operadora nesta semana" (quem sai, horário da troca e quem assume).

### Limite de PDVs por turno
Cada turno só deixa marcar tantos PDVs quanto operadoras tem naquele horário (ex.: 4 operadoras cedo = até 4 PDVs; 8 à tarde = até 8). Os demais ficam bloqueados até desmarcar algum.

### Baixar para imprimir
O botão **Baixar para imprimir** gera um arquivo .html com a folha da semana e a folha de domingo. Abra o arquivo baixado: a janela de impressão abre sozinha (A4 paisagem, 2 folhas). Útil quando o botão "Imprimir escala" não funciona na prévia do navegador.

### Troca de PDV na impressão
Quando um PDV é dividido entre turnos, a escala impressa (e o arquivo "Baixar para imprimir") mostra, só na operadora que assume o PDV, a partir de que horas ela entra no lugar da outra ("após 17:20").

### Domingo na impressão
A folha de domingo não mostra mais a coluna "Turno".

### PDVs no domingo (aba Regras)
Bloco próprio para o domingo: marque quais PDVs funcionam no domingo (no máximo um por operadora de caixa escalada no domingo). Cada operadora de caixa escalada assume um deles, na ordem da numeração, na escala de domingo e na impressão. Sem marcação, usa o PDV da semana.

### Aba Equipe com PDVs
A quantidade de PDVs disponíveis agora fica na própria aba **Equipe** (Frente de Caixa); a aba "PDVs" deixou de existir.

### Ajustes de leitura na impressão
Título e datas da semana centralizados; colunas mais juntas (sem o espaço grande entre posto e entrada); folgas no formato "Seg. 09/11 e Ter. 10/11" (dia da semana, dia e mês na mesma célula).

### Data no cabeçalho do domingo
O cabeçalho da folha de domingo (impressão e arquivo "Baixar para imprimir") traz "Escala de domingo · data".

### Impressão adaptável
A letra e a altura das linhas se ajustam ao número de colaboradoras (poucas = letra grande; muitas = letra menor) para ocupar a folha inteira, com as colunas distribuídas na largura toda. Continua sendo 1 folha da semana + 1 folha de domingo.

### Mesmo layout nos dois botões
"Baixar para imprimir" agora gera o arquivo a partir da própria página e do mesmo CSS de impressão do botão "Imprimir escala", então o layout é idêntico (cabeçalho, título centralizado, colunas, trocas de PDV e escala de domingo).

### Impressão: um único documento
"Imprimir escala" e "Baixar para imprimir" geram exatamente o mesmo documento (mesma função `buildPrintHtml`): o que aparece na tela ao abrir o arquivo é o que sai no papel. Qualquer ajuste de layout é feito nesse documento e vale para os dois botões.

### Troca de PDV também na prévia
A prévia da escala (tela) mostra, ao lado do PDV da operadora que assume, o horário da troca em vermelho, por exemplo "(após 17:20)", igual ao documento impresso.

### Mínimo por posto no domingo (aba Regras)
Em vez de um mínimo geral, cada posto do setor tem o seu mínimo de colaboradoras no domingo (− / + ou digitando). Já vem preenchido com o que estava definido: Frente de Caixa = Operadora Caixa 2, Fiscal 1, Recepção 1 (total 4); Açougue e Frios = Açougue 2, Frios 2 (total 4); Loja e Depósito = Depósito 1, Reposição 1 (total 2); Padaria = Produção 1, Atendimento 2 (total 3); Horti Fruit = Equipe 1. O total do setor é a soma dos postos. A conformidade avisa quando um posto fica abaixo (erro se ficar sem ninguém) e a sugestão de domingos tenta cumprir cada posto. "Voltar ao padrão do setor" restaura.

### Adicionar colaboradora e escalar no domingo (na prévia)
- **Semana:** abaixo da tabela, "+ Adicionar colaboradora" (com escolha do posto) cria a colaboradora nas 4 semanas e já recalcula turno, folgas e PDV. O domingo dela começa como "não trabalha".
- **Domingo:** abaixo da escala de domingo, "+ Adicionar ao domingo" escolhe uma colaboradora já cadastrada e marca que ela trabalha naquele domingo (não cria colaboradora nova), recalculando as folgas da semana. Respeita as regras: não trabalhou o domingo anterior nem trabalha o próximo, no máximo 2 domingos no mês, restrita não passa das 18h e domingo fechado por feriado. Quem não pode aparece desabilitada, com o motivo.
- Ambos podem ser desfeitos em "Gerar".

O botão "+ Adicionar colaboradora" tem um campo **Nome**: o nome digitado vale nas 4 semanas e é convertido para MAIÚSCULAS (ex.: "maria das graças" vira "MARIA DAS GRAÇAS"). Sem nome, usa "Colaboradora N". Enter no campo também adiciona.

### Edição direto na prévia da escala
A tabela da prévia é editável: **Turno** (lista), **Posto** (lista; na Operadora Caixa também o **PDV**) e **Folgas** (botões Seg a Sáb; o Dom aparece marcado quando a pessoa não trabalha no domingo). Usa as mesmas regras das fichas: limite de folgas (2 no 5x2, 1 no 6x1), Recepção e Fiscal sem folgar no mesmo dia, domingo sem dois seguidos. Turno, PDV e folgas valem para a semana aberta; posto e nome valem nas 4 semanas. A impressão não mostra os controles, só o texto.

### Configuração da semana no topo
O painel "Configuração da semana" (abas Equipe, Turnos, Rodízio, Regras e Gerar) agora fica acima da prévia, em largura total, e a prévia ocupa a largura toda da tela. O botão **Recolher configuração** esconde o painel para dar ainda mais espaço à prévia (o app lembra a escolha neste dispositivo).

### Botões agrupados e alinhados
Na aba **Equipe** os botões ficam em dois grupos alinhados ("Copiar para as outras semanas" e "Sugestões automáticas"), com o mesmo tamanho; restaurar e backup ficam numa linha de rodapé. Os botões do topo (importar, modelo, imprimir, baixar) ficam em grade, e nas demais abas os botões alinham à esquerda com tamanho padrão.

### Botões de folga com data
Na tabela da prévia, cada botão de folga mostra o dia e a data (ex.: "Seg 09/11"). O botão **Dom** fica ao lado, ocupando a altura das duas linhas (entre Qua e Sáb), indicando "folga" ou "trabalha" no domingo. A altura da linha não aumenta.

- Coluna "Limite c/ extras" da prévia com metade da largura (89px).
- Cadastro da semana: botão Recolher/Expandir configuração.
- Disposição de horários: botão Recolher/Expandir.
- Análise de folgas: botão Recolher/Expandir; Conformidade trabalhista movida para o final da página.
- Botões Recolher/Expandir configuração com tamanho único (220px).
- Login e banco de dados no Supabase (sync.js, supabase-config.js, supabase/schema.sql e supabase/LEIA-ME.md). Sem configuração, o app funciona só no aparelho.
- Corrige sincronização quando o navegador bloqueia armazenamento (iPhone); botão Atualizar da nuvem.
- Faixa de diagnóstico da sincronização (parte de baixo da tela) para conferir o que veio da nuvem.
- Botão Sair (vermelho) e Atualizar da nuvem visíveis na barra do usuário.
- Removido o botão Imprimir escala; fica só Baixar para imprimir.
- Corrige sincronização dos nomes: a lista de nomes (roster) agora vai junto com cada setor na nuvem; dados antigos recuperam os nomes da semana 1.
- Dados 100% na nuvem: o app só abre com login e conexão; nenhuma escala, nome ou folga é lida/gravada no aparelho (só preferências visuais e o login). Antes de salvar confere a versão do setor: se outra pessoa alterou, recarrega a versão nova e avisa. Perda de conexão bloqueia o app até recarregar da nuvem.
- Painel de administração (admin.js + função admin-usuarios): contas, senha, nível (administrador/usuário), bloquear, excluir, atividade e histórico. Cada conta tem os próprios dados; o administrador pode abrir e editar os de qualquer conta. Botão Sair refeito; removido Atualizar da nuvem.

- Backup completo (baixar/restaurar) no painel; recuperar senha por e-mail e trocar a própria senha; conta nova abre em branco; ajustes de desempenho das regras de acesso (RLS) e índices.

- Build 76: desfazer/refazer (Ctrl+Z / Ctrl+Y), histórico de versões para a própria conta, erros do app registrados na aba Atividade, modo Resumo/Editar no celular, instalar como aplicativo (manifest + ícones), enviar a escala por WhatsApp, regras configuráveis (sábado, postos do setor, quem não folga junto), ordem das linhas mantida ao editar na tabela, teto da fonte do domingo na impressão. Código: app.js formatado, ganchos `afterRender`, restos removidos, faixa de diagnóstico removida.

## Estrutura do código
- `index.html` – página; carrega `app.js` e depois, em ordem, a biblioteca do Supabase (`vendor/supabase.js`, com reserva no jsDelivr), `supabase-config.js`, `admin.js` e `sync.js`.
- `app.js` – regras da escala e desenho da tela. Depois de cada `render()` rodam os ganchos de `afterRender`.
- `sync.js` – login, dados na nuvem, desfazer/refazer, histórico da conta, troca de senha, registro de erros.
- `admin.js` – painel de administração.
- `supabase/` – banco (`schema.sql`), função `admin-usuarios` e instruções.
- `tests/` – testes automáticos. Rodar: `npm install --no-save playwright && npx playwright install chromium && node tests/run.js`. No GitHub rodam sozinhos a cada envio (aba Actions).

- **Semana de domingo a sábado:** o domingo abre a semana em todo o app. No 6x1 cada semana tem 1 folga (sem folga extra); contas antigas recomeçam a escala (nomes e postos ficam) na primeira abertura.

## Completar as 4 semanas (build 92)
A aba **Equipe** tem 3 botões de preenchimento: **Completar as 4 semanas** (equipe, modelo, PDVs, turnos, domingos e folgas, sempre a partir da Semana 1),
**Copiar preenchimento completo** (semana aberta idêntica nas outras) e **Sugerir folgas só desta semana**.
Se a Semana 1 não tem domingos marcados, o app escolhe (respeitando o mínimo por posto, sem domingos seguidos e com ao menos 2 domingos de folga por mês); se já tem, mantém os seus.

## Férias/atestados, resumo do ciclo e confirmações (build 95)
- **Férias / atestado**: na ficha de cada colaboradora (Colaboradoras ativas) registre o tipo e o período. Vale pelas datas, em qualquer semana: nesses dias ela sai da escala, da cobertura e do domingo; as folgas da semana são recalculadas e o app tenta colocar uma substituta do mesmo posto no domingo.
- **Resumo por colaboradora**: no fim da página, domingos trabalhados/de folga, folgas, dias, horas no ciclo, maior sequência e dias de ausência.
- **Completar as 4 semanas** pergunta antes de substituir semanas 2 a 4 alteradas à mão.
- **Aba Regras** avisa quando um posto tem menos pessoas do que o dobro do mínimo de domingo (não dá para alternar).
- Banco: `setor_permitido` não pode mais ser chamada sem login.

## Saída automática por inatividade (build 101)
Sem uso (clique, tecla, rolagem ou toque), o app desconecta sozinho: **15 minutos** para administrador e **30 minutos** para usuário.
Um minuto antes aparece o aviso "Você ainda está aí?" com o botão **Continuar conectado**. As alterações pendentes são salvas antes de sair.
Reabrir o site depois de ficar parado por mais que o limite também pede login de novo. Os tempos ficam em `sync.js` (`inatCfg`).

## Horário limitado ao fechamento, almoços automáticos e turno fixo (build 102)
- **5x2 = 42h semanais** (8h24 por dia; 6x1 = 7h20 por dia). A tela de Conformidade e o botão do modelo mostram a carga correta.
- **Entrada limitada pelo fechamento**: entrada + carga + 2h de almoço não pode passar do fechamento de segunda a sábado (Regras). Com fechamento às 19h30, a entrada máxima é 09h06 no 5x2 e 10h10 no 6x1; entrada mais tarde é recusada com mensagem vermelha. Trocar 6x1 → 5x2 (ou mudar o fechamento) antecipa a entrada sozinho, e continua editável.
- **Almoços em cascata**: com 2 turnos, o 2º almoça quando o 1º volta; com 3 ou mais, 1h de diferença entre os almoços. Mudar o almoço (ou a entrada) de um turno leva os seguintes junto. Qualquer alteração que deixe a loja sem ninguém trabalhando é recusada, e a Conformidade aponta buracos que já existam.
- **Turno fixo**: caixinha na ficha da colaboradora. Trava o turno nas 4 semanas (rodízio, Completar as 4 semanas e plano dos postos respeitam); a escolha do turno só libera ao desmarcar. Fica salva na ficha (roster).
- **Domingo e férias/atestado**: quem está de férias aparece em "Não podem" com o motivo "de férias" (ou atestado/afastamento).

### Ajuste (build 103)
- Trocar de modelo mexe na entrada **nos dois sentidos**: turnos que terminam no fechamento continuam terminando nele (6x1 → 5x2 antecipa, 5x2 → 6x1 atrasa).
- A cobertura do almoço olha os turnos configurados (não depende de quem está escalada em cada um). Com 2 turnos, o almoço do 2º nunca fica antes do retorno do 1º (ajuste automático com aviso); almoços coincidentes de dados antigos são refeitos sozinhos.

### Fiscal e Recepção folgam em dias diferentes (build 104)
Os postos marcados em Regras → "Não folgam no mesmo dia" (padrão: Fiscal e Recepção) agora formam **um grupo só**: nenhuma colaboradora de um posto folga no mesmo dia que a de outro posto do grupo (antes só valia dentro do mesmo posto). Vale nas sugestões de folga, ao marcar à mão e no alerta da Conformidade. Com 5x2 isso reparte as folgas de segunda a sexta (até 3 pessoas no grupo cabem sem repetir dia).

### Botão "Corrigir" nos erros (build 105)
Os avisos vermelhos que o app sabe resolver sozinho ganham um botão **Corrigir** no fim da mensagem (no aviso acima da tabela e na Conformidade): folga obrigatória faltando (agora com os nomes) e folgas juntas de Fiscal/Recepção recalculam as folgas da semana; almoços sem cobertura refazem a cascata; jornada que passa do fechamento antecipa a entrada. Se o app não conseguir, avisa em vermelho. Guarda o estado anterior para desfazer.

### Saída por inatividade e atualização (build 106)
Teste com relógio simulado nos tempos reais (admin 15 min, usuário 30 min: aviso 1 min antes e volta ao login). Aba aberta com versão antiga não tem o recurso; agora uma aba parada há mais de 2 min e sem nada por salvar se atualiza sozinha quando sai versão nova.

### Trocar o e-mail no Painel ADM (build 107)
Em Painel ADM → usuário → Editar há o campo **E-mail (usado para entrar)**. Ao salvar, a função `admin-usuarios` (v7) troca o login no Auth e em `perfis`; a senha continua a mesma e o e-mail antigo fica registrado na aba Atividade. E-mail já usado por outra conta é recusado. Requer reimplantar a função (já feito no projeto; para outro projeto: `supabase functions deploy admin-usuarios`).

### Completar a partir da semana aberta (build 108)
O botão de completar agora usa a **semana que está aberta como base** e só refaz as semanas **seguintes**: na Semana 1 é "Completar as 4 semanas"; na Semana 2 vira "Completar as Semanas 3 e 4" (a Semana 1 não é alterada); na Semana 3, "Completar a Semana 4"; na Semana 4 fica desativado. Se as semanas que serão substituídas foram mexidas à mão, o app pergunta antes (e diz o que não muda). Dá para voltar com Desfazer.

## Build 109 — Folga fixa
- Caixinha **Folga fixa** junto das folgas de cada colaboradora: os dias de folga marcados ficam travados em todas as semanas (salva no cadastro do setor).
- Com a caixinha marcada, o gerador (Completar, Sugerir, Corrigir, trocar modelo) não muda esses dias; as caixas dos dias travados ficam desabilitadas.
- Sem a caixinha, o gerador pode trocar a folga se precisar.
- Na 5x2, quem não trabalha domingo tem só 1 folga útil (o domingo conta), então só o primeiro dia marcado trava nessa semana.

## Build 110
- A caixinha **Folga fixa** também aparece na tabela da escala, abaixo dos dias de folga de cada colaboradora (não sai na impressão).

## Build 111
- **Turno fixo** também na tabela da escala (abaixo do seletor de turno).
- Folgas travadas por **Folga fixa** (inclusive o domingo de folga) aparecem em azul-escuro, diferente do vermelho das folgas normais e do roxo das férias.

## Build 112
- Painel ADM › Histórico: corrigido o erro "null is not an object" quando se troca de aba enquanto a lista carrega.
- Zoom (pinça e toque duplo) bloqueado no aplicativo (viewport sem escala + bloqueio dos gestos no iOS).

## Build 113 — Almoço e saída automáticos
- Na aba de turnos: caixinhas **Calcular horário de almoço automático** e **Calcular saída automática**, ligadas por padrão (valem para as 4 semanas do setor).
- Almoço manual: os almoços dos outros turnos não se mexem sozinhos; a regra "sempre alguém trabalhando" continua valendo.
- Saída manual: o campo de saída fica editável (até o fechamento).
- Tolerância de 5 minutos na troca de almoços (ex.: 1º volta às 13:00, o 2º pode sair de 12:55 a 13:05).
- Ao aumentar o número de turnos, as entradas são espalhadas (sem empilhar no mesmo horário) e os nomes seguem a ordem.

## Build 114
- **Conferir ponto (AFD)**: botão no topo; lê o AFD (Portaria 1510/671) no navegador e compara com a escala do dia: atraso, falta, batida na folga/férias, almoço fora de 1h50–2h, mais de 6h sem pausa, hora extra e saída antecipada. Lista também quem bateu e não está na escala. Arquivo `afd.js`.
- **Copiar preenchimento completo**: só para as semanas seguintes, com confirmação.
- **Desfazer** (↶) no topo da página: Completar, copiar, trocar modelo/nº de turnos, caixinhas de automático, Corrigir.
- **Corrigir** também em "domingo sem posto / abaixo do mínimo".
- Conflito de folgas (Fiscal/Recepção) com folga fixa: o aviso mostra quem está com 🔒 e diz o que fazer.
- **Cadeado 🔒** ao lado do nome (turno fixo) e nas folgas (folga fixa), na tela, na impressão (folgas) e no WhatsApp (com legenda).

## Build 115
- Aba **Rodízio**: seletor "Modelo do rodízio de turnos" por setor: **semanal** (troca toda semana), **quinzenal** (semanas 1-2 iguais, 3-4 trocam) ou **mensal** (4 semanas iguais; gira ao avançar o ciclo). Vale para o rodízio dos postos e para "Aplicar rodízio"; ao avançar o ciclo no quinzenal/mensal a equipe gira de turno (turno fixo não gira).
- Aba **Regras** passou a ser a última.

## Build 116
- Botão "Enviar por WhatsApp" escondido por enquanto (o código continua no app).
- Impressão: coluna de folgas com os 7 dias da semana (como na tela): folga em vermelho, domingo de folga em vermelho, domingo trabalhado em amarelo, férias/atestado em roxo. A página do domingo também mostra as folgas.
- Atualização automática: verifica a cada 1 min e atualiza sozinha a aba parada há 30 s sem nada por salvar (antes 2 min).

## Build 117 – Cidade/CCT por conta e importação do AFD na escala
- **Painel ADM:** campo **Cidade** por usuário/conta (Araruna, São Pedro do Ivaí, Peabiru, Campo Mourão, Engenheiro Beltrão, Terra Boa). Coluna `perfis.cidade`; edge function `admin-usuarios` v8 valida e grava. A cidade aparece ao lado do nome (📍). Araruna, Peabiru, Campo Mourão e Engenheiro Beltrão: base do Sindiempresarial de Campo Mourão e Região. **Terra Boa e São Pedro do Ivaí: "CCT a confirmar"** (por enquanto valem as regras de Campo Mourão; a CLT do 5x2 continua inalterável).
- **Importar planilha / AFD…:** aceita também o arquivo AFD (.txt/.afd). Para quem já está na equipe do setor aberto: ajusta turno (pela entrada típica; respeita turno fixo), domingo trabalhado e folgas (dia com movimento sem batida, respeitando folga fixa, férias e limite de folgas). Confirma antes, dá para **Desfazer**, e lista quem não é do setor.
- **Histórico do ponto:** botão novo; guarda primeira/última batida por dia (até 90 dias) no próprio setor.
- Testes: `afd-importar-escala.js`, `cidade-cct.js`.

## Build 118
- **Todos os setores (visão geral):** nova opção no seletor de setor. Mostra, por setor, a escala da semana escolhida (turno, horário, folgas com 🔒), pendências (erros/atenção) e a análise individual do ciclo. "Abrir setor" troca o setor ativo.
- **Tolerância de 15 min no fechamento:** a jornada pode terminar até 15 min depois do fechamento (ex.: fechamento 19h30 → entrada até 9h21 e saída até 19h45 sem erro). A geração automática continua mirando o fechamento exato; a carga da CLT não diminui.
- **Equipe:** o card de colaboradores ativos mostra quantas são de cada posto (operadora, pacote, fiscal, recepção) e ficou maior.
- **Turnos:** "Retorno automático (+2h)" e a nota de "+2h de almoço" só aparecem com "Calcular horário de almoço automático" ligado; a nota da saída só com "Calcular saída automática" ligado.
- **Rodízio:** modelo do rodízio em cima e rodízio de turnos dos postos embaixo, em largura total.
- **Impressão:** legenda "🔒 = folga fixa ou turno fixo" quando houver.
- Feriados municipais: pesquisados, aguardando confirmação do usuário antes de aplicar.
- Testes: `tolerancia-fechamento.js`, `visao-geral.js`.

## Build 119
- **Resumo por colaboradora no celular:** em vez da tabela larga, um cartão por colaboradora (rótulo à esquerda, valor à direita; vermelho nos problemas).
- **Corrigir nos alertas de Conformidade:** agora também nos alertas de almoço (fora da jornada / mais de 6h seguidas), de estudante/mãe escalada após 18h (move para o turno mais cedo) e de horário do domingo (ajusta ao limite ou refaz o padrão). Todos com Desfazer.
- Teste: `corrigir-restritas-domingo.js`.

## Build 120 – Semanas realizadas (AFD)
- Ao importar o AFD, o app guarda por data (`sector.realizado`) o que o ponto mostrou de cada pessoa da equipe: turno, domingo trabalhado e folgas reais.
- As semanas cobertas pelo ponto viram **realizadas** (🔒 no título e na aba da semana) e mostram o que aconteceu. O plano anterior fica guardado (`planoAntes`) e volta se a data deixar de ter dado.
- **Domingo de referência:** ao mudar a data, o plano de cada ciclo é guardado (`sector.planos`, até 8) e a escala daquele ciclo volta ao retornar; semanas com ponto mostram o realizado. Sem nenhum dado de ponto, o comportamento é o de antes (só muda as datas).
- Editar semana realizada pede confirmação (e libera só aquela semana).
- Rodízio de domingo: quem trabalhou o domingo anterior (pelo ponto) não repete.
- Testes: `afd-realizado-semanas.js`.

## Build 121
- Corrige: semanas futuras copiadas (Copiar/Gerar) apareciam como "realizadas". A marca agora é calculada pelo ponto guardado daquela data, não herdada.

## Build 122
- **Domingo por posto:** com postos que têm mínimo de domingo (ex.: Padaria, Produção = 1), "Copiar preenchimento" não completa mais até 40% da equipe com gente de qualquer posto. O total de domingo é a soma dos mínimos dos postos, e a vaga roda entre as pessoas do posto ao longo do ciclo (4 pessoas, 1 vaga → uma por semana). Sem mínimo de postos, continua o cálculo antigo.
- **Chip do domingo na coluna de folgas:** agora é clicável. Marcada = folga; desmarcar = trabalha (respeita as regras de domingo e recalcula as folgas); marcar de novo tira do domingo. Folga fixa continua travada.
- Testes: `domingo-vaga-por-posto.js`, `chip-domingo-folga.js`.

## Build 123 – Ordem da impressão
- Impressão e pré-visualização (escala semanal e de domingo): 1º por **posto** (todo mundo do posto junto, com faixa de título "Produção · 4 pessoas"), 2º por **horário de entrada**, depois horário de almoço e nome. Setores sem postos: só por horário.
- Teste: `impressao-ordem-postos.js`.

## Build 124 – Ciclos e semanas passadas
- **Navegação por ciclo no topo:** `◀ Ciclo 22/11 a 19/12 ▶`. ◀ abre o ciclo anterior (guardado ou por data, mostrando o realizado onde houver ponto); ▶ abre um ciclo já visto ou pergunta se quer avançar ao próximo. A data solta ficou em "Alterar a data".
- **Etiquetas nas abas das semanas:** Realizada (🔒, com ponto), Passada · sem ponto, Em andamento, Planejada. Semana futura nunca é realizada.
- **Avançar ciclo:** se alguma semana já passou sem AFD importado (e a conta já usa o ponto), o app avisa antes; cancelar permite importar o AFD.
- **Rodízio de domingo do ciclo novo:** usa o domingo realmente trabalhado (ponto) quando existe; o plano só quando não há ponto.
- Teste: `ciclo-navegacao-estados.js`.
