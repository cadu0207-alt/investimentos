"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMIT_FIELDS } from "@/lib/alerts/limits";

export async function saveLimits(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const row: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  for (const f of LIMIT_FIELDS) {
    if (f.kind === "boolean") {
      row[f.column] = formData.get(f.column) === "on";
      continue;
    }
    const raw = String(formData.get(f.column) ?? "").trim().replace(",", ".");
    const n = raw ? Number(raw) : NaN;
    // campo vazio ou inválido volta para o padrão do app
    row[f.column] = Number.isFinite(n) && n > 0 ? (f.kind === "integer" ? Math.round(n) : n) : null;
  }

  const { error } = await supabase.from("invest_limits").upsert(row, { onConflict: "user_id" });
  if (error) redirect(`/limites?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/limites");
  revalidatePath("/alertas");
  redirect("/limites?ok=1");
}
