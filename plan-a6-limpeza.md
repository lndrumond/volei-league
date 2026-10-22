# Limpeza do teste A6 (22/10/2026)

O teste de escrita da A6 criou só registros de teste. **Quem apaga é o dono, manualmente, no SQL Editor do Supabase.** Nada foi apagado por mim.

## O que foi criado

Antes do teste: 78 sessões, 431 sets, 38 jogadores, 0 partidas ativas.
Depois do teste: 80 sessões, 434 sets, 42 jogadores, 0 partidas ativas.

| Tabela | Id | Observação |
|---|---|---|
| players | `4851875e-0d22-404f-a185-9b4011758ad1` | TESTE A6 1 |
| players | `944988f0-b8fd-422c-884b-238c3bbe0645` | TESTE A6 2 |
| players | `5ce9e76e-bd84-4ee8-9a4f-ecdef2f1e8e8` | TESTE A6 3 |
| players | `7a913445-64cb-4798-914b-a912cf413438` | TESTE A6 4 |
| sessions | `202f79c7-4977-43e7-80a4-8363fc471fc6` | partida A, nome "TESTE A6 - apagar" |
| sessions | `54058d11-2eb9-4243-8546-0ee887cb5404` | partida B (Trocar Times), nome "TESTE A6 - troca" |
| sets | `55d86e34-7c2d-46c5-a807-00047a1cfda1` | partida A, champion |
| sets | `a3f7ad3d-e70b-43cd-beec-5233939abc1e` | partida A, challenger |
| sets | `c1a297ef-b879-4c4e-9986-ba5eb4297a23` | partida B, challenger |

Um quarto set (`5faea653-afa7-4f31-935c-79468e936866`) foi criado e já desfeito pelo próprio teste ("Desfazer último set"). Não existe mais.

## SQL de limpeza (rodar nesta ordem)

```sql
-- 1) sets de teste
delete from sets where id in (
  '55d86e34-7c2d-46c5-a807-00047a1cfda1',
  'a3f7ad3d-e70b-43cd-beec-5233939abc1e',
  'c1a297ef-b879-4c4e-9986-ba5eb4297a23'
);

-- 2) partidas de teste
delete from sessions where id in (
  '202f79c7-4977-43e7-80a4-8363fc471fc6',
  '54058d11-2eb9-4243-8546-0ee887cb5404'
);

-- 3) jogadores de teste
delete from players where id in (
  '4851875e-0d22-404f-a185-9b4011758ad1',
  '944988f0-b8fd-422c-884b-238c3bbe0645',
  '5ce9e76e-bd84-4ee8-9a4f-ecdef2f1e8e8',
  '7a913445-64cb-4798-914b-a912cf413438'
);
```

## Conferência depois de apagar

```sql
select
  (select count(*) from sessions) as sessoes,   -- esperado 78
  (select count(*) from sets) as sets,          -- esperado 431
  (select count(*) from players) as jogadores,  -- esperado 38
  (select count(*) from sessions where status = 'active') as ativas; -- esperado 0
```

Depois disso, o ranking deve voltar ao retrato de `plan-a6-antes.md` (mês: 19 jogadores e 264 pontos; geral: 35 jogadores e 2200 pontos). Me avise quando apagar que eu comparo.
