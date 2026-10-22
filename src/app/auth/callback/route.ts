import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EMAIL = process.env.NEXT_PUBLIC_ALLOWED_EMAIL;

// Retorno do login com Google: troca o código pela sessão e só deixa entrar o e-mail autorizado.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const loginWithError = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (!code) return loginWithError(searchParams.get("error_description") ?? "Login com Google cancelado.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginWithError(error.message);

  if (ALLOWED_EMAIL && data.user?.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    await supabase.auth.signOut();
    return loginWithError("Acesso restrito ao e-mail autorizado.");
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
