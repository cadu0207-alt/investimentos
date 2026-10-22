import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Leitura do snapshot da Fase 0 (posições e conta exportadas da Necton).
 * Fica fora do Supabase até a Fase 1, quando as posições passam a vir das notas de corretagem.
 */

export const SNAPSHOT_DATE = "2026-10-22";
const SNAPSHOT_DIR = path.join(process.cwd(), "docs", "fase0");

export type SnapshotKind = "acao" | "fii" | "opcao_call" | "opcao_put";

export interface SnapshotRow {
  ticker: string;
  kind: SnapshotKind;
  side: "compra" | "venda";
  quantity: number;
  avgPrice: number;
  avgPriceWithDividends: number;
  invested: number;
  currentPrice: number;
  positionValue: number;
  dividends: number;
  /** Resultado histórico (sem proventos), como a Necton mostra. */
  openResult: number;
  blockedQuantity: number;
  sector: string;
  option: {
    underlying: string;
    strike: number;
    expiry: string;
    businessDays: number;
    underlyingPrice: number;
    blackScholes: number;
  } | null;
}

export interface AccountSnapshot {
  fonte: string;
  saldo_disponivel: number;
  bloqueios_saldo: number;
  /** Saldo + limite do Invest Flex, que é crédito (empréstimo), não dinheiro próprio. */
  saldo_mais_invest_flex: number;
}

export async function getSnapshot(): Promise<SnapshotRow[]> {
  const csv = await readFile(path.join(SNAPSHOT_DIR, `posicoes-${SNAPSHOT_DATE}.csv`), "utf8");
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");

  return lines.map((line) => {
    const cells = line.split(",");
    const get = (name: string) => cells[columns.indexOf(name)] ?? "";
    const num = (name: string) => Number(get(name) || 0);
    const kind = get("tipo") as SnapshotKind;

    return {
      ticker: get("ticker"),
      kind,
      side: get("lado") as SnapshotRow["side"],
      quantity: num("quantidade"),
      avgPrice: num("preco_medio"),
      avgPriceWithDividends: num("preco_medio_prov"),
      invested: num("investido"),
      currentPrice: num("preco_atual"),
      positionValue: num("volume"),
      dividends: num("proventos"),
      openResult: num("resultado"),
      blockedQuantity: num("qtd_bloqueada"),
      sector: get("setor"),
      option:
        kind === "opcao_call" || kind === "opcao_put"
          ? {
              underlying: get("objeto"),
              strike: num("strike"),
              expiry: get("vencimento"),
              businessDays: num("dias_uteis"),
              underlyingPrice: num("preco_objeto"),
              blackScholes: num("black_scholes"),
            }
          : null,
    };
  });
}

export async function getAccountSnapshot(): Promise<AccountSnapshot> {
  const json = await readFile(path.join(SNAPSHOT_DIR, `conta-${SNAPSHOT_DATE}.json`), "utf8");
  return JSON.parse(json);
}

export const IR_MONTH = "2026-10";

interface IrExecution {
  data: string;
  resultado: number;
}

export interface IrSnapshot {
  fonte: string;
  mes: string;
  swing_trade: {
    resultado_mes: number;
    prejuizo_a_compensar: number;
    imposto_a_pagar: number;
    total_vendas_acoes: number;
    limite_isencao: number;
    execucoes_visiveis: IrExecution[];
  };
  day_trade: {
    resultado_mes: number;
    prejuizo_a_compensar: number;
    irrf_mes: number;
    irrf_periodos_anteriores: number;
    imposto_a_pagar: number;
    execucoes_visiveis: IrExecution[];
  };
}

export async function getIrSnapshot(): Promise<IrSnapshot> {
  const json = await readFile(path.join(SNAPSHOT_DIR, `ir-${IR_MONTH}.json`), "utf8");
  return JSON.parse(json);
}

export const SECTOR_LABEL: Record<string, string> = {
  saneamento: "Saneamento",
  varejo: "Varejo",
  papel_celulose: "Papel/celulose",
  tecnologia: "Tecnologia",
  construcao: "Construção",
  financeiro: "Financeiro",
  energia: "Energia",
  fii: "FII",
  petroleo: "Petróleo",
  mineracao: "Mineração",
  shopping: "Shopping",
  telecom: "Telecom",
  logistica: "Logística",
  seguros: "Seguros",
  a_classificar: "A classificar",
};
