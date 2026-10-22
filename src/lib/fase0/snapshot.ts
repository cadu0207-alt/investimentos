import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Leitura do snapshot da Fase 0 (CSV extraído do painel Posição do Profit).
 * Fica fora do Supabase até a Fase 1, quando as posições passam a vir das notas de corretagem.
 */

export const SNAPSHOT_DATE = "2026-10-22";
const SNAPSHOT_FILE = path.join(process.cwd(), "docs", "fase0", `posicoes-${SNAPSHOT_DATE}.csv`);

export type SnapshotKind = "acao" | "fii" | "opcao_call" | "opcao_put";

export interface SnapshotRow {
  ticker: string;
  kind: SnapshotKind;
  side: "compra" | "venda";
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  positionValue: number;
  openResult: number;
  sector: string;
}

export async function getSnapshot(): Promise<SnapshotRow[]> {
  const csv = await readFile(SNAPSHOT_FILE, "utf8");
  const [, ...lines] = csv.trim().split(/\r?\n/);
  return lines.map((line) => {
    const [ticker, kind, side, qty, avg, current, value, result, sector] = line.split(",");
    return {
      ticker,
      kind: kind as SnapshotKind,
      side: side as SnapshotRow["side"],
      quantity: Number(qty),
      avgPrice: Number(avg),
      currentPrice: Number(current),
      positionValue: Number(value),
      openResult: Number(result),
      sector,
    };
  });
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

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export interface OptionCodeInfo {
  underlying: string;
  type: "call" | "put";
  monthIndex: number;
  /** Strike lido dos dígitos do código (ex.: 430 → 43,00). Convenção comum na B3, mas precisa ser confirmada. */
  presumedStrike: number;
  /** Próximo vencimento padrão (3ª sexta-feira) do mês da série, a partir da data do snapshot. */
  presumedExpiry: Date;
}

/** Decodifica um código de opção da B3: A–L = call (jan–dez), M–X = put (jan–dez). */
export function parseOptionCode(code: string, from: Date): OptionCodeInfo | null {
  const m = /^([A-Z]{4})([A-X])(\d+)$/.exec(code);
  if (!m) return null;
  const letter = m[2].charCodeAt(0) - 65;
  const type = letter < 12 ? "call" : "put";
  const monthIndex = letter % 12;

  let year = from.getUTCFullYear();
  let expiry = thirdFriday(year, monthIndex);
  if (expiry < from) expiry = thirdFriday(++year, monthIndex);

  return {
    underlying: m[1],
    type,
    monthIndex,
    presumedStrike: Number(m[3]) / 10,
    presumedExpiry: expiry,
  };
}

export function monthLabel(index: number, date: Date) {
  return `${MONTHS[index]}/${String(date.getUTCFullYear()).slice(2)}`;
}

function thirdFriday(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (5 - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month, 1 + offset + 14));
}
