# Plano AVL (unificado)

Único plano do projeto. Regras de negócio estão em `CLAUDE.md`. Este arquivo define o que fazer, em que ordem, e como verificar.

## Regras de processo
1. **Uma etapa por vez.** Cada etapa só começa depois da aprovação da anterior.
2. **Deploy só com autorização explícita do dono, a cada vez.** Nunca fazer deploy sem autorização.
3. **Banco de produção:** alterações feitas manualmente pelo dono, com cuidado. Nenhuma migração automática.
4. **Testes de escrita rodam em produção.** Testar sem jogo em andamento. Anotar o ranking antes. Listar os ids criados no teste para o dono apagar manualmente.
5. **Sem custo:** nada de branch, projeto ou recurso pago no Supabase.
6. **Nunca apagar `sessions` nem `sets`.**
7. **Git:** trabalhar em branch. Commit só quando o dono pedir.
8. **Variáveis de ambiente novas** (`.env` e Vercel) são adicionadas pelo dono, com autorização.
9. **Ao concluir uma etapa:** atualizar este arquivo (status e histórico no rodapé) e o `CLAUDE.md` se a regra mudou.
10. **Boas práticas acima de preferência:** cada decisão técnica ou de design segue o que é recomendado para o caso, e não o que agrada no momento. Se houver conflito, a recomendação é apresentada antes de executar.

## Escopo deste ciclo
Telas e fluxo (Fase 0), regras de partidas, token assinado, histórico por rodadas, Top 5 e ranking com empate (Fase A), e o visual final (Fase B).

---

## Fase 0: Telas e fluxo (mockup funcional)

Objetivo: fixar como as telas funcionam antes de implementar. Não é o visual final.

### 0.1 Mockup funcional (página HTML privada, sem código do app)
**Status: concluído e aprovado pelo dono em 22/10/2026.** Página privada: https://claude.ai/artifact/JzGtMCkre1K5vPZfqp8zyA
- **Telas:**
  - Dashboard nos três estados: sem rodada, partida ativa sem times, partida ativa com times.
  - Placar (`/game`): placar de sets, escalação completa dos dois times, botões Trocar Times e Encerrar (visíveis só para admin).
  - Prancheta (`/setup`): presentes com adicionar e tirar, times A e B, botão Abortar (admin) e botão final "BOLA PRO ALTO!".
  - Histórico: chips de filtro ("Últimas 5 rodadas", "Hoje", "7 dias", "Escolher período"), rodadas em sanfona quando houver mais de 2 partidas, cada partida com capitão, escalação, placar, data e horário.
  - Ranking: mês e geral completos, com empate (mesma posição, ordem alfabética, pula a seguinte).
  - Top 5 do mês: 5 posições, empatados nas posições 1 a 4, no máximo 3 na 5ª com "+N".
  - Aba Partida com estado vazio ("Nenhuma partida no momento" e botão Iniciar partida).
  - Barra inferior com 4 abas: Dashboard, Ranking, Partida, Histórico.
- **Visual:** paleta descontraída e esportiva, com tom de app de respeito. Contraste AA mínimo. Usar a paleta já aprovada como ponto de partida, sem fechar o sistema visual (isso é a Fase B).
- **Referência:** o mockup anterior (https://claude.ai/artifact/TmeSqYwxtLYF6XaDefq4jL) mostrou placar de pontos e omitiu partes importantes. Serve só de referência visual.
- **Entrega:** página privada. Só o dono consegue abrir, a menos que ele compartilhe.
- **Modelo sugerido:** Opus 5.5.

### 0.2 Checagem de regras contra o mockup
**Status: feita dentro do mockup (seção "Conferência"). Aguardando aprovação do dono para começar a Fase A.**
- Cada item de `CLAUDE.md` precisa aparecer no mockup ou ser marcado como "fora desta tela".
- Lista de conferência: botões por estado, Trocar e Encerrar só para admin, Abortar encerra a sessão toda, filtros do histórico, Top 5, empate, placar de sets.
- **Aprovação do dono antes da Fase A.**
- **Modelo sugerido:** Opus 5.5.

---

## Fase A: Regras e telas funcionais

### A0. Linha de base (somente leitura) ✅
**Status: concluída e aprovada em 22/10/2026.** Resultado em `plan-baseline.md`: 79 sessões, 431 sets (o plano antigo dizia 78 e 422; a diferença é a rodada de 21/10).
- Registrar: totais por jogador (mês corrente e geral) pela regra de `/api/rankings`; contagem de `sessions` (78) e `sets` (422); times de cada sessão.
- Salvar em `plan-baseline.md`. Nenhuma escrita.
- **Modelo sugerido:** Sonnet 5.5.

### A1. Token assinado pelo servidor ✅
**Status: concluída e aprovada pelo dono em 22/10/2026. Código na branch `fase-a-etapa-a1`, testado localmente. Sem commit e sem deploy. Sem commit e sem deploy.**
- **Feito no código:** `src/lib/auth.ts` (assina e confere o token com HMAC-SHA256, validade de 180 dias, sem valor padrão para o segredo); `/api/auth/pin` só admin; `/api/super-admin/auth` sem senha padrão; 8 rotas de escrita exigem admin (`players/add`, `players/update`, `sessions/start`, `sessions/end`, `sessions/update-presence`, `sessions/setup-teams`, `sets/record`, `sets/undo`); 3 rotas do Super Admin exigem super admin (`pins`, `targets`, `votes`); `players/list` só devolve `skill_rating` com token de admin; o front não conhece mais o writer e descarta tokens antigos.
- **Variável nova:** `AUTH_TOKEN_SECRET` (mínimo 16 caracteres), adicionada pelo dono no `.env` e na Vercel. Sem ela, login e rotas de ação respondem erro 500.
- **Achado:** antes da A1 nenhuma rota conferia o token. Qualquer pessoa com a URL conseguia gravar set, e a auditoria de votos (quem votou em quem) estava aberta.
- **Efeito no placar:** o botão "Abrir placar" do Dashboard passou a pedir admin (era writer). Abrir o placar para todos é da A3.
- **PIN de admin e senha do super admin** passam a gerar um token assinado com um segredo do servidor (variável nova no `.env`, nome a definir na implementação).
- **Cada rota de ação** valida a assinatura e o papel antes de agir. Rotas de leitura pública continuam abertas.
- **Senha padrão** `avl2026` removida. Se a variável do super admin faltar, o login falha.
- **Efeito:** quem já está logado precisa digitar o PIN de novo.
- **Definição de login** (como o admin entra e troca de aparelho) fica para depois, fora deste plano.
- **Modelo sugerido:** Opus 5.5 (segurança).
- **Verificação:** chamada a uma rota de ação sem token e com token forjado deve ser recusada. Com token válido, aceita.

### A2. Fluxo de partidas (servidor) ✅
**Status: concluída e aprovada pelo dono em 22/10/2026. Código na branch `fase-a-etapa-a1`, recusas testadas localmente. Sem commit, deploy ou escrita no banco. O teste de escrita completo é a A6.**
- **Feito no código:** novo `src/lib/sessions.ts` (validações comuns); nova rota `POST /api/sessions/swap` (Trocar Times); `start` nunca reaproveita a ativa (409 se já houver uma) e valida presentes; `end` só encerra partida ativa; `setup-teams` valida times (sem repetido, sem jogador nos dois times, máx. 7, todos presentes e da liga), recusa partida encerrada e partida com set já anotado, e grava times e presentes juntos; `update-presence` só na partida ativa e sem tirar quem está em time; `sets/record` só em partida ativa, com times e vencedor válido; `sets/undo` só em partida ativa; `players/update` exige booleano.
- **Telas ajustadas só para não quebrar:** o botão Trocar Times do placar chama `/api/sessions/swap`; a prancheta envia os presentes junto com os times e mostra o erro do servidor. O resto das telas é A3.
- **Decisões:** Abortar e Encerrar usam a mesma rota (`end`), pois nenhum dos dois apaga nada. O nome padrão da rodada é "Rodada · dd/mm" e o da troca é "Troca de time · dd/mm", em horário de Brasília. Sem transação no Supabase: na troca, se a nova partida falhar, a anterior é reaberta.
- **Trocar Times:** encerra a `session` ativa (`ended_at`, `status = 'ended'`) e cria outra no mesmo dia, copiando os presentes da anterior.
- **Iniciar partida:** cria nova `session` com os presentes escolhidos. Não reaproveita a ativa.
- **Encerrar:** encerra a `session` ativa e não cria outra.
- **Abortar:** encerra a `session` ativa sem gravar nada.
- **`setup-teams`:** só altera a `session` ativa. Se estiver encerrada, recusa.
- **Papel:** essas ações exigem admin (ou super admin) no servidor, com o token de A1.
- **Validação de times (`setup-teams`):** recusar jogador repetido, jogador nos dois times e mais de 7 por time. Banco de areia = presente que não está em nenhum time.
- **Nome da rodada:** `sessions/start` já grava `description`. Em Trocar Times, o padrão é "Troca de time · data".
- **Fixo/visitante:** a prancheta chama `players/update` (`is_guest`) ao tocar.
- **Desfazer set:** `sets/undo` continua apagando só o último set da partida. Exceção confirmada pelo dono à regra de nunca apagar `sets`.
- **Writer removido:** o PIN de writer deixa de existir no login, e o placar exige admin.
- **Modelo sugerido:** Opus 5.5 (regra de estado).
- **Verificação:** roteiro em produção (ver A6).

### A3. Telas funcionais (conforme o mockup aprovado em 0.1) ✅
**Status: concluída e aprovada pelo dono em 22/10/2026. Código na branch `fase-a-etapa-a1`. Barra inferior movida para `src/app/g/[slug]/layout.tsx`, para não sumir na troca de tela. Sem commit, deploy ou escrita no banco. Visual é da Fase B: as telas mantêm o estilo atual.**
- **Feito:** barra inferior de 4 abas (`src/components/BottomNav.tsx`) em Dashboard, Ranking, Partida e Histórico; Dashboard com os 3 estados, "Quadra livre 😴", "Abrir placar" para todos e Último confronto com placares lado a lado e capitão marcado; aba Partida (`/game`) com placar ao vivo e escalação para todos (atualiza sozinha a cada 8 s para quem só assiste), botões só para admin (Trocar Times e Encerrar no topo, com confirmação; Quem ganhou o set?; Desfazer último set) e estados "Nenhuma partida no momento" e "Partida sem times"; prancheta (`/setup`) em 2 passos: nome da rodada opcional, presentes numa lista só com busca, "Selecionar todos os fixos", Fixo/Visitante que grava ao toque, cadastro de visitante pela busca, depois sorteio equilibrado (máx. 6 por time), banco de areia, janela para mover jogador (máx. 7), "Sortear de novo", "BOLA PRO ALTO!" e Abortar com confirmação.
- **Mudanças de arquitetura:** `/admin` virou redirecionamento para `/setup` (presentes agora são o passo 1 da prancheta; a partida só é criada ao tocar em "Montar times"). Novos `src/lib/teams.ts` (capitão e nomes), `src/lib/draw.ts` (sorteio).
- **Capitão:** gravado como "Sem Colete (Cap: Nome completo)". Para partidas antigas, `resolveCaptainId` reconhece "Tia"/"Tia KK"/"Tia kk" como "Tia kk" e "Ti" como "Ti Lu".
- **Rating:** removido o `console.log` que mostrava as notas no navegador.
- **Fora da A3:** Top 5 agrupado (A5) e Histórico por rodadas (A4) continuam como estavam.
- **Decisão a confirmar:** no Dashboard, quem não é admin vê um botão discreto "Sou admin: iniciar rodada" para abrir o PIN, porque ainda não há outra porta de login (definição de login está no backlog).
- **Dashboard:** botão conforme o estado. Card "Último confronto" mostra a partida que acabou de terminar. Top 5 do mês.
- **Placar (`/game`):** Trocar Times e Encerrar, só admin.
- **Prancheta (`/setup`):** Abortar (admin). Botão final "BOLA PRO ALTO!". Presentes com adicionar e tirar.
- **Aba Partida:** placar ao vivo e escalação. Sem partida: estado vazio com botão Iniciar partida (admin).
- **Modelo sugerido:** Sonnet 5.5.

### A4. Histórico por rodadas ✅
**Status: concluída e aprovada pelo dono em 22/10/2026. Código na branch `fase-a-etapa-a1`. Decisão do dono: a rodada continua agrupada pelo dia do registro, e o nome (`description`) de cada partida mostra a data real.
- **Feito:** `/api/sessions/history` devolve rodadas (dia do registro em Brasília) com as partidas em ordem de horário, e aceita `filter` = `last5` (padrão), `today`, `7d` e `range` (`startDate` e `endDate`). **O período não tem limite: traz todo o histórico do banco** (hoje desde 04/03/2026), buscando página por página. Só partidas encerradas e com times; partida com times e nenhum set não entra (hoje há 0 casos). Listas sem jogador repetido. A tela tem os 4 chips, sanfona para rodada com mais de 2 partidas (mostra a quantidade), partidas abertas nas demais, placar de sets, horário, **nome da partida (`description`)**, escalação completa e capitão marcado com o nome cadastrado (Tia kk, Ti Lu).
- **Por que mostrar o `description`:** o admin registra jogos de dias diferentes no mesmo dia e anota a data real no nome (ex.: "09-10-26 sexta partida bagunçada" registrada em 11/10; "Terça 6/10/26" registrada em 08/10; "Terça dia 11" registrada em 13/08). A rodada é agrupada pela data do registro (`created_at`), que é confiável; o `description` mostra a data real em cada partida. Não interpretamos datas dentro do texto livre. Se no futuro quiserem filtrar pela data real, o caminho é uma coluna "data da partida" na `sessions`, aplicada manualmente pelo dono.
- **Verificado (leitura):** API em `localhost:3000` confere com o banco por consulta direta: outubro tem 6 rodadas e 11 partidas; "Últimas 5 rodadas" devolve 5; "Hoje" vazio (sem partida hoje); "7 dias" devolve 2; período de 01/01 a 31/12/2026 devolve 54 rodadas e 78 partidas (todas as 78 válidas do banco, ids únicos, a mais antiga em 04/03/2026, todas com `description`); paginação testada com página de 10 linhas e deu o mesmo resultado; datas inválidas e filtro desconhecido são recusados.
- Busca as `sessions` do período e agrupa por dia em Brasília, no código.
- Rodada com mais de 2 partidas abre em sanfona, com a quantidade de partidas.
- **Filtro (chips):** "Últimas 5 rodadas" (padrão), "Hoje", "7 dias" e "Escolher período" (data inicial e final, sem limite: mostra todos os confrontos do banco naquele período).
- Cada partida: capitão e escalação completa, placar de sets, data e horário.
- Rodada abortada não aparece.
- Mostra o nome da partida (`description`) em cada partida, porque o admin anota nele a data real. Ao exibir, remover jogadores repetidos dentro de cada time.
- **Capitão:** o capitão de sessões antigas só existe no texto do nome do time e com grafias diferentes. Ao exibir, normalizar para o nome cadastrado do jogador: "Tia", "Tia KK" e "Tia kk" viram sempre "Tia kk"; "Ti" vira "Ti Lu". Para jogos novos, gravar o nome exatamente como está em `players.name`.
- **Modelo sugerido:** Sonnet 5.5.

### A5. Ranking e Top 5 ✅
**Status: concluída e aprovada pelo dono em 22/10/2026. Código na branch `fase-a-etapa-a1`.
- **Feito:** novo `src/lib/ranking.ts` (`groupRanking` e `top5`). Ranking (Mês e Geral, com "Todo Mundo" e "Só Fixos") e Top 5 do Dashboard agrupam os empatados numa posição só, um jogador embaixo do outro, em ordem alfabética, com a posição seguinte pulando (1, 1, 3). Medalhas 🥇🥈🥉 e destaque (ouro, prata e bronze) nas posições 1 a 3. Top 5 mostra sempre as 5 primeiras posições; as 4 primeiras com todos os empatados e a 5ª com no máximo 3 nomes e "+N no mesmo placar". Na aba "Só Fixos" as posições são recalculadas só entre os fixos. A API `/api/rankings` não mudou: a soma dos pontos é a mesma.
- **Verificado:** pontos iguais à linha de base (mês: Ti Lu 40, Mauricio 29, Andrea 24, Matheus 23, Rita 21...; Camila e Diego empatados em 9º com 11; geral: Rita 192, Andrea 191, Ti Lu 189...). Conferência independente por SQL: 35 jogadores com ponto e 2200 pontos no geral, igual à API. Casos sintéticos: 1, 1, 3; 5ª posição com 5 empatados mostra 3 e "+2"; menos de 5 jogadores mostra só as posições existentes. Capturas de tela em tamanho de celular conferidas.
- **Achados:** o `plan-baseline.md` registrou 34 jogadores no geral, mas a API e o SQL dão 35 (os pontos do topo coincidem; provável contagem errada da linha de base). Há dois jogadores cadastrados como "Samuel" (3 e 1 ponto, ambos inativos): aparecem como dois no ranking. Não mexi nos dados.
- Empate: mesma posição, nomes em ordem alfabética, próxima posição pula (1, 1, 3). Na página do ranking os empatados ficam agrupados numa posição só, um jogador embaixo do outro. Medalhas 🥇🥈🥉 e destaque nos 3 primeiros.
- **Top 5 do mês no Dashboard:** sempre mostra as posições 1 a 5, independente da quantidade de jogadores.
  - Posições 1 a 4: todos os empatados aparecem.
  - Posição 5: no máximo 3 nomes. Se houver mais, indica quantos ficaram de fora (ex.: "+2").
- Página de ranking: mês completo e geral completo.
- Só exibição. A soma dos pontos não muda.
- **Modelo sugerido:** Sonnet 5.5.

### A6. Teste em produção (com autorização a cada escrita) ✅
**Status: concluída em 22/10/2026. Teste executado com autorização do dono; 34 verificações passaram; o dono apagou os registros de teste e o banco voltou ao retrato anterior (conferido por SQL de leitura: 78 sessões, 431 sets, 38 jogadores, 0 ativas, 0 de teste; mês 19 jogadores e 264 pontos; geral 35 jogadores e 2200 pontos). Retrato anterior em `plan-a6-antes.md`: mês 19 jogadores e 264 pontos; geral 35 jogadores e 2200 pontos. Banco antes: 78 sessões, 0 ativas, 431 sets, 38 jogadores. Depois do teste: 80, 0, 434, 42.**
- **Roteiro planejado (só com jogadores de teste, para o ranking real não mudar):** 1) criar 4 jogadores "TESTE A6 1..4" (visitantes); 2) iniciar partida A (nome "TESTE A6"); 3) recusar iniciar outra (esperado 409); 4) ajustar presentes; 5) montar times 2x2; 6) anotar 3 sets e desfazer o último; 7) recusar mudar times com set anotado (409); 8) Trocar Times (cria a partida B); 9) montar times de novo e anotar 1 set; 10) encerrar B; 11) recusar anotar set na partida encerrada (409); 12) conferir histórico, Dashboard (Último confronto) e ranking.
- **Registros criados:** 4 `players`, 2 `sessions` e 3 `sets` (2 na partida A depois do desfazer, 1 na B). Ids serão listados ao final, com o SQL de limpeza para o dono aplicar.
- **Resultado:** aprovadas as 34 verificações, entre elas: iniciar com partida ativa = 409; presentes repetidos = 400; jogador nos dois times = 400; mudar times com set anotado = 409; desfazer apagou só o último set; Trocar Times encerrou A e criou B com os mesmos presentes e nome "Troca de time · 22/10"; B encerrada recusou set, encerrar e desfazer (409); histórico "hoje" trouxe A (1x1) e B (0x1); ranking real do mês idêntico ao de antes (pontos só dos jogadores de teste). Banco conferido por SQL de leitura. Ids e SQL de limpeza em `plan-a6-limpeza.md`.
- **Não testado em produção:** a tela (cliques) e o PIN de admin digitado; `players/update` (mudar fixo/visitante). Ficam para o teste do dono pela interface.
- **Atenção:** enquanto não forem apagados, os registros de teste aparecem para quem usa o app (Último confronto, histórico e ranking).
1. Escolher horário sem jogo.
2. Anotar ranking do mês e geral (saída de A0).
3. Rodar o roteiro: iniciar, marcar sets, trocar times, adicionar e tirar pessoas, encerrar, conferir histórico e ranking.
4. Registrar os ids criados (sessions e sets).
5. Dono apaga manualmente os ids de teste.
6. Comparar o ranking com o valor de A0. Diferença deve ser zero.
- **Modelo sugerido:** Opus 5.5.
- **Deploy:** nada aqui. O código só vai para produção na etapa A7, com autorização.

### A7. Deploy (com autorização)
- Só depois de A6 aprovado e de autorização explícita do dono.
- Variável nova de segredo adicionada na Vercel pelo dono, antes do deploy.
- **Rollback:** reverter o código. Não há mudança de schema nesta fase.

---

## Fase B: Visual

### B1. Tema e tokens
**Status: código pronto na branch `fase-a-etapa-a1` (22/10/2026), aguardando confirmação do dono do sistema visual. Nenhuma tela foi alterada ainda (isso é a B3).**
- **Feito:** `src/app/globals.css` com os tokens do mockup aprovado, em tema claro e escuro (`prefers-color-scheme`, com `data-theme` para forçar): fundo `bg`, `surface`, `surface2`, texto `ink`, `muted`, contorno `line`, `soft`; cores `sea` (azul-mar, Sem Colete), `vest` (laranja, Com Colete), `sun` (amarelo-sol, ação principal), `danger`, `ok`; medalhas `gold`, `silver`, `bronze`. Viram classes do Tailwind (`bg-surface`, `text-ink`, `bg-sea`, `rounded-card`, `shadow-pop`...). Fontes por `next/font`: Fredoka (títulos) e Nunito (texto). Raios 22 e 16 px, sombra de botão "fliperama" (`0 4px 0`). Foco visível e respeito a "reduzir movimento".
- **Efeito imediato nas telas atuais:** só a fonte do texto (Nunito no lugar de Arial) e a cor de fundo do corpo. As telas ainda usam as classes antigas até a B3.
- **Verificado:** `tsc` sem erros e `next build` completo, com as variáveis de fonte emitidas no CSS final.
- **A confirmar com o dono:** paleta, fontes e o tom (descontraído e esportivo, com cara de app de respeito) antes da B2.
- Paleta, tipografia e espaçamento a partir do mockup aprovado em 0.1, no Tailwind.
- Confirmar o sistema visual completo com o dono antes de aplicar.
- **Modelo sugerido:** Opus 5.5 (decisão de sistema visual).

### B2. Componentes
- Botão, Card, Chip de jogador, Modal, Toast (substitui `alert()`), Estado vazio, Barra inferior de 4 abas.
- **Modelo sugerido:** Sonnet 5.5.

### B3. Aplicar nas telas
- Ordem: Dashboard, Partida, Prancheta, Histórico, Ranking, Votação, Admin.
- Prancheta é a mais complexa: **Opus 5.5**. Demais: **Sonnet 5.5**. Ajustes repetitivos de classe: **Haiku 5.5**.

### B4. Revisão final
- Celular real e computador, contraste, foco, `aria-label`, imagens.
- **Modelo sugerido:** Opus 5.5.

---

## Backlog (fora deste ciclo, sem data)
- **Definição de login:** como o admin entra e troca de aparelho. Depende do token de A1.
- **PIN sem limite de tentativas:** PIN de 4 dígitos, sem bloqueio após erros.
- **Sorteio e `skill_rating` no servidor.** Hoje o cliente recebe as notas e mostra no console (`DEBUG_SHOW_RATINGS = true`).
- **Votação atômica:** PIN de uso único pode ser usado duas vezes em envios simultâneos.
- **RLS nas 9 tabelas do Supabase.** Como o servidor usa a service role, habilitar não quebra o app. Plano próprio, com o dono aplicando manualmente.
- **Tabelas duplicadas:** `players_duplicate` e `votes` (espelho de `votes_backup`). Não apagar sem aprovação.
- **Sessão ativa única:** checagem só no código. Índice parcial no banco seria o correto, aplicado manualmente.

---

## Decisões tomadas
- **Admin:** definido pelo PIN de admin, digitado uma vez por aparelho. Não há contas.
- **Super admin:** faz tudo que o admin faz, mais a votação. Senha própria.
- **Writer:** removido.
- **Token:** assinado pelo servidor, com segredo no `.env`. Login detalhado fica para depois.
- **Histórico:** filtros "Últimas 5 rodadas" (padrão), "Hoje", "7 dias" e "Escolher período" (sem limite: todo o histórico do banco). Cada partida mostra o `description`, onde o admin anota a data real (decisão do dono em 22/10/2026).
- **Top 5:** sempre 5 posições. Posições 1 a 4 com todos os empatados. Posição 5 com no máximo 3 nomes.
- **Setup:** botão final "BOLA PRO ALTO!".
- **Trocar Times e Iniciar partida:** criam nova `session`. Trocar copia os presentes.
- **Mockup:** paleta descontraída e esportiva, com tom de app de respeito.
- **Ordem:** telas (Fase 0) antes das regras (Fase A) e do visual (Fase B).
- **Times:** sorteio equilibrado, até 6 por time, banco de areia para quem sobra, até 7 à mão. Capitão aleatório.
- **Prancheta:** nome da rodada opcional no topo, lista única de presentes (checkbox desmarcado ao iniciar), fixo/visitante muda ao toque e grava na hora.
- **Placar:** Trocar Times e Encerrar no topo. Desfazer último set é botão principal do admin.
- **Último confronto:** sempre aberto, placares lado a lado.
- **Ranking e Top 5:** empatados agrupados numa posição só, um jogador embaixo do outro, na página do ranking e no Top 5 do Dashboard (em degraus).

---

## Histórico de alterações
- **22/10/2026 (B1, código):** tokens de tema (claro e escuro), fontes Fredoka e Nunito e utilidades do Tailwind. Telas não alteradas. `tsc` e `next build` sem erros. Dois commits locais da Fase A feitos antes (`ddff105` código e `634e168` documentos), sem push.
- **22/10/2026 (A6 concluída):** dono apagou os registros de teste. Conferência por leitura: banco idêntico ao de antes (78/431/38, 0 ativas, ranking com os mesmos totais). Servidor local (`npm run dev`) encerrado a pedido do dono. Commits locais autorizados pelo dono, sem push e sem deploy; deploy só com autorização explícita. A7 (deploy) fica depois da Fase B, por decisão do dono (o visual ainda não foi aplicado).
- **22/10/2026 (A6, teste de escrita):** com autorização do dono, rodei o roteiro pela API (token de Super Admin) no banco de produção, só com 4 jogadores de teste, 2 partidas e 3 sets. 34 verificações OK. Ranking real do mês idêntico ao de antes. Ids e SQL de limpeza em `plan-a6-limpeza.md`; dono apaga manualmente. Nada apagado por mim. Nenhum commit ou deploy.
- **22/10/2026 (A5 aprovada, ajustes no Histórico):** dono aprovou a A5. No Histórico, toda rodada passou a ser sanfona como no mockup (`<details>`: data, quantidade e seta; abre sozinha com até 2 partidas e fecha com mais), podendo abrir e fechar qualquer uma; antes só as de mais de 2 partidas tinham botão. Texto "Areia esfriou" e nota "Rodadas abortadas, sem times, não aparecem aqui." do mockup. Barra inferior subiu acima do rodapé do layout raiz, que a cobria no fim da página. Testado em navegador sem interface (abrir e fechar rodadas de 1, 2 e 5 partidas) e com capturas de tela. Samuel duplicado: dono deixa inativo e verá depois; nenhuma ação.
- **22/10/2026 (A5, código):** ranking e Top 5 com empatados agrupados (um embaixo do outro), medalhas e destaque; Top 5 em degraus com limite de 3 nomes na 5ª posição. Pontos inalterados (conferidos por SQL). `tsc` sem erros. Nenhum commit, deploy ou escrita.
- **22/10/2026 (A4 aprovada):** dono testou o histórico e aprovou. Perguntado sobre o domingo 11/10 (5 partidas, 3 com outra data no nome), escolheu manter o agrupamento pelo dia do registro. Sanfona conferida em navegador sem interface (abre e fecha, mostra as 5 partidas, nomes corretos). A coluna "data da partida" não foi adotada.
- **22/10/2026 (A4, jogadores inativos):** `players/list` passou a devolver também os inativos (`is_active`), para Histórico, Dashboard e placar mostrarem o nome certo (antes apareciam como "Jogador"). Só a prancheta esconde os inativos (inclusive os que vinham dos presentes de uma troca). O ranking já mantinha o nome deles. Verificado: nenhum id sem nome nas 78 partidas; Samuel e Maria Alice (inativos) aparecem no histórico. `tsc` sem erros. Nenhum commit, deploy ou escrita.
- **22/10/2026 (A4, ajuste pedido pelo dono):** removido o limite de 92 dias: o filtro de período mostra todo o histórico (78 partidas, 54 rodadas, desde 04/03/2026), buscando página por página. `description` passou a aparecer em cada partida, porque o dono anota a data real nele; isso substitui a decisão anterior de o histórico não mostrar o nome. Rodada continua agrupada pela data do registro. Verificado por leitura; `tsc` sem erros. Nenhum commit, deploy ou escrita.
- **22/10/2026 (A4, código):** histórico por rodadas. API com filtros e agrupamento por dia em Brasília; tela com chips, sanfona e capitão normalizado. Verificado por leitura contra o banco (rodadas e partidas de outubro batem). `tsc` sem erros. Nenhum commit, deploy ou escrita.
- **22/10/2026 (A3 aprovada):** dono aprovou a A3 e notou que a barra inferior sumia na transição de tela. Corrigido: a barra saiu das páginas e foi para o layout da liga (`src/app/g/[slug]/layout.tsx`), que não desmonta; aparece só nas 4 abas (Dashboard, Ranking, Partida, Histórico) e não na prancheta. `tsc` sem erros.
- **22/10/2026 (A3, código):** telas funcionais conforme o mockup. Nova barra inferior; Dashboard, aba Partida e prancheta reescritos; `/admin` redireciona para `/setup`; sorteio e capitão em `src/lib`; botão do placar aberto a todos (só leitura). Verificado: `tsc` sem erros; lint sem erros novos (o erro em `avlClient.tsx` já existia); teste isolado do capitão (Tia/Tia KK/Tia kk, Ti) e do sorteio (2, 5, 12 e 15 jogadores, sem repetidos); 6 rotas de tela respondem 200 no `localhost:3000`. Fluxos com gravação não foram executados (A6). Nenhum commit ou deploy.
- **22/10/2026 (A2 aprovada):** dono aprovou a A2.
- **22/10/2026 (A2, código):** fluxo de partidas no servidor. Novos `src/lib/sessions.ts` e `/api/sessions/swap`; validação de times e presentes; partidas encerradas não aceitam mais alteração; `start` não reaproveita a ativa. Botão Trocar Times e prancheta ajustados. Verificado: `tsc` sem erros; 14 pedidos de recusa em `localhost:3000` (presentes repetidos, formato inválido, jogador nos dois times, repetido no time, 8 num time, partida encerrada em setup-teams, set, desfazer, encerrar, trocar e presença, partida inexistente, sem token) deram 400, 404, 409 ou 401 como esperado. Conferido por leitura: 78 sessões, 431 sets, 0 ativas, nada gravado. Nenhum commit ou deploy.
- **22/10/2026 (A1 aprovada):** dono aprovou a A1. Chave `sb-...-auth-token` vista no navegador é de outro app em `localhost:3000`, não deste. PIN de admin confirmado no banco (`groups.admin_pin_hash`).
- **22/10/2026 (A1, teste local):** `AUTH_TOKEN_SECRET` conferido no `.env` (43 caracteres, sem aspas). Testado em `localhost:3000`: set sem token e com token forjado = 401; auditoria sem token = 401; PIN e senha errados = 401; login do Super Admin gera token e libera a auditoria; `skill_rating` some para o público e aparece com token. Nenhuma rota de escrita foi chamada. Login com o PIN de admin foi feito pelo dono na tela. Decidido não investigar as 5 sessões antigas com presentes divergentes (#53, #54, #57, #66, #70).
- **22/10/2026 (A1, código):** token assinado criado na branch `fase-a-etapa-a1`. Novo `src/lib/auth.ts`; login de admin e super admin geram token assinado; 8 rotas de escrita e 3 do Super Admin passam a exigir o papel; senha padrão `avl2026` removida; writer removido do front e do login; `skill_rating` só vai para admin; tokens antigos são descartados no navegador. Verificado: `tsc` sem erros e teste local de assinatura (válido, adulterado, base64 antigo, segredo trocado, sem segredo). Nenhum commit, deploy ou escrita no banco.
- **22/10/2026 (A0 aprovada):** dono aprovou a A0. Sessão vazia #72 já removida por ele. Decidido que o capitão aparece sempre com o nome cadastrado (Tia kk, Ti Lu), tratado na A4.
- **22/10/2026 (A0):** linha de base coletada só com `SELECT` e salva em `plan-baseline.md`: 79 sessões, 431 sets, rankings do mês e geral, times de cada sessão. Achados: sem jogador repetido hoje; 1 sessão sem times; capitão só no texto do nome do time; `present_player_ids` nem sempre bate com os times. Nenhuma escrita no banco.
- **22/10/2026:** etapa 0.1 concluída e aprovada (mockup funcional). Conferência 0.2 feita no mockup, aguardando aprovação. Novas regras de prancheta, banco de areia, nome da rodada, ranking agrupado e desfazer set registradas aqui e no `CLAUDE.md`. Nenhum código nem banco alterado.
- **21/10/2026 (4ª revisão):** plano reorganizado. Mockup funcional virou a Fase 0, antes das regras. Fase B ficou só com o visual. Adicionada a regra de boas práticas acima de preferência. Nenhuma etapa executada.
- **21/10/2026 (3ª revisão):** token assinado virou a etapa A1, antes das demais. Filtros do histórico definidos (sem histórico completo). Top 5 com as 5 posições sempre, limite de 3 só na 5ª.
- **21/10/2026 (2ª revisão):** admin definido pelo PIN, writer removido, super admin com todos os poderes de admin, botão do setup mantido.
- **21/10/2026:** plano unificado num único arquivo. Regras de negócio movidas para `CLAUDE.md`. `plan-partidas.md` removido. Nenhum código ou banco alterado.
