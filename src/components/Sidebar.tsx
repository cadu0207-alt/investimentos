"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import {
  LayoutDashboard,
  LineChart,
  PieChart,
  Bot,
  TrendingUp,
  NotebookPen,
  Wallet,
  Settings,
  LogOut,
  ScanSearch,
  ClipboardList,
  Siren,
  SlidersHorizontal,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/raio-x", label: "Raio-X", icon: ScanSearch },
  { href: "/alertas", label: "Alertas de venda", icon: Siren },
  { href: "/limites", label: "Limites de risco", icon: SlidersHorizontal },
  { href: "/fichas", label: "Fichas de posição", icon: ClipboardList },
  { href: "/posicoes", label: "Posições", icon: Wallet },
  { href: "/opcoes", label: "Risco de opções", icon: LineChart },
  { href: "/alocacao", label: "Alocação", icon: PieChart },
  { href: "/robos", label: "Robôs", icon: Bot },
  { href: "/benchmark", label: "Benchmark", icon: TrendingUp },
  { href: "/notas", label: "Notas de estratégia", icon: NotebookPen },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-slate-50 font-semibold text-sm">Carteira Investimentos</p>
        <p className="text-slate-500 text-xs mt-0.5">Eduardo Cardoso Araújo</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-emerald-600/15 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="px-3 py-4 border-t border-slate-800">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </form>
    </aside>
  );
}
