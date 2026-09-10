"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addSignal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const signalTimeRaw = String(formData.get("signal_time") ?? "");
  const signalTime = signalTimeRaw ? new Date(signalTimeRaw).toISOString() : new Date().toISOString();

  await supabase.from("invest_robot_signals").insert({
    user_id: user.id,
    robot_name: String(formData.get("robot_name") ?? "Skyfall"),
    asset: String(formData.get("asset") ?? "").toUpperCase().trim(),
    signal_type: String(formData.get("signal_type") ?? "compra"),
    signal_time: signalTime,
    price: formData.get("price") ? Number(formData.get("price")) : null,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : null,
    pnl: formData.get("pnl") ? Number(formData.get("pnl")) : null,
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/robos");
  revalidatePath("/dashboard");
}

export async function deleteSignal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = String(formData.get("id"));
  await supabase.from("invest_robot_signals").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/robos");
  revalidatePath("/dashboard");
}
