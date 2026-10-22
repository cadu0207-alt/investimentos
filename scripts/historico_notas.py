"""Monta o histórico realizado de 2026 a partir das notas de corretagem da Necton (PDF).

Uso: python -I scripts/historico_notas.py <pasta_das_notas> <pasta_saida>
  <pasta_das_notas>: Notas de Corretagem/2026/<mes>/<categoria>/*.pdf (exportação mensal da Necton)
Saídas (sem dados pessoais): operacoes.csv, realizados.csv, mensal.csv, por_ativo.csv
Requer: pip install pypdf
"""
import csv, re, sys, tempfile, datetime as dt
from collections import defaultdict
from pathlib import Path

import pypdf

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# texto de cada PDF fica num diretório temporário: os PDFs têm CPF e endereço e não entram no repositório
TXT = Path(tempfile.mkdtemp(prefix="notas_"))
for pdf in sorted(SRC.rglob("*.pdf")):
    pages = pypdf.PdfReader(str(pdf)).pages
    text = "\n".join(f"=====PAGE {i + 1}\n" + (p.extract_text() or "") for i, p in enumerate(pages))
    (TXT / ("__".join(pdf.relative_to(SRC).parts) + ".txt")).write_text(text, encoding="utf8")

num = lambda s: float(s.replace(".", "").replace(",", "."))
dparse = lambda s: dt.datetime.strptime(s, "%d/%m/%Y").date()


def third_friday(y, m):
    d = dt.date(y, m, 1)
    d += dt.timedelta(days=(4 - d.weekday()) % 7)
    return d + dt.timedelta(days=14)


# ---------------------------------------------------------------- Bovespa (Resumo)
trades, costs = [], []  # costs: (date, mercado, valor)
LINE = re.compile(r"^1-BOVESPA ([CV]) (.+?) ([\d.]+) ([\d.]+,\d{2}) ([\d.]+,\d{2}) ([DC])$")
MKTS = ["EXERC OPC COMPRA", "EXERC OPC VENDA", "OPCAO DE COMPRA", "OPCAO DE VENDA", "VISTA", "FRACIONARIO", "TERMO"]

for f in sorted(TXT.glob("*Resumo*.txt")):
    for page in f.read_text(encoding="utf8").split("=====PAGE")[1:]:
        m = re.search(r"\n(\d+)\n Nr\. nota\n(\d+)\n Folha\n(\d\d/\d\d/\d{4})", page)
        if not m:
            continue
        nota, date = m.group(1), dparse(m.group(3))
        in_grouped = False
        for line in page.splitlines():
            if line.startswith("Negócios realizados (Agrupado)"):
                in_grouped = True
            if not in_grouped:
                continue
            lm = LINE.match(line.strip())
            if not lm:
                continue
            side, mid, qty, price, value, _ = lm.groups()
            mkt = next(k for k in MKTS if mid.startswith(k))
            toks = mid[len(mkt):].split()
            prazo = toks[0] if toks and re.fullmatch(r"\d\d/\d\d", toks[0]) else None
            if prazo:
                toks = toks[1:]
            ticker = re.sub(r"^([A-Z]{4}\d{1,2})F$", r"\1", toks[0])  # fracionário: SUZB3F -> SUZB3
            obs = toks[1:]
            trades.append(dict(date=date, nota=nota, mkt=mkt, side=side, ticker=ticker, qty=int(num(qty)),
                               price=num(price), value=num(value), dt="D" in obs, prazo=prazo))
        lq = re.search(r"Líquido para (\d\d/\d\d/\d{4}) ([DC])([\d.]+,\d{2})", page)
        ops = re.search(r"([\d.]+,\d{2})Valor líquido das operações ([DC])", page)
        if lq and ops:
            liq = num(lq.group(3)) * (1 if lq.group(2) == "C" else -1)
            opv = num(ops.group(1)) * (1 if ops.group(2) == "C" else -1)
            kind = "opcoes" if "Op" in f.name.split("__")[1] else "acoes"
            costs.append((date, kind, round(opv - liq, 2)))

# ---------------------------------------------------------------- BMF + opções flexíveis
bmf = []  # (date, contrato, tipo, resultado_bruto)
bmf_costs = []
BLINE = re.compile(r"^([CV]) ([A-Z0-9]+) (\d\d/\d\d/\d{4}) (\d+) ([\d.]+,\d+) (DAY TRADE|NORMAL|AJUPOS) ([\d.]+,\d{2}) ([DC])")
for f in sorted(TXT.glob("*.txt")):
    kind = f.name.split("__")[1]
    if kind not in ("BMF",) and not kind.startswith("Opções Flex"):
        continue
    for page in f.read_text(encoding="utf8").split("=====PAGE")[1:]:
        m = re.search(r"(\d\d/\d\d/\d{4}) Data pregão", page)
        if not m:
            continue
        date = dparse(m.group(1))
        for line in page.splitlines():
            bm = BLINE.match(line.strip())
            if bm:
                v = num(bm.group(7)) * (1 if bm.group(8) == "C" else -1)
                bmf.append((date, re.sub(r"[A-Z]\d\d$", "", bm.group(2)), bm.group(6), v))
        dm = re.search(r"\n([\d.]+,\d{2})\nTotal das despesas", page)
        if dm:
            bmf_costs.append((date, num(dm.group(1))))

# ---------------------------------------------------------------- motor de resultado
trades.sort(key=lambda t: (t["date"], t["mkt"].startswith("EXERC"), t["side"] == "V"))
roots = defaultdict(lambda: defaultdict(int))
for t in trades:
    if t["mkt"] == "VISTA":
        roots[t["ticker"][:4]][t["ticker"]] += 1
underlying = lambda root: max(roots[root], key=roots[root].get) if roots[root] else root + "3"
is_option = lambda t: t["mkt"].startswith("OPCAO")

pos = defaultdict(lambda: [0, 0.0])  # ticker -> [qtd, custo total] (qtd negativa = vendido)
realized = []  # (date, ticker, classe, estrategia, resultado, obs)
opt_meta = {}


def classe(tk, opt):
    return "opcao" if opt else ("fii" if tk.endswith("11") and tk not in ("SAPR11", "KLBN11", "TAEE11", "ALUP11") else "acao")


def close(date, tk, side, qty, price, opt, note=""):
    """Executa qty no preço; realiza o que fecha posição existente."""
    q, cost = pos[tk]
    signed = qty if side == "C" else -qty
    if q == 0 or (q > 0) == (signed > 0):
        if not opt and side == "V" and q <= 0:
            realized.append((date, tk, classe(tk, opt), "sem_base", qty * price, f"venda sem compra em 2026 ({qty})"))
            return
        sm = re.match(r"^[A-Z]{5}(\d+)", tk)
        if opt and side == "V" and q == 0 and sm and price > 0.15 * int(sm.group(1)) / 10:
            # venda de opção muito dentro do dinheiro sem posição: fechamento de compra feita antes de 2026
            realized.append((date, tk, classe(tk, opt), "sem_base", qty * price, f"opção comprada antes de 2026 ({qty})"))
            return
        pos[tk] = [q + signed, cost + signed * price]
        return
    avg = cost / q
    closing = min(abs(signed), abs(q))
    pnl = closing * (price - avg) if q > 0 else closing * (avg - price)
    strat = ("compra_" if q > 0 else "venda_") + (opt_meta.get(tk, "acao") if opt else "acao")
    realized.append((date, tk, classe(tk, opt), strat, pnl, note))
    rest = abs(signed) - closing
    nq = q + (closing if q < 0 else -closing)
    pos[tk] = [nq, avg * nq]
    if rest:
        close(date, tk, side, rest, price, opt, note)


# day trade: casa compra x venda do mesmo dia/ativo marcadas com D
dt_groups = defaultdict(list)
for t in trades:
    if t["dt"]:
        dt_groups[(t["date"], t["ticker"])].append(t)
dt_left = {}
for (d, tk), ts in dt_groups.items():
    b = [t for t in ts if t["side"] == "C"]; s = [t for t in ts if t["side"] == "V"]
    qb, qs = sum(t["qty"] for t in b), sum(t["qty"] for t in s)
    if qb and qs:
        pb = sum(t["value"] for t in b) / qb; ps = sum(t["value"] for t in s) / qs
        m = min(qb, qs)
        realized.append((d, tk, classe(tk, is_option(ts[0])), "day_trade", m * (ps - pb), ""))
        dt_left[(d, tk)] = ("C", qb - m, pb) if qb > qs else ("V", qs - m, ps)

expiries = []
seen_dt = set()
for t in trades:
    tk, opt = t["ticker"], is_option(t)
    if opt:
        opt_meta[tk] = "call" if "COMPRA" in t["mkt"] else "put"
        if t["prazo"]:
            mm, yy = t["prazo"].split("/")
            expiries.append((third_friday(2000 + int(yy), int(mm)), tk))
    if t["dt"]:
        key = (t["date"], tk)
        if key in seen_dt:
            continue
        seen_dt.add(key)
        if key in dt_left:
            side, q, p = dt_left[key]
            if q:
                close(t["date"], tk, side, q, p, opt)
        else:  # só um lado marcado D: trata como swing
            for x in dt_groups[key]:
                close(x["date"], tk, x["side"], x["qty"], x["price"], opt)
        continue
    if t["mkt"].startswith("EXERC"):
        code = tk[:-1] if tk.endswith("E") else tk
        q, _ = pos[code]
        if q:  # encerra a opção a zero no exercício
            close(t["date"], code, "C" if q < 0 else "V", abs(q), 0.0, True, "exercida")
        close(t["date"], underlying(tk[:4]), t["side"], t["qty"], t["price"], False, "via exercício " + code)
        continue
    close(t["date"], tk, t["side"], t["qty"], t["price"], opt)

# opções que venceram sem negociação de saída
for exp, tk in sorted(set(expiries)):
    q, _ = pos[tk]
    if q and exp <= dt.date(2026, 10, 22):
        close(exp, tk, "C" if q < 0 else "V", abs(q), 0.0, True, "virou pó")

# ---------------------------------------------------------------- saídas
for d, contrato, tipo, v in bmf:
    realized.append((d, contrato, "futuro", "day_trade" if tipo == "DAY TRADE" else "posicao", v, ""))
for d, c in bmf_costs:
    costs.append((d, "futuros", c))

with open(OUT / "operacoes.csv", "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh); w.writerow(["data", "nota", "mercado", "cv", "ativo", "qtd", "preco", "valor", "day_trade", "prazo"])
    for t in trades:
        w.writerow([t["date"], t["nota"], t["mkt"], t["side"], t["ticker"], t["qty"], t["price"], t["value"], int(t["dt"]), t["prazo"] or ""])
with open(OUT / "realizados.csv", "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh); w.writerow(["data", "ativo", "classe", "estrategia", "resultado", "obs"])
    for r in sorted(realized, key=lambda r: r[0]):
        w.writerow([r[0], r[1], r[2], r[3], round(r[4], 2), r[5]])

months = sorted({r[0].strftime("%Y-%m") for r in realized} | {c[0].strftime("%Y-%m") for c in costs})
cols = ["acoes", "fii", "opcoes", "futuros_dt", "futuros_pos", "day_trade_bolsa", "custos", "total", "vendas_sem_base"]
with open(OUT / "mensal.csv", "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh); w.writerow(["mes"] + cols)
    for mo in months:
        rs = [r for r in realized if r[0].strftime("%Y-%m") == mo]
        g = lambda f: round(sum(r[4] for r in rs if f(r)), 2)
        row = dict(
            acoes=g(lambda r: r[2] == "acao" and r[3] not in ("day_trade", "sem_base")),
            fii=g(lambda r: r[2] == "fii" and r[3] not in ("day_trade", "sem_base")),
            opcoes=g(lambda r: r[2] == "opcao" and r[3] not in ("day_trade", "sem_base")),
            futuros_dt=g(lambda r: r[2] == "futuro" and r[3] == "day_trade"),
            futuros_pos=g(lambda r: r[2] == "futuro" and r[3] == "posicao"),
            day_trade_bolsa=g(lambda r: r[2] != "futuro" and r[3] == "day_trade"),
            custos=-round(sum(c[2] for c in costs if c[0].strftime("%Y-%m") == mo), 2),
            vendas_sem_base=g(lambda r: r[3] == "sem_base"),
        )
        row["total"] = round(sum(row[k] for k in cols[:7]), 2)
        w.writerow([mo] + [row[k] for k in cols])

agg = defaultdict(lambda: [0.0, 0])
for r in realized:
    if r[3] != "sem_base":
        key = (r[1] if r[2] != "futuro" else r[1] + " (futuro)", r[2], r[3])
        agg[key][0] += r[4]; agg[key][1] += 1
with open(OUT / "por_ativo.csv", "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh); w.writerow(["ativo", "classe", "estrategia", "resultado", "eventos"])
    for k, (v, n) in sorted(agg.items(), key=lambda kv: kv[1][0]):
        w.writerow([*k, round(v, 2), n])

print("trades", len(trades), "bmf", len(bmf), "realizados", len(realized), "notas c/ custo", len(costs))
open_pos = {k: v for k, v in pos.items() if v[0]}
print("posicoes abertas no fim:", {k: v[0] for k, v in sorted(open_pos.items())})
