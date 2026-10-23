# Contexto do Projeto: Amigos do Vôlei (AVL)

## Visão Geral
O "Amigos do Vôlei" é um Web App voltado para o gerenciamento de quadras/jogos de vôlei de areia de um grupo fechado e familiar. O foco do sistema é a resenha, a usabilidade mobile (na ponta do dedo) e a agilidade na organização das partidas, tirando o peso administrativo da quadra.

**Nomes:** o app se chama "Amigos do Vôlei League" (nome de trabalho, a bola é a logo temporária). O grupo se chama "Amigos do Vôlei" (AVL) e é o único que usa o mascote Yoshi com a bola.

## Identidade Visual e UX
- **Vibe:** Cômica, leve, com emojis com moderação e bordões de quadra ("Joga fofo", "Areia esfriou", "Pereba"). Humor de vôlei de praia, sem exagero.
- **UI:** Estilo "Bubbly" / Botões de Fliperama (bordas grossas, cantos muito arredondados, cores vibrantes). Em redesenho: paleta descontraída e esportiva, com tom de app de respeito (ver `plan.md`).
- **Usuários:** pessoas com pouca familiaridade digital. Mínimo de cliques, botões grandes, ação principal clara por tela.
- **Uso:** celular para todos; computador só para o admin.

## Stack Tecnológica
- **Framework:** Next.js 16 (App Router), React 19.
- **Estilização:** Tailwind CSS.
- **Banco de Dados:** Supabase (PostgreSQL). Projeto "App".
- **Deploy:** Vercel. Preview e produção usam o banco de produção.

## Papéis de Acesso
- **Admin (PIN admin):** inicia rodada e partida, troca times, encerra, aborta, ajusta presentes e registra sets. Quem digita o PIN de admin uma vez no aparelho fica como admin nele.
- **Super Admin (senha própria):** faz tudo que o admin faz, e mais a votação (alvos, PINs e auditoria).
- **Viewer:** sem PIN. Vê o Dashboard, o placar ao vivo, o ranking e o histórico.
- **Writer:** removido. Não existe mais esse papel.
- Não há contas de usuário. A identidade é o PIN ou a senha.

## Regras de Negócio Confirmadas pelo Dono
- **O app não registra pontos do set.** Quem anota é o admin, e só registra quem venceu o set. Os pontos (ex.: 15 por set) são contados na quadra, fora do app.
- **Placar da partida = sets ganhos** por time (ex.: 2 x 1). Nunca pontos.
- **Ranking individual:** cada set ganho dá +1 ponto para cada jogador do time vencedor. Não há assiduidade no cálculo. É o único ranking do app.
- **Rodada = o dia** (horário de Brasília), pela data em que começou. Pode ter 1 ou mais partidas. Se não houver trocas, é uma partida só.
- **Partida = um confronto entre dois times**, com seus sets. Cada partida é uma linha em `sessions`.
- **Set** = vitória de um time, ligada à partida em `sets`.
- **Nomes padrão dos times no código:** "Sem Colete" (campeão) e "Com Colete" (desafiante).
- **Montagem dos times:** o sorteio equilibra pelo `skill_rating` e coloca no máximo 6 por time. Quem sobra vai para o "banco de areia" (presente, mas fora dos times). À mão, cada time aceita até 7. O capitão é um jogador aleatório do time. Ninguém pode estar em dois times nem repetido.
- **Jogadores inativos** (`is_active = false`): mantêm o nome no histórico, no placar e no ranking; só somem da prancheta.
- **Nome da rodada:** campo opcional na prancheta (`sessions.description`). Em branco, vira "Rodada · data" ou, em Trocar Times, "Troca de time · data". Aparece no placar e no histórico (o admin anota nele a data real quando registra um jogo depois).
- **Fixo ou visitante:** o admin muda na prancheta e grava na hora em `players.is_guest`.
- **Desfazer set:** o admin desfaz o último set da partida (apaga a linha). É a única exceção à regra de nunca apagar `sets`.

## Fluxo de Telas e Botões
- **Sem rodada no dia / nenhuma partida ativa:** Dashboard mostra "Iniciar rodada" (admin) → presentes (`/admin`) → times (`/setup`) → placar (`/game`).
- **Partida ativa sem times:** Dashboard mostra "Configurar times" → `/setup`.
- **Partida ativa com times:** Dashboard mostra "Abrir placar" → `/game`.
- **No placar (`/game`):**
  - *Trocar Times* (admin): encerra a partida atual com os sets já ganhos e leva ao `/setup` com os presentes da partida anterior. Dá para adicionar visitantes ou fixos e tirar pessoas da lista de presentes. Ao confirmar, a nova partida começa com placar zerado e abre o placar.
  - *Encerrar* (admin): encerra a partida atual e a rodada, e volta ao Dashboard.
  - *Trocar Times* e *Encerrar* ficam no topo do placar. *Desfazer último set* (admin) fica junto dos botões de set.
- **No `/setup`:** *Abortar* (admin) encerra a sessão inteira, sem gravar nada. Para trocar de time, usar Trocar Times.
  - Nome da rodada (opcional) no topo. Presentes numa lista só, com "Selecionar todos os fixos", busca e cadastro de visitante novo. Os checkboxes vêm sempre desmarcados; só Trocar Times traz os presentes da partida anterior.
  - "Montar times" já sorteia. Tocar num jogador abre uma janela para passar ao outro time ou mandar ao banco de areia, com setas apontando o destino. Os jogadores têm a cor do time (azul-mar: Sem Colete; laranja: Com Colete). O banco fica no topo da lista de times.
- **Aba "Partida" da barra inferior:** mostra placar ao vivo e escalação. Se não houver partida, mostra "Nenhuma partida no momento" e o botão Iniciar partida (admin).
- **Card "Último confronto"** no Dashboard: a última partida encerrada (com times e pelo menos um set). Sempre aberto, com os placares lado a lado e a escalação completa, capitão marcado. Continua no Dashboard mesmo com uma partida em andamento.
- **Dashboard sem rodada:** "Quadra livre 😴" e o botão Iniciar rodada (admin).

## Menu da Votação
- Quem entrou com o PIN de admin vê uma 5ª aba, **Votação**, na barra inferior. Ela aparece apagada, com um cadeado 🔒 no meio. Ao tocar, abre `/g/[slug]/super-admin`, que pede a chave mestra (senha do Super Admin). Depois de digitada, o cadeado some e o ícone fica normal (vale naquela sessão do navegador). Visitantes veem só as 4 abas.

## Barra Inferior (estilo Clash Royale)
4 abas fixas no celular: **Dashboard**, **Ranking**, **Partida**, **Histórico**. Para o admin entra a 5ª, **Votação** (ver acima).

## Ranking
- **Mês** (UTC-3, horário de Brasília) e **Geral**, sempre completos na página de ranking.
- **Empate:** mesma posição. Os empatados ficam agrupados numa posição só, um jogador embaixo do outro, em ordem alfabética. A posição seguinte pula (1, 1, 3).
- **Medalhas:** 🥇🥈🥉 nas posições 1, 2 e 3, com destaque nos 3 primeiros, no Top 5 e no ranking Mês e Geral.
- **Top 5 do Mês no Dashboard** é obrigatório: mostra as posições 1 a 5, com os empatados de cada posição, em ordem alfabética. Inclui fixos e visitantes. Sempre mostra as 5 posições. As posições 1 a 4 mostram todos os empatados. A 5ª mostra no máximo 3, com indicação de quantos ficaram de fora.
- Sem filtro de fixos e visitantes: o ranking mostra todo mundo (visitante com etiqueta). O filtro "Só Fixos" foi removido.
- **Abas do Ranking** (chips com emoji): **📅 Mês atual**, **♾️ Todos os tempos** (o antigo "Geral") e **🏆 Mural dos Campeões**. O mural só é buscado quando a aba é aberta.
- **Mural dos Campeões:** um campeão por mês já encerrado, do mais recente ao mais antigo (hoje mostra todos; se crescer demais, limita e usa "Ver todos"). Empate no 1º lugar: todos os empatados são campeões, em ordem alfabética. Mês sem jogo não aparece; o mês atual ainda não tem campeão. Tocar num mês abre o ranking completo dele, com o botão "← Voltar ao mural". O botão "Mural" do card do Dashboard abre direto esta aba (`?aba=mural`).
- **Campeão do mês passado no Dashboard:** card de honraria dourado acima do Top 5, já no dia 1º do mês (Brasília). O título do Top 5 traz o nome do mês ("Top 5 de outubro").
- **Mês = horário de Brasília** (dia 1 às 00:00, UTC-3). Não existe "reset": o mês muda sozinho porque é só um filtro por data. O mês de cada ponto é o da data do **set**: jogo lançado depois conta no mês do registro. O mural é calculado na hora (sem tabela), então corrige sozinho.

## Histórico (`/g/[slug]/history`, "Baú de Resenhas")
- Lista rodadas (o dia). Cada rodada com 2 partidas ou menos mostra as partidas abertas.
- Rodada com mais de 2 partidas abre em sanfona, mostrando a quantidade de partidas.
- Filtros (chips): "Últimas 5 rodadas" (padrão), "Hoje", "7 dias" e "Escolher período" (data inicial e final). O período escolhido não tem limite: mostra todos os confrontos do banco.
- Cada partida mostra: capitão e escalação completa dos dois times, placar de sets, data e horário.
- Rodada abortada (sem times) não aparece.

## Módulo de Votação (Rating Oculto)
- A habilidade dos jogadores não é pública para evitar constrangimentos, mas guia 100% dos sorteios.
- O sorteio de times busca equalizar a média de habilidades (`skill_rating` de 1 a 10) entre o Time A e Time B.
- As notas são geradas via votação secreta dos próprios jogadores Fixos.
- O Super Admin gera links de votação (PINs únicos de uso único, validade de 24h) via WhatsApp.
- Quem vota não avalia a si mesmo.
- Visitantes novos entram com o peso neutro. O Super Admin seleciona quem será o "alvo" da urna em cada rodada de avaliação.

## Modelo de Dados (sem tabelas novas)
- `sessions` = partida. Guarda `present_player_ids`, `champion_player_ids`, `challenger_player_ids`, nomes dos times, `created_at`, `ended_at`, `status` (`active` / `ended`).
- `sets` = vitórias. `winner` é `champion` ou `challenger` (constraint no banco). Ligado a `sessions.id`.
- `players` = cadastro. `is_guest` marca visitante. `skill_rating` é o rating oculto.
- Rodada não é tabela. É o agrupamento de `sessions` pela data de `created_at` em Brasília.
- Trocar Times não cria tabela nova: encerra a `session` atual e cria outra no mesmo dia.
- **Nunca apagar `sessions` nem `sets`.** Eles guardam o histórico e os pontos.
- Tabela `votes_backup` guarda os votos de uma votação anterior, salva de propósito antes de zerar a votação. Não apagar.

## Regras de Código (implementadas na branch `fase-a-etapa-a1`, ainda sem deploy)
- `setup-teams` só altera a `session` ativa. Se ela já estiver encerrada, recusa.
- Trocar Times e Iniciar partida criam uma nova `session`. Não reaproveitam a ativa.
- Abortar encerra a `session` ativa sem gravar nada.

## Processo de Trabalho (obrigatório)
- **Deploy:** só com autorização explícita do dono, em cada vez. Nunca fazer deploy sem autorização.
- **Banco de produção:** alterações feitas manualmente pelo dono, com cuidado. Nunca criar branch, projeto ou recurso pago no Supabase.
- **Testes de escrita** rodam em produção. Testar sem jogo em andamento, anotar o ranking antes, e listar os ids criados para o dono apagar manualmente.
- **Git:** trabalhar em branch. Commit só quando o dono pedir.
- **Planos:** um arquivo só, `plan.md`, com histórico de alterações no rodapé. Atualizar a cada etapa concluída.
- **Etapas sequenciais:** uma por vez, só começa depois da aprovação da anterior.

## Pendências Conhecidas
- **Writer:** removido do produto, do login e do front (A1). A coluna `writer_pin_hash` continua no banco, sem uso.
- **RLS desligado em 9 tabelas** no Supabase. O servidor usa a service role, que ignora RLS. Habilitar RLS sem políticas não quebra o servidor, mas bloqueia o acesso com a chave anon. Plano separado.
- **Autenticação:** token assinado pelo servidor (HMAC, segredo `AUTH_TOKEN_SECRET`), implementado na branch `fase-a-etapa-a1` e ainda sem deploy (etapa A1 do `plan.md`). As rotas de escrita exigem admin; as do Super Admin exigem super admin. Sem senha padrão. PIN sem limite de tentativas: backlog.
- **Mockup funcional (etapa 0.1):** refeito e aprovado em 22/10/2026. Página privada: https://claude.ai/artifact/JzGtMCkre1K5vPZfqp8zyA (o mockup antigo, com placar de pontos, está descartado).
- **Validação de times no servidor:** `setup-teams` hoje grava as listas sem checar. Falta recusar jogador repetido ou em dois times, e passar de 7 por time (etapa A2).

## Registro de Atualizações
### [22/10/2026] - Fase B3.5 (Mural dos Campeões)
- `/api/rankings?month=AAAA-MM` e `/api/rankings/champions`; mural no Ranking, honraria do mês passado e título do mês no Dashboard; filtro Só Fixos removido. Meses em Brasília (`src/lib/brMonth.ts`, `src/lib/monthlyPoints.ts`). Sem tabela nova. Sem deploy.

### [22/10/2026] - Fase B3 (telas no novo visual)
- Dashboard, Partida, Prancheta, Histórico, Ranking, Votação e Super Admin usam os componentes e tokens da Fase B. Avisos (`useToast`) no lugar de `alert()`. Rodapé global removido (o crédito ficou no fim do Dashboard). Sem deploy.

### [22/10/2026] - Fase B2 (componentes)
- Componentes em `src/components/ui` (botão, cartão, chips, janela, aviso no lugar do `alert()`, estado vazio) e barra inferior com ícones SVG. Vitrine `/estilo` só em desenvolvimento. Fontes hospedadas em `src/app/fonts`. Telas migradas na B3. Sem deploy.

### [22/10/2026] - Fase B1 (tema e tokens)
- Tokens de cor (claro e escuro), fontes Fredoka e Nunito e utilidades do Tailwind em `src/app/globals.css` e `src/app/layout.tsx`. Telas ainda não migradas (B3). Sem deploy.

### [22/10/2026] - Etapa A6 (teste em produção)
- Roteiro de escrita rodado com jogadores de teste ("TESTE A6"); 34 verificações OK. Registros de teste a apagar pelo dono: ver `plan-a6-limpeza.md`.

### [22/10/2026] - Etapa A5 (ranking e Top 5) no código
- Empatados agrupados numa posição só, um jogador embaixo do outro, em ordem alfabética. Top 5 em degraus (5 posições, a 5ª com até 3 nomes e "+N"). Medalhas e destaque nos 3 primeiros. Pontos não mudaram. Sem deploy.

### [22/10/2026] - Etapa A4 (histórico por rodadas) no código
- `/api/sessions/history` agrupa por dia em Brasília e aceita os filtros Últimas 5 rodadas, Hoje, 7 dias e período sem limite (todo o histórico). Mostra o `description` de cada partida. Partida sem set não aparece. Tela com sanfona para rodada com mais de 2 partidas. Sem deploy.

### [22/10/2026] - Etapa A3 (telas funcionais) no código
- Barra inferior de 4 abas. Dashboard com 3 estados e Último confronto lado a lado. Aba Partida aberta a todos (só leitura para não-admin). Prancheta em 2 passos com sorteio, banco de areia e janela de mover jogador. `/admin` redireciona para `/setup`. Capitão gravado com o nome completo do jogador. Sem deploy.

### [22/10/2026] - Etapa A2 (fluxo de partidas) no código
- Nova rota `/api/sessions/swap` (Trocar Times). `start` não reaproveita a partida ativa. `setup-teams` valida os times (sem repetido, sem jogador nos dois times, máximo 7) e só aceita partida ativa sem set anotado. Partidas encerradas não aceitam mais set, desfazer, presença nem times. Sem deploy.

### [22/10/2026] - Etapa A1 (token assinado) no código
- Novo `src/lib/auth.ts`. Login de admin e super admin geram token assinado; rotas de escrita e do Super Admin conferem o papel; `avl2026` removida; writer removido; `skill_rating` só para admin. Variável nova: `AUTH_TOKEN_SECRET`. Sem deploy.
- Capitão: no Histórico aparece sempre o nome cadastrado (Tia kk, Ti Lu), mesmo que o texto antigo do time esteja diferente (etapa A4).

### [09/10/2026] - Sistema de Rating Oculto & Urna Eletrônica Concluídos
- **Banco de Dados (Fase 1):** Tabelas `voting_pins`, `votes`, `voting_targets` e coluna `skill_rating` (float, default 5.0) em `players`.
- **Painel do Super Admin (Fase 2):** Rota oculta `/g/[slug]/super-admin` com 3 abas:
  - *Seleção de Alvos:* Escolha de quais jogadores serão avaliados na urna.
  - *Gerador de PINs & Status:* Criação/renovação de PINs (24h) com link direto formatado para WhatsApp e status em tempo real (`VOTOU ✅` / `PENDENTE ❌`).
  - *Auditoria:* Histórico detalhado de votos computados.
- **Urna Eletrônica (Fase 3):** Rota `/g/[slug]/vote` com validação de PIN (24h/uso único), sliders interativos (1 a 10) com frases cômicas de quadra, bloqueio de autoavaliação e atualização automática da média do `skill_rating`.
- **Algoritmo de Sorteio Justo (Fase 4):** Refatoração da prancheta em `/g/[slug]/setup` para utilizar o `skill_rating` oculto na equalização da soma das habilidades entre o Time A e Time B.
