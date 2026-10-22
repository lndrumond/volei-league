# Linha de base (etapa A0)

Coletada em **22/10/2026**, somente leitura (apenas `SELECT` no projeto "App" do Supabase). Nada foi escrito.

Serve para comparar o ranking e as contagens depois do teste de escrita (etapa A6). Depois do teste, a diferença deve ser zero.

## Como foi calculado
Mesma regra de `/api/rankings`: cada set ganho dá +1 ponto para cada jogador do time vencedor da sessão. Para o mês, só entram sets com `created_at` a partir de **01/10/2026 00:00 (-03:00)**. Só entram jogadores com pelo menos 1 ponto. Empate: mesma posição, a seguinte pula.

## Totais
| Item | Valor |
|---|---|
| `sessions` | **79** (todas `ended`, nenhuma `active`) |
| `sets` | **431** |
| `players` | 38 (13 fixos, 25 visitantes) |
| Grupos | 1 (`amigos-do-volei`) |
| Última sessão | 21/10/2026 18:02 |

O plano antigo falava em 78 sessões e 422 sets. A diferença (+1 sessão, +9 sets) é a rodada de 21/10 ("Rodada Quarta Maguti"), que aconteceu depois. A soma dos sets por sessão (tabela abaixo) fecha em 431.

Não há partida ativa, então o banco está livre para o teste de A6.

## Ranking do mês (out/2026)
| Pos | Jogador | Pontos |
|---|---|---|
| 1 | Ti Lu | 40 |
| 2 | Mauricio | 29 |
| 3 | Andrea | 24 |
| 4 | Matheus | 23 |
| 5 | Rita | 21 |
| 6 | Leo | 20 |
| 7 | Cristiane | 17 |
| 8 | Santuzzi | 16 |
| 9 | Camila | 11 |
| 9 | Diego | 11 |
| 11 | Duda | 10 |
| 11 | Marcelo (visitante) | 10 |
| 13 | Licinha (visitante) | 9 |
| 14 | Ralf (visitante) | 6 |
| 15 | Cibelly (visitante) | 5 |
| 16 | Ikaro (visitante) | 4 |
| 17 | Keiller (visitante) | 3 |
| 17 | Lara (visitante) | 3 |
| 19 | Bela (visitante) | 2 |

## Ranking geral
| Pos | Jogador | Pontos |
|---|---|---|
| 1 | Rita | 192 |
| 2 | Andrea | 191 |
| 3 | Ti Lu | 189 |
| 4 | Mauricio | 181 |
| 5 | Leo | 173 |
| 6 | Tia kk | 163 |
| 7 | Cristiane | 161 |
| 8 | Diego | 154 |
| 9 | Duda | 144 |
| 10 | Matheus | 126 |
| 11 | Camila | 101 |
| 12 | Santuzzi | 65 |
| 13 | Adrielly | 48 |
| 14 | Marcos (visitante) | 47 |
| 15 | Licinha (visitante) | 40 |
| 16 | Rivinha (visitante) | 39 |
| 17 | Bela (visitante) | 27 |
| 18 | Ralf (visitante) | 23 |
| 19 | Igor (visitante) | 19 |
| 20 | Adriane (visitante) | 18 |
| 21 | Kaua (visitante) | 15 |
| 22 | Bruna (visitante) | 13 |
| 23 | Marcelo (visitante) | 12 |
| 23 | Maria luiza (visitante) | 12 |
| 25 | Bruno (visitante) | 11 |
| 26 | Mailla (visitante) | 8 |
| 27 | Cibelly (visitante) | 5 |
| 27 | Maria Alice (visitante) | 5 |
| 29 | Ikaro (visitante) | 4 |
| 29 | Samuel (visitante) | 4 |
| 31 | Junio (visitante) | 3 |
| 31 | Keiller (visitante) | 3 |
| 31 | Lara (visitante) | 3 |
| 34 | Caio (visitante) | 1 |

## Sessões (79)
Colunas: `id` (8 primeiros caracteres), dia e hora em Brasília, capitães (campeão / desafiante, lidos do nome do time), tamanho dos times, presentes, sets ganhos (campeão-desafiante).

| # | id | Dia | Hora | Capitães | Times | Pres. | Sets |
|---|---|---|---|---|---|---|---|
| 1 | 0bc25577 | 04/03 | 20:44 | Tia kk / Kaua | 5×5 | 10 | 2-6 |
| 2 | 8dc2ba41 | 07/03 | 20:39 | Diego / Mauricio | 4×5 | 9 | 2-0 |
| 3 | 0258edd3 | 07/03 | 20:40 | Tia kk / Cristiane | 4×5 | 9 | 5-2 |
| 4 | 603ecbb3 | 11/03 | 14:38 | Diego / Tia KK | 4×5 | 9 | 0-5 |
| 5 | 368617d9 | 14/03 | 18:20 | Tia / Leo | 6×5 | 11 | 0-3 |
| 6 | 3694c43e | 14/03 | 18:52 | Leo / Tia kk | 5×6 | 11 | 2-0 |
| 7 | e3bdff5c | 14/03 | 19:18 | Mauricio / Tia kk | 5×5 | 10 | 1-3 |
| 8 | e5de5b69 | 17/03 | 10:12 | Andrea / Kaua | 5×6 | 11 | 3-6 |
| 9 | 1f40dc3c | 17/03 | 22:01 | Andrea / Ti | 5×5 | 10 | 2-1 |
| 10 | 5594d467 | 21/03 | 21:05 | Cristiane / Tia | 6×6 | 12 | 0-1 |
| 11 | ac2d6171 | 21/03 | 21:37 | Cristiane / Leo | 7×7 | 14 | 2-3 |
| 12 | 37e43500 | 21/03 | 22:36 | Rita / Marcos | 7×7 | 14 | 2-0 |
| 13 | 139dda53 | 24/03 | 15:06 | Andrea / Diego | 5×4 | 9 | 4-5 |
| 14 | d0b9aa7a | 28/03 | 17:48 | Tia / Leo | 5×5 | 10 | 3-7 |
| 15 | a915b903 | 31/03 | 20:20 | Leo / Diego | 5×5 | 10 | 3-2 |
| 16 | 7513518f | 03/04 | 19:00 | Cristiane / Andrea | 5×5 | 10 | 1-0 |
| 17 | 6d9a9057 | 03/04 | 19:17 | Duda / Rita | 6×6 | 12 | 4-8 |
| 18 | 892e2470 | 04/04 | 18:48 | Diego / Marcos | 6×6 | 12 | 3-4 |
| 19 | 908c046b | 07/04 | 19:27 | Andrea / Rita | 5×6 | 11 | 2-6 |
| 20 | 44ee9927 | 14/04 | 20:13 | Mauricio / Rita | 6×6 | 12 | 3-3 |
| 21 | 94d707a6 | 18/04 | 18:08 | Cristiane / Rita | 5×5 | 10 | 1-5 |
| 22 | 655d1aba | 18/04 | 19:26 | Rita / Marcos | 4×4 | 8 | 2-1 |
| 23 | 69b6a80e | 21/04 | 20:02 | Cristiane / Diego | 6×6 | 12 | 0-1 |
| 24 | 76c24d44 | 21/04 | 20:20 | Bruna / Adrielly | 6×6 | 12 | 0-1 |
| 25 | 25566f01 | 21/04 | 20:38 | Samuel / Ti | 7×7 | 14 | 3-3 |
| 26 | 8564f741 | 25/04 | 18:18 | Cristiane / Marcos | 6×6 | 12 | 2-9 |
| 27 | 3f59d111 | 12/05 | 19:40 | Diego / Andrea | 5×4 | 9 | 4-5 |
| 28 | 2759fcae | 16/05 | 18:15 | Andrea / Ti | 5×5 | 10 | 4-1 |
| 29 | 82d6e17d | 19/05 | 20:04 | Andrea / Duda | 5×5 | 10 | 3-3 |
| 30 | 4749b6a2 | 30/05 | 22:23 | Andrea / Cristiane | 5×6 | 11 | 6-2 |
| 31 | 395f5c77 | 30/05 | 22:26 | Andrea / Cristiane | 5×6 | 11 | 1-1 |
| 32 | 6f8902c1 | 03/06 | 23:20 | Andrea / Mauricio | 5×5 | 10 | 2-2 |
| 33 | daadcb23 | 13/06 | 22:07 | Andrea / Cristiane | 5×4 | 9 | 5-1 |
| 34 | 76a46ee6 | 17/06 | 20:07 | Leo / Rita | 6×7 | 13 | 4-2 |
| 35 | 67c21cc7 | 27/06 | 09:43 | Diego / Andrea | 6×6 | 12 | 6-3 |
| 36 | 3a4ded05 | 02/07 | 20:04 | Igor / Cristiane | 6×6 | 12 | 6-2 |
| 37 | 48413e39 | 04/07 | 14:16 | Diego / Cristiane | 5×5 | 10 | 3-2 |
| 38 | cecd38c7 | 07/07 | 20:34 | Diego / Rita | 5×5 | 10 | 2-4 |
| 39 | c1b86531 | 11/07 | 18:08 | Diego / Mauricio | 4×4 | 8 | 6-1 |
| 40 | d8ce634b | 18/07 | 15:30 | Cristiane / Duda | 4×5 | 9 | 5-2 |
| 41 | 12661e9a | 22/07 | 20:11 | Matheus / Bela | 4×5 | 9 | 5-0 |
| 42 | 546d4793 | 22/07 | 20:15 | Cristiane / Andrea | 4×5 | 9 | 0-1 |
| 43 | 5b04f897 | 25/07 | 18:17 | Diego / Cristiane | 4×4 | 8 | 1-4 |
| 44 | eff8a8ca | 29/07 | 18:03 | Duda / Matheus | 4×4 | 8 | 4-3 |
| 45 | 1e949e23 | 29/07 | 18:41 | Tia / Matheus | 6×7 | 13 | 3-4 |
| 46 | 9b688057 | 13/08 | 22:24 | Andrea / Cristiane | 5×4 | 9 | 0-4 |
| 47 | 97b7f5fc | 13/08 | 22:47 | Andrea / Cristiane | 5×4 | 9 | 3-0 |
| 48 | 08e1f953 | 13/08 | 22:55 | Camila / Andrea | 4×5 | 9 | 2-3 |
| 49 | d94c4c45 | 15/08 | 17:48 | Cristiane / Matheus | 4×5 | 9 | 1-4 |
| 50 | 02391aa5 | 18/08 | 22:44 | Andrea / Camila | 4×4 | 8 | 2-5 |
| 51 | c53820ed | 20/08 | 20:29 | Matheus / Cristiane | 5×5 | 10 | 4-2 |
| 52 | e88f5234 | 26/08 | 20:16 | Leo / Tia | 6×5 | 11 | 3-2 |
| 53 | 8724f72f | 29/08 | 18:19 | Matheus / Cristiane | 6×5 | 10 | 0-1 |
| 54 | 1340444b | 29/08 | 18:21 | Matheus / Cristiane | 6×6 | 11 | 3-5 |
| 55 | 8cb58047 | 02/09 | 18:45 | Andrea / Camila | 6×6 | 12 | 3-4 |
| 56 | ea7dc825 | 03/09 | 20:12 | Andrea / Mauricio | 4×3 | 7 | 2-4 |
| 57 | 3714377a | 06/09 | 00:49 | Mauricio / Duda | 3×4 | 9 | 1-2 |
| 58 | c9783551 | 06/09 | 00:50 | Andrea / Matheus | 5×4 | 9 | 4-1 |
| 59 | 64ba945c | 07/09 | 20:34 | Camila / Mauricio | 7×6 | 13 | 0-3 |
| 60 | 4b3d5960 | 07/09 | 20:37 | Camila / Duda | 7×6 | 13 | 5-0 |
| 61 | 4eff05b2 | 07/09 | 20:43 | Camila / Andrea | 5×5 | 10 | 2-1 |
| 62 | cb0a4912 | 09/09 | 21:30 | Santuzzi / Duda | 5×5 | 10 | 8-0 |
| 63 | 51248868 | 11/09 | 20:37 | Camila / Ralf | 6×5 | 11 | 8-1 |
| 64 | a796b1cd | 14/09 | 23:08 | Andrea / Camila | 4×3 | 7 | 4-4 |
| 65 | 285703fc | 23/09 | 19:30 | Camila / Mauricio | 5×5 | 10 | 3-5 |
| 66 | b692efe8 | 26/09 | 19:59 | Andrea / Cristiane | 6×5 | 10 | 7-1 |
| 67 | 8972db24 | 29/09 | 22:34 | Andrea / Camila | 5×5 | 10 | 4-2 |
| 68 | 55c98ed1 | 02/10 | 15:32 | Andrea / Camila | 4×4 | 8 | 2-4 |
| 69 | da0917a5 | 03/10 | 18:52 | Andrea / Leo | 5×4 | 9 | 1-7 |
| 70 | b2e448c0 | 08/10 | 07:49 | Matheus / Cristiane | 5×6 | 10 | 3-3 |
| 71 | 592a76cd | 08/10 | 07:51 | Duda / Mauricio | 4×3 | 7 | 1-3 |
| 72 | 78f32135 | 09/10 | 20:42 | sem times | 0×0 | 12 | 0-0 |
| 73 | 424af0d1 | 11/10 | 14:00 | Andrea / Diego | 4×3 | 7 | 2-4 |
| 74 | 56891ea8 | 11/10 | 15:25 | Andrea / Diego | 4×6 | 10 | 3-1 |
| 75 | 1e4d98c2 | 11/10 | 15:27 | Andrea / Diego | 5×5 | 10 | 1-0 |
| 76 | 1a4f3bd6 | 11/10 | 15:29 | Santuzzi / Diego | 5×5 | 10 | 2-1 |
| 77 | e8112ad1 | 11/10 | 16:20 | Duda / Mauricio | 6×5 | 11 | 0-5 |
| 78 | d1d1059c | 17/10 | 20:57 | Andrea / Cristiane | 5×5 | 10 | 4-2 |
| 79 | 300fdc43 | 21/10 | 18:02 | Santuzzi / Duda | 5×6 | 11 | 6-3 |

## Achados que afetam as próximas etapas
1. **Sem jogador repetido hoje.** Nenhuma sessão tem o mesmo jogador nos dois times nem repetido dentro de um time. A validação em `setup-teams` (A2) continua necessária, para o futuro.
2. **Uma sessão sem times** (#72, 09/10, 12 presentes). É a "rodada abortada" que o Histórico não deve mostrar.
3. **O capitão só existe dentro do texto do nome do time** (ex.: "Sem Colete (Cap: Andrea)"). Os nomes não batem sempre com o cadastro ("Tia", "Tia KK" e "Tia kk" são o mesmo capitão, "Ti" é "Ti Lu"). Na etapa A4, o Histórico lê o capitão desse texto. Para os próximos jogos, o capitão precisa ser gravado de forma confiável.
4. **Times já chegam a 7 contra 7** (14 presentes), o que combina com a regra de até 7 à mão.
5. **`present_player_ids` nem sempre bate com os times.** Em 4 sessões (#53, #54, #66, #70) os times têm 1 jogador a mais que os presentes. Na #57 há 2 presentes a mais que os times. Para o banco de areia funcionar, A2 precisa manter os presentes iguais a times mais banco.
