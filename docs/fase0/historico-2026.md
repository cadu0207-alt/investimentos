# Histórico realizado 2026 (jan–out) — onde o dinheiro foi perdido

Fonte: 50 PDFs de notas da Necton (exportação mensal: À Vista, Opções, Opções Flexíveis,
BMF, Aluguel), salvos fora do repositório em
`Documentos\Investimentos\Notas de Corretagem\2026\<mês>\<categoria>`.
Cálculo: [scripts/historico_notas.py](../../scripts/historico_notas.py) →
[historico-2026/](historico-2026/) (`mensal.csv`, `por_ativo.csv`, `realizados.csv`, `operacoes.csv`).

**Conferência:** outubro bate com a tela de IR da Necton. Swing: −R$ 2.755 aqui ×
−R$ 2.714,95 na Necton (1,5% de diferença, rateio de custos). Day trade: −R$ 83,50 nos dois.

## 1. Resultado por mês (custo conhecido, já com custos)

| Mês | Ações | Opções | Futuros DT | Futuros posição | DT bolsa | Custos | **Total** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Jan | +469 | −180 | +701 | — | −128 | −313 | **+549** |
| Fev | +518 | +3.204 | −1.433 | — | −41 | −1.158 | **+1.090** |
| Mar | −481 | −2.257 | −697 | +1.125 | −32 | −1.152 | **−3.494** |
| Abr | +254 | +2.770 | +1.181 | — | −59 | −1.803 | **+2.343** |
| Mai | −170 | +1.125 | +9 | — | — | −394 | **+570** |
| Jun | −414 | **−15.607** | +289 | — | — | −117 | **−15.849** |
| Jul | −156 | −1.528 | +12 | — | — | −60 | **−1.732** |
| Ago | +154 | −3.956 | — | — | — | −95 | **−3.897** |
| Set | −172 | −995 | — | — | — | −54 | **−1.221** |
| Out | −238 | −2.415 | −82 | — | — | −102 | **−2.838** |
| **2026** | **−236** | **−19.839** | **−20** | **+1.125** | **−260** | **−5.248** | **−24.479** |

- **81% da perda de 2026 veio de opções (−R$ 19.839) e 21% de custos (−R$ 5.248).**
  Ações compradas e vendidas no ano ficaram praticamente no zero (−R$ 236).
- Junho sozinho: −R$ 15.849 (CSMGF597, CYRES272, BBASS231, ROXOS125, CXSEF204, ANIMF600, ITUBF462).
- Desde junho, todo mês fechou negativo.

## 2. Por estratégia

| Estratégia | Resultado | Operações | Acerto | Ganhos | Perdas |
|---|---:|---:|---:|---:|---:|
| **Compra de call** | **−15.700** | 22 | **18%** | 3.170 | −18.870 |
| Venda de put | −2.386 | 26 | 77% | 6.349 | −8.735 |
| Venda de call (coberta) | −1.298 | 9 | 56% | 1.164 | −2.462 |
| Compra de put | −455 | 3 | 0% | — | −455 |
| Ações (swing) | −236 | 104 | 42% | 2.581 | −2.817 |
| Day trade ações/opções | −260 | 43 | 44% | 671 | −931 |
| Futuros day trade (WIN, BIT, WDO) | −20 | 2.325 | 49% | 197.054 | −197.074 |
| Futuros posição | +1.125 | 7 | 57% | 1.493 | −369 |

### O que os números mostram
1. **Compra de call fora do dinheiro é o maior ralo.** 13 calls compradas viraram pó no
   vencimento: −R$ 13.567. Acerto de 18%: quando ganha, ganha pouco (R$ 3.170 no ano).
   Maiores: CSMGF597 −4.080, PETRC327 −2.367, CXSEF204 −2.000, SAPRH434 −1.700,
   TIMSH278 −1.128, NATUI115 −1.125, WEGEH515 −1.025. As posições abertas hoje
   (KLBNL206, WIZCD120) seguem o mesmo padrão.
2. **Venda de put: muitos ganhos pequenos e poucas perdas grandes.** Acerta 77% das
   vezes, mas quatro perdas (CYRES272 −3.889, BBASS231 −2.190, ROXOS125 −1.680, ITUBR442 −976)
   apagam todos os acertos. E **7 puts foram exercidas**, obrigando a comprar
   **R$ 81.390 em ações**: SAPR11 1.000 a 40,90 (R$ 40.900), CYRE3 300 a 27,12,
   TOTS3 200 a 35,68, VIVA3 300 a 31,14 + 200 a 27,89, CMIG 500 a 10,92, SUZB3 100 a 48,38.
   **É daí que vem a concentração atual da carteira** (SAPR11 30%, VIVA3 no prejuízo).
3. **Call coberta vendida barata e recomprada cara.** SAPRJ405: vendida a 0,22 em
   10/09, recomprada a 2,13 em 08/10 (−R$ 1.910). VIVAJ293: vendida a 0,06, recomprada
   a 0,73 (−R$ 335). Recomprar quando a ação sobe transforma a estratégia em perda.
4. **Futuros: 2.332 operações em 106 dias para resultado zero.** WIN (1.840), BIT (438),
   WDO (45). R$ 197 mil de ganhos brutos contra R$ 197 mil de perdas; depois de
   R$ 874 de custos, sobra +R$ 231 no ano somando a posição. Muito tempo e risco
   sem retorno. Parou em julho (6 operações em outubro).
5. **Custos de R$ 5.248 (21% da perda).** Opções R$ 3.221, ações R$ 1.153, futuros R$ 874.
   **19 notas de opções entre fevereiro e maio cobraram corretagem de ~10% do valor
   operado** (ex.: 24/04, R$ 373 + R$ 39,83 de ISS sobre R$ 3.730; 28/04, R$ 327,80
   sobre R$ 3.278). Só essas notas somam R$ 2.660. Em outubro a mesma operação custou
   ~0,1%. Vale perguntar à Necton/assessoria que tabela era essa (provável ordem via mesa).

## 3. Conciliação com o prejuízo acumulado da Necton (R$ 29.602,98)

| | R$ |
|---|---:|
| Perda realizada em 2026 com custo conhecido (este cálculo) | −24.479 |
| Prejuízo acumulado na tela de IR (swing 27.628 + DT 1.975) | −29.603 |
| Diferença | −5.124 |

A diferença vem de duas coisas que as notas de 2026 não mostram:
- **R$ 44.176 em vendas de ativos comprados antes de 2026** (custo de compra não está nestas
  notas; ex.: CSMGF467 vendida por R$ 12.300 em fevereiro, ações vendidas em jan–mar).
- **Prejuízo acumulado de 2025**, que a Necton carrega para 2026.
Para fechar a conta exata: notas ou o IR de 2025 (posição em 31/12/2025 com custo médio).

## 4. Limitações
- Ordem das operações dentro do mesmo dia é aproximada (compras antes de vendas).
- Custos entram no mês em que foram pagos, não rateados no custo médio.
- A compra da VAMOF400 (PM 1,37) não aparece nestas notas.
- Exercício de put vendida: o prêmio aparece como ganho da opção e a ação entra pelo strike
  (a Receita trata o prêmio como redutor do custo; o resultado econômico é o mesmo).

## 5. Regras que os dados sugerem (para a Fase 3)
Propostas para você decidir; o sistema passaria a checar automaticamente:
- Compra de call: limite de prêmio por operação e por mês (ex.: ≤ 1% do patrimônio), só com
  alvo e stop escritos antes.
- Venda de put: só em ativo e quantidade que você aceitaria comprar, com caixa reservado
  e stop de recompra definido na entrada.
- Call coberta: strike mínimo = preço em que você venderia de bom grado; sem recompra no pânico.
- Custo por nota acima de 1% do valor operado dispara alerta.
- Futuros day trade: suspenso até haver um método com expectativa positiva medida.
