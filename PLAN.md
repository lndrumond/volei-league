# Plano de Ação: Sistema de Rating Oculto (Amigos do Vôlei)

## Fase 1: Atualização do Banco de Dados (Supabase)
- [x] **1.1. Tabela de PINs (`voting_pins`)**:
  - Colunas: `id`, `group_id`, `player_id`, `pin` (string única), `expires_at` (timestamp), `is_used` (boolean).
- [x] **1.2. Tabela de Votos Históricos (`votes`)**:
  - Colunas: `id`, `group_id`, `voter_id`, `target_id`, `score` (inteiro de 1 a 10), `created_at`.
- [x] **1.3. Tabela de Alvos da Votação Atual (`voting_targets`)**:
  - Colunas: `group_id`, `player_id` (Armazena quem são os jogadores que vão aparecer na tela de votação atual).
- [x] **1.4. Atualização de Jogadores (`players`)**:
  - Adicionar coluna: `skill_rating` (float, default 5.0). Será atualizada em tempo real sempre que um voto for computado.

## Fase 2: O Painel do Super Admin (Gestão)
- [x] **2.1. Rota Oculta (`/g/[slug]/super-admin`)**:
  - Tela protegida por uma senha mestra simples hardcoded ou variável de ambiente. Sem links no front-end.
- [x] **2.2. Aba 1: Selecionar Alvos (Quem será votado)**:
  - Lista de todos os jogadores (Fixos e Visitantes). Checkbox para selecionar quem vai ser avaliado na rodada. Botão para salvar a "Lista de Alvos".
- [x] **2.3. Aba 2: Gerar PINs e Acompanhar (Quem vota)**:
  - Lista apenas de Fixos. Checkbox para selecionar quem vai votar.
  - Botão "Gerar/Renovar PINs".
  - Status em tempo real: `VOTOU ✅` ou `PENDENTE ❌`.
  - Botão do WhatsApp ao lado de cada nome pendente para enviar a mensagem já com o link (`/vote?pin=ABCD`).
- [x] **2.4. Aba 3: Auditoria (Espiar Votos)**:
  - Visualização de quem votou em quem e quais foram as notas (histórico de votos).

## Fase 3: A Urna Eletrônica (Interface de Votação)
- [x] **3.1. Rota de Votação (`/g/[slug]/vote`)**:
  - Lê o PIN da URL. Valida no banco se existe, não expirou (24h) e não foi usado.
  - Saudação personalizada: "Bem-vindo, [Nome do Votante]!".
- [x] **3.2. Interface do Formulário**:
  - Busca os jogadores definidos na tabela `voting_targets` (removendo o próprio votante da lista).
  - Controle Deslizante (Slider) de 1 a 10 para cada jogador alvo.
  - Textos dinâmicos por faixa de nota (1-2: Joga fofo 🧸, 5-6: Tá na média 📊, 10: Estrela do Vôlei ⭐).
- [x] **3.3. Submissão e Cálculo**:
  - Salva os votos na tabela `votes`.
  - Queima o PIN (`is_used = true`).
  - Recalcula e atualiza o `skill_rating` (média aritmética de todos os votos válidos históricos) de cada alvo votado em tempo real.

## Fase 4: O Algoritmo de Sorteio Justo (Prancheta)
- [x] **4.1. Refatorar Sorteio (`setup/page.tsx`)**:
  - Remover a lógica baseada nos pontos de set ganhos do mês.
  - Puxar o `skill_rating` oculto de cada jogador selecionado para a partida.
  - Calcular combinações de times para encontrar a formação onde a diferença da SOMA das notas (Time A vs Time B) seja a mais próxima de zero.