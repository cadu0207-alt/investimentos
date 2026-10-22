# Escopo — Sistema de Gestão de Ações e Opções

**Objetivo:** parar de perder dinheiro por falta de visão e de regras. O sistema não prevê
o mercado. Ele obriga a ter dados corretos, um plano escrito antes de cada operação e
alertas antes de virar prejuízo.

**Base técnica:** este repositório (Next.js + Supabase com login, deploy na Vercel).
Fica fora do site da Ellevare: lá o conteúdo é estático e público no GitHub Pages.

**Contas:** BTG Pactual (8683436) e Necton (infra BTG).

---

## Fase 0 — Raio-X de hoje
- Juntar todas as posições por conta: ações, opções vendidas e compradas, PM real e quantidades.
- Resultado em aberto e realizado, por ativo e por estratégia.
- Prejuízo acumulado compensável no IR.
- Mapa de risco: opções vendidas perto do exercício, vencimentos em 30/60 dias,
  concentração por ativo e setor, capital comprometido se todas as puts forem exercidas.
- **Entrega:** diagnóstico e uma ficha por posição (manter / reduzir / rolar / encerrar)
  com gatilho de preço e prazo.
- Status: em andamento → [docs/fase0](docs/fase0/)

## Fase 1 — Base de dados confiável
- Tabelas no Supabase: contas, ativos, operações, opções, proventos, prejuízos, diário.
- A nota de corretagem é a fonte da verdade: importar as notas da Necton/BTG.
- A posição é calculada a partir das operações, nunca digitada à mão.
- Cotações atualizadas automaticamente (cron `atualizar-precos` + brapi).
- Status: operações e resultados de 2026 no banco (`invest_trades`, `invest_realized`); posições =
  saldo inicial da Necton de 22/10/2026 (`invest_position_baselines`) + notas novas, pela tela
  "Importar notas". Falta: custo médio de 31/12/2025 para reconstruir o ano inteiro só pelas notas.

## Fase 2 — Central de opções
- Por opção: payoff, gregas, distância até o strike, probabilidade de exercício,
  dias até o vencimento.
- Simulador de rolagem: comparar fechar × rolar × ser exercido, com custos.

## Fase 3 — Regras de risco e saída
- Regras aplicadas pelo sistema: tamanho máximo por posição, limite de capital
  comprometido em puts vendidas, stop por posição.
- Alertas por e-mail/WhatsApp: gatilho atingido, opção virando ITM, vencimento chegando.

## Fase 4 — Diário e métodos
- Antes de entrar: tese, alvo, stop e tamanho. Depois: comparação com o resultado real.
- Estatística por estratégia (venda de put, call coberta, compra de call, swing):
  taxa de acerto, ganho médio × perda média, expectativa.
  Um método só vale quando os números mostram que funciona.

## Fase 5 — IR
- Apuração mensal (swing × day trade), compensação de prejuízos, geração da DARF.

## Depois
- Backtest de estratégias, robôs, importação automática de extratos.

---

**Princípios:** cada fase entrega algo que já se usa; dados antes de análise;
nenhuma operação entra sem plano escrito.
