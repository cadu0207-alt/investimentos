import type { InvestPositionPlan } from "./types";

/** Ficha completa = ação escolhida, tese, ao menos um gatilho de preço (saída ou stop) e prazo. */
export const isPlanComplete = (p: InvestPositionPlan | undefined) =>
  !!p && p.action !== "a_definir" && !!p.thesis && (p.exit_price !== null || p.stop_price !== null) && !!p.deadline;
