import Link from "next/link";
import { PageHeader, Card, Label, Input, Select, Textarea, Button, Badge } from "@/components/ui";
import { formatBRL } from "@/lib/domain/format";
import { getLimits } from "@/lib/domain/queries";
import { runBuyChecklist, type BuyKind, type BuyOrder, type CheckStatus } from "@/lib/alerts/buyChecklist";
import { getAccountSnapshot, getMonthOptionPremium, getSnapshot, SECTOR_LABEL } from "@/lib/fase0/snapshot";

export const dynamic = "force-dynamic";

const KINDS: Record<BuyKind, string> = {
  acao: "Comprar ação / FII",
  compra_call: "Comprar call",
  compra_put: "Comprar put",
  venda_put: "Vender put",
};

const STATUS: Record<CheckStatus, { label: string; tone: "positive" | "negative" | "warning" }> = {
  ok: { label: "OK", tone: "positive" },
  falha: { label: "Não passa", tone: "negative" },
  aviso: { label: "Atenção", tone: "warning" },
};

type Params = Partial<Record<"kind" | "ticker" | "sector" | "quantity" | "price" | "stop" | "target" | "strike" | "thesis", string>>;

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  return v && Number.isFinite(n) && n > 0 ? n : null;
};

export default async function ComprarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const month = new Date().toISOString().slice(0, 7);
  const [rows, account, limits, monthOptionPremium] = await Promise.all([
    getSnapshot(),
    getAccountSnapshot(),
    getLimits(),
    getMonthOptionPremium(month),
  ]);

  const kind = (Object.keys(KINDS).includes(params.kind ?? "") ? params.kind : "acao") as BuyKind;
  const ticker = (params.ticker ?? "").trim().toUpperCase();
  const known = rows.find((r) => r.ticker === ticker && !r.option);
  const sector = params.sector || known?.sector || "a_classificar";
  const quantity = num(params.quantity);
  const price = num(params.price);

  const order: BuyOrder | null =
    ticker && quantity && price
      ? {
          kind,
          ticker,
          sector,
          quantity,
          price,
          stop: num(params.stop),
          target: num(params.target),
          strike: num(params.strike),
          thesis: params.thesis ?? "",
        }
      : null;
  const missingStrike = order?.kind === "venda_put" && order.strike === null;
  const result =
    order && !missingStrike
      ? runBuyChecklist(order, { rows, account, limits, monthOptionPremium, monthLabel: month.split("-").reverse().join("/") })
      : null;

  return (
    <div>
      <PageHeader
        title="Posso comprar?"
        subtitle="Confere a ordem contra as regras eliminatórias antes de você enviar à corretora"
      />

      <Card className="mb-6">
        <form method="get" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label>Operação</Label>
              <Select name="kind" defaultValue={kind}>
                {Object.entries(KINDS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Ativo (ação ou objeto da opção)</Label>
              <Input name="ticker" defaultValue={ticker} placeholder="ex: ITUB4" required />
            </div>
            <div>
              <Label>Setor</Label>
              <Select name="sector" defaultValue={sector}>
                {Object.entries(SECTOR_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input name="quantity" inputMode="numeric" defaultValue={params.quantity ?? ""} required />
            </div>
            <div>
              <Label>Preço / prêmio R$</Label>
              <Input name="price" inputMode="decimal" defaultValue={params.price ?? ""} required />
            </div>
            <div>
              <Label>Stop R$</Label>
              <Input name="stop" inputMode="decimal" defaultValue={params.stop ?? ""} />
            </div>
            <div>
              <Label>Alvo R$</Label>
              <Input name="target" inputMode="decimal" defaultValue={params.target ?? ""} />
            </div>
            <div>
              <Label>Strike R$ (venda de put)</Label>
              <Input name="strike" inputMode="decimal" defaultValue={params.strike ?? ""} />
            </div>
          </div>
          <div>
            <Label>Tese (por que comprar)</Label>
            <Textarea name="thesis" rows={2} defaultValue={params.thesis ?? ""} />
          </div>
          <p className="text-xs text-slate-500">
            Em opções, stop e alvo são preços do prêmio. Na put vendida, o stop é o prêmio subir até o valor informado.
          </p>
          <Button type="submit">Conferir</Button>
        </form>
      </Card>

      {missingStrike && (
        <Card className="border-amber-900/60">
          <p className="text-sm text-amber-300">Informe o strike para conferir uma venda de put.</p>
        </Card>
      )}

      {result && order && (
        <Card className={result.passed ? "border-emerald-900/70" : "border-red-900/70"}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className={`text-lg font-semibold ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
                {result.passed ? "Passa nas regras" : "Não passa nas regras"}
              </p>
              <p className="text-xs text-slate-500">
                {KINDS[order.kind]} · {order.ticker} · {order.quantity} × {formatBRL(order.price)} = {formatBRL(order.quantity * order.price)}
              </p>
            </div>
            <Link href="/limites" className="text-xs text-emerald-400 hover:underline">
              Ver limites
            </Link>
          </div>
          <ul className="space-y-2">
            {result.checks.map((c) => (
              <li key={c.rule} className="flex gap-3 items-start">
                <span className="w-24 shrink-0">
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                </span>
                <span>
                  <span className="block text-sm text-slate-200">{c.rule}</span>
                  <span className="block text-xs text-slate-400">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-4">
            Passar nas regras não é recomendação de compra: só quer dizer que a ordem respeita os limites que você definiu.
            {result.passed && " Se for executar, registre a ficha da nova posição em Fichas de posição."}
          </p>
        </Card>
      )}
    </div>
  );
}
