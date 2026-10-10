# Contexto do Projeto: Amigos do Vôlei (AVL)

## Visão Geral
O "Amigos do Vôlei" é um Web App voltado para o gerenciamento de quadras/jogos de vôlei de areia de um grupo fechado e familiar. O foco do sistema é a resenha, a usabilidade mobile (na ponta do dedo) e a agilidade na organização das partidas, tirando o peso administrativo da quadra.

## Identidade Visual e UX
- **Vibe:** Cômica, leve, com emojis e bordões de quadra ("Joga fofo", "Areia esfriou", "Pereba").
- **UI:** Estilo "Bubbly" / Botões de Fliperama (bordas grossas `border-b-8`, cantos muito arredondados `rounded-[2rem]`, cores vibrantes do Tailwind). A experiência deve ser sempre fácil para pessoas com baixo letramento digital. Sem cliques desnecessários.

## Stack Tecnológica
- **Framework:** Next.js (App Router), React.
- **Estilização:** Tailwind CSS.
- **Banco de Dados:** Supabase (PostgreSQL).

## Regras de Negócio e Mecânicas Atuais
1. **Controle de Sessão (Partida):** A lógica segue o fluxo de "Zerar a quadra". Ao terminar um jogo, a partida é ENCERRADA (vai para o Histórico / Baú de Resenhas) e uma NOVA rodada é iniciada copiando a formação anterior, permitindo trocas ágeis. 
2. **Duração e Placar:** O histórico guarda a duração exata dos confrontos (Início às Fim) e o placar final de sets ganhos.
3. **Módulo de Votação (Rating Oculto):** 
   - A habilidade dos jogadores não é pública para evitar constrangimentos, mas guia 100% dos sorteios.
   - O sorteio de times busca equalizar a média de habilidades (`skill_rating` de 1 a 10) entre o Time A e Time B.
   - As notas são geradas via votação secreta dos próprios jogadores Fixos.
   - O "Super Admin" gera links de votação (PINs únicos de uso único com validade de 24h) via WhatsApp.
   - Quem vota não avalia a si mesmo.
   - Visitantes novos entram com o peso neutro, e o Admin seleciona pontualmente quem será o "alvo" da urna naquela rodada de avaliações. 
4. **Ranking Público (Mensal):** Baseado na assiduidade e vitórias em quadra. Computa 1 ponto por set ganho e zera as estatísticas de exibição para a resenha mensal (Bug de fuso horário corrigido e cravado no UTC-03:00 Brasil).

## Registro de Atualizações
### [09/10/2026] - Sistema de Rating Oculto & Urna Eletrônica Concluídos
- **Banco de Dados (Fase 1):** Tabelas `voting_pins`, `votes`, `voting_targets` e coluna `skill_rating` (float, default 5.0) em `players`.
- **Painel do Super Admin (Fase 2):** Rota oculta `/g/[slug]/super-admin` com 3 abas:
  - *Seleção de Alvos:* Escolha de quais jogadores serão avaliados na urna.
  - *Gerador de PINs & Status:* Criação/renovação de PINs (24h) com link direto formatado para WhatsApp e status em tempo real (`VOTOU ✅` / `PENDENTE ❌`).
  - *Auditoria:* Histórico detalhado de votos computados.
- **Urna Eletrônica (Fase 3):** Rota `/g/[slug]/vote` com validação de PIN (24h/uso único), sliders interativos (1 a 10) com frases cômicas de quadra, bloqueio de autoavaliação e atualização automática da média do `skill_rating`.
- **Algoritmo de Sorteio Justo (Fase 4):** Refatoração da prancheta em `/g/[slug]/setup` para utilizar o `skill_rating` oculto na equalização da soma das habilidades entre o Time A e Time B.