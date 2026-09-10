"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addNote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("Escreva o conteúdo da nota.");

  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await supabase.from("invest_strategy_notes").insert({
    user_id: user.id,
    note_date: String(formData.get("note_date") ?? "") || new Date().toISOString().slice(0, 10),
    title: String(formData.get("title") ?? "") || null,
    content,
    tags: tags.length ? tags : null,
  });

  revalidatePath("/notas");
}

export async function deleteNote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const id = String(formData.get("id"));
  await supabase.from("invest_strategy_notes").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/notas");
}
