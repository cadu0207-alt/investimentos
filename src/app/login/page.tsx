import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; info?: string }>;
}) {
  const { error, info } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Carteira Investimentos</h1>
          <p className="text-sm text-slate-400 mt-1">Entre para acessar seu painel</p>
        </div>

        {info && (
          <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
            {info}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <form action={signIn} className="space-y-4">
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
              required
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Primeiro acesso?{" "}
          <Link href="/signup" className="text-emerald-400 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
