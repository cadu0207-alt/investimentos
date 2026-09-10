import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Criar conta</h1>
          <p className="text-sm text-slate-400 mt-1">Cadastro restrito ao e-mail autorizado</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Senha</label>
            <input
              name="password"
              type="password"
              minLength={6}
              required
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 transition-colors"
          >
            Criar conta
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
