"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addSnapshot(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const snapshotDate = String(formData.get("snapshot_date") ?? "");
  if (!snapshotDate) throw new Error("Informe a data do snapshot.");

  await supabase.from("invest_portfolio_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: snapshotDate,
      total_value: Number(formData.get("total_value")) || 0,
      ibov_index: formData.get("ibov_index") ? Number(formData.get("ibov_index")) : null,
      cdi_accum_pct: formData.get("cdi_accum_pct") ? Number(formData.get("cdi_accum_pct")) : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  revalidatePath("/benchmark");
  revalidatePath("/dashboard");
}

export async function deleteSnapshot(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = String(formData.get("id"));
  await supabase.from("invest_portfolio_snapshots").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/benchmark");
  revalidatePath("/dashboard");
}
