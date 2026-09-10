import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carteira Investimentos",
  description: "Painel pessoal de investimentos, opções e estratégia — Eduardo Cardoso Araújo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">{children}</body>
    </html>
  );
}
