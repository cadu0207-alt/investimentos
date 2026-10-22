/** Limites de risco: metadados do formulário, valores padrão e conversão da linha do banco (invest_limits). */

export interface Limits {
  maxAssetPct: number;
  maxSectorPct: number;
  nearExpiryBusinessDays: number;
  almostWorthlessPct: number;
  deadlineWarningDays: number;
  maxRiskPerTradePct: number;
  monthlyOptionPremiumPct: number;
  shortPutsNeedCash: boolean;
}

interface LimitField {
  key: keyof Limits;
  column: string;
  label: string;
  help: string;
  unit: "%" | "dias úteis" | "dias" | "";
  kind: "number" | "integer" | "boolean";
  default: number | boolean;
  group: "venda" | "compra";
}

export const LIMIT_FIELDS: LimitField[] = [
  {
    key: "maxAssetPct",
    column: "max_asset_pct",
    label: "Máximo por ativo",
    help: "Peso máximo de um ativo no valor em ações + FII.",
    unit: "%",
    kind: "number",
    default: 15,
    group: "venda",
  },
  {
    key: "maxSectorPct",
    column: "max_sector_pct",
    label: "Máximo por setor",
    help: "Peso máximo de um setor no valor em ações + FII.",
    unit: "%",
    kind: "number",
    default: 30,
    group: "venda",
  },
  {
    key: "nearExpiryBusinessDays",
    column: "near_expiry_business_days",
    label: "Vencimento próximo",
    help: "A partir de quantos dias úteis uma opção entra em alerta.",
    unit: "dias úteis",
    kind: "integer",
    default: 45,
    group: "venda",
  },
  {
    key: "almostWorthlessPct",
    column: "almost_worthless_pct",
    label: "Opção quase pó",
    help: "Opção comprada valendo menos que este % do investido.",
    unit: "%",
    kind: "number",
    default: 20,
    group: "venda",
  },
  {
    key: "deadlineWarningDays",
    column: "deadline_warning_days",
    label: "Aviso de prazo da ficha",
    help: "Quantos dias antes do prazo da ficha o alerta aparece.",
    unit: "dias",
    kind: "integer",
    default: 7,
    group: "venda",
  },
  {
    key: "maxRiskPerTradePct",
    column: "max_risk_per_trade_pct",
    label: "Risco máximo por operação",
    help: "Perda até o stop, em % do patrimônio. Usado no checklist de compra.",
    unit: "%",
    kind: "number",
    default: 1,
    group: "compra",
  },
  {
    key: "monthlyOptionPremiumPct",
    column: "monthly_option_premium_pct",
    label: "Orçamento mensal para comprar opções",
    help: "Prêmio total pago em opções compradas no mês, em % do patrimônio.",
    unit: "%",
    kind: "number",
    default: 2,
    group: "compra",
  },
  {
    key: "shortPutsNeedCash",
    column: "short_puts_need_cash",
    label: "Put vendida só com caixa reservado",
    help: "Exige caixa próprio para pagar o exercício antes de vender put.",
    unit: "",
    kind: "boolean",
    default: true,
    group: "compra",
  },
];

export const DEFAULT_LIMITS = Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, f.default])) as unknown as Limits;

/** Converte a linha do banco em Limits; colunas nulas ou ausentes ficam com o padrão. */
export function limitsFromRow(row: Record<string, unknown> | null): Limits {
  const limits = { ...DEFAULT_LIMITS } as Record<keyof Limits, number | boolean>;
  if (!row) return limits as unknown as Limits;
  for (const f of LIMIT_FIELDS) {
    const value = row[f.column];
    if (value === null || value === undefined) continue;
    limits[f.key] = f.kind === "boolean" ? Boolean(value) : Number(value);
  }
  return limits as unknown as Limits;
}
