"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlanAction } from "@/lib/domain/types";

const ACTIONS: PlanAction[] = ["a_definir", "manter", "reduzir", "encerrar", "rolar", "aceitar_exercicio", "call_coberta"];

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const optionalText = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export async function savePlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  if (!ticker) throw new Error("Ativo não informado.");

  const action = String(formData.get("action") ?? "a_definir") as PlanAction;

  const { error } = await supabase.from("invest_position_plans").upsert(
    {
      user_id: user.id,
      ticker,
      thesis: optionalText(formData.get("thesis")),
      action: ACTIONS.includes(action) ? action : "a_definir",
      exit_price: optionalNumber(formData.get("exit_price")),
      stop_price: optionalNumber(formData.get("stop_price")),
      review_trigger: optionalText(formData.get("review_trigger")),
      deadline: optionalText(formData.get("deadline")),
      notes: optionalText(formData.get("notes")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,ticker" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/fichas");
  revalidatePath("/raio-x");
}
