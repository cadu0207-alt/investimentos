"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numOrNull(v: FormDataEntryValue | null) {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function upsertOptionPosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = formData.get("id") ? String(formData.get("id")) : null;
  const payload = {
    option_code: String(formData.get("option_code") ?? "").toUpperCase().trim(),
    underlying: String(formData.get("underlying") ?? "").toUpperCase().trim(),
    option_type: String(formData.get("option_type") ?? "call"),
    strategy_leg: String(formData.get("strategy_leg") ?? "venda_put"),
    strategy_group: String(formData.get("strategy_group") ?? "") || null,
    strike: numOrNull(formData.get("strike")),
    expiry: String(formData.get("expiry") ?? "") || null,
    quantity: Number(formData.get("quantity")) || 0,
    avg_price: Number(formData.get("avg_price")) || 0,
    current_price: numOrNull(formData.get("current_price")),
    delta: numOrNull(formData.get("delta")),
    gamma: numOrNull(formData.get("gamma")),
    theta: numOrNull(formData.get("theta")),
    vega: numOrNull(formData.get("vega")),
    iv: numOrNull(formData.get("iv")),
    status: String(formData.get("status") ?? "aberta"),
    notes: String(formData.get("notes") ?? "") || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.option_code || !payload.underlying) {
    throw new Error("Código da opção e ativo-objeto são obrigatórios.");
  }

  if (id) {
    await supabase.from("invest_option_positions").update(payload).eq("id", id).eq("user_id", user.id);
  } else {
    await supabase.from("invest_option_positions").insert({ ...payload, user_id: user.id });
  }

  revalidatePath("/opcoes");
  revalidatePath("/dashboard");
}

export async function deleteOptionPosition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = String(formData.get("id"));
  await supabase.from("invest_option_positions").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/opcoes");
  revalidatePath("/dashboard");
}
