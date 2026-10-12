"""Finanz – Percorso Assicurazioni: ogni numero del documento, riprodotto dall'export Mixpanel.

Uso:  python3 analisi.py ["export_mixpanel_assicurazioni.xlsx - export.csv"]
Solo libreria standard.
"""
import csv
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

CSV = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("export_mixpanel_assicurazioni.xlsx - export.csv")

PAYOUT = {"rc_auto": 45, "casa": 40, "salute": 75, "vita": 80, "dentale": 35}
# Grafie di `ramo` trovate nell'export -> 5 rami del listino partner (vita_tcm = temporanea caso morte = vita)
RAMO = {
    "rc_auto": "rc_auto", "Rc_auto": "rc_auto", "RC Auto": "rc_auto", "rc auto": "rc_auto",
    "salute": "salute", "SALUTE": "salute", "Salute": "salute",
    "vita": "vita", "Vita": "vita", "vita_tcm": "vita",
    "casa": "casa", "Casa": "casa", "casa ": "casa",
    "dentale": "dentale", "dental": "dentale", "Dentale": "dentale",
}
INTENT = {"Sì, ne ho già una o più": "Già assicurati", "No, ma sto pensando di farne una": "Ci sto pensando",
          "No": "No", "": "Non dichiarato"}
SCREEN, CTA, QUOTE, POLICY = "Partner Screen Viewed", "Partner CTA Clicked", "Quote Requested", "Policy Activated"
STEPS = ["Path Started", "L1", "L2", "L3", "L4", "Quiz Completed", "Path Completed", SCREEN, CTA, QUOTE, POLICY]


def pct(a, b):
    return f"{100 * a / b:.1f}%" if b else "-"


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return c - h, c + h


def is_test(uid):
    # gli id reali sono esadecimali; i 6 restanti sono account di test/QA/demo
    return not all(ch in "0123456789abcdef" for ch in uid)


# ---------------------------------------------------------------- 1. Dati e pulizia
raw = list(csv.DictReader(CSV.open(encoding="utf-8")))
seen, rows = set(), []
for r in raw:
    if r["$insert_id"] not in seen:
        seen.add(r["$insert_id"])
        rows.append(r)
test_ids = sorted({r["distinct_id"] for r in rows if is_test(r["distinct_id"])})
clean = [r for r in rows if not is_test(r["distinct_id"])]

print("=== 1. DATI E PULIZIA")
print(f"Righe export: {len(raw)}  | periodo {min(r['time'] for r in raw)} -> {max(r['time'] for r in raw)}")
print(f"Duplicati (stesso $insert_id, identici in ogni colonna): {len(raw) - len(rows)} -> {len(rows)} eventi")
print("  per evento:", dict(Counter(r["event"] for r in raw) - Counter(r["event"] for r in rows)))
print(f"Utenti di test: {len(test_ids)} {test_ids}")
print(f"Grafie di ramo: {len({r['ramo'] for r in raw})} -> {len(set(RAMO.values()))} rami"
      f" | righe con grafia non standard: {sum(r['ramo'] not in PAYOUT for r in raw)}")
print(f"Utenti reali: {len({r['distinct_id'] for r in clean})}")


def revenue(rs):
    pol = [r for r in rs if r["event"] == POLICY]
    return len(pol), sum(PAYOUT[RAMO[r["ramo"]]] for r in pol)


print(f"Ricavi grezzi (export così com'è): {revenue(raw)[0]} polizze, €{revenue(raw)[1]}")
print(f"Ricavi senza duplicati, con test: {revenue(rows)[0]} polizze, €{revenue(rows)[1]}")
n_pol, rev = revenue(clean)
print(f"Ricavi puliti: {n_pol} polizze, €{rev}")

# ---------------------------------------------------------------- utenti
users = defaultdict(lambda: {"ev": set()})
for r in clean:
    u = users[r["distinct_id"]]
    u["ev"].add(f"L{r['lesson_number']}" if r["lesson_number"] else r["event"])
    if r["event"] == "Path Started":
        u.update(ramo=RAMO[r["ramo"]], intent=INTENT[r["onboarding_intent"]], os=r["$os"], ver=r["$app_version_string"])
    if r["quiz_score"]:
        u["quiz"] = int(r["quiz_score"])
U = list(users.values())


def n(us, step):
    return sum(step in u["ev"] for u in us)


def funnel(title, key):
    print(f"\n--- funnel per {title}  (utenti unici)")
    print(f"{'':22}" + "".join(f"{s[:9]:>10}" for s in STEPS) + "   click  prev|click  pol|prev")
    groups = defaultdict(list)
    for u in U:
        groups[key(u)].append(u)
    for g in sorted(groups, key=str):
        c = [n(groups[g], s) for s in STEPS]
        print(f"{str(g):22}" + "".join(f"{x:>10}" for x in c)
              + f"   {pct(c[8], c[7]):>6}  {pct(c[9], c[8]):>9}  {pct(c[10], c[9]):>8}")


# ---------------------------------------------------------------- 2. Diagnosi
print("\n=== 2. DIAGNOSI")
funnel("tutti", lambda u: "Tutti")
funnel("intent", lambda u: u["intent"])
funnel("ramo", lambda u: u["ramo"])
funnel("OS x versione", lambda u: f"{u['os']} {u['ver']}")

bug = [u for u in U if (u["os"], u["ver"]) == ("Android", "4.12.0")]
ok = [u for u in U if (u["os"], u["ver"]) != ("Android", "4.12.0")]
print(f"\nBug Android 4.12.0: L3/L2 {pct(n(bug, 'L3'), n(bug, 'L2'))} vs resto {pct(n(ok, 'L3'), n(ok, 'L2'))}")
lost = n(bug, "L2") * n(ok, "L3") / n(ok, "L2") - n(bug, "L3")
pol_per_l3 = n(ok, POLICY) / n(ok, "L3")
avg_pay = rev / n_pol
print(f"  utenti persi ~{lost:.0f} x polizze/L3 {pol_per_l3:.4f} = ~{lost * pol_per_l3:.1f} polizze x €{avg_pay:.0f} medi = ~€{lost * pol_per_l3 * avg_pay:.0f}")

edu = ["Path Started", "L1", "L2", "L3", "L4", "Quiz Completed"]
print("Perdita per passo durante le lezioni (senza Android 4.12.0):")
for g in ["Già assicurati", "Ci sto pensando", "No"]:
    c = [n([u for u in ok if u["intent"] == g], s) for s in edu]
    print(f"  {g:16}", " ".join(f"{edu[i + 1][:6]}:-{100 * (1 - c[i + 1] / c[i]):.1f}%" for i in range(len(c) - 1)),
          f"| completano L4: {pct(c[4], c[0])}")

print("Quiz (media) e click per punteggio, per intent:")
for g in ["Già assicurati", "Ci sto pensando", "No"]:
    us = [u for u in U if u["intent"] == g and "quiz" in u]
    by = {q: [u for u in us if u["quiz"] == q and SCREEN in u["ev"]] for q in range(6)}
    print(f"  {g:16} media {sum(u['quiz'] for u in us) / len(us):.2f} |",
          " ".join(f"{q}:{n(v, CTA)}/{len(v)}" for q, v in by.items()))

print("Polizza|preventivo con intervallo di confidenza 95% (Wilson):")
for g in ["Già assicurati", "Ci sto pensando", "No"]:
    us = [u for u in U if u["intent"] == g]
    k, m = n(us, POLICY), n(us, QUOTE)
    lo, hi = wilson(k, m)
    print(f"  {g:16} {k}/{m} = {pct(k, m)}  [{100 * lo:.0f}%-{100 * hi:.0f}%]")

# ---------------------------------------------------------------- 3. Valore
print("\n=== 3. VALORE")
print(f"Ricavi 3 mesi: €{rev}  ({n_pol} polizze)")
for g in ["Già assicurati", "Ci sto pensando", "No", "Non dichiarato"]:
    us = [u for u in U if u["intent"] == g]
    eur = sum(PAYOUT[u["ramo"]] for u in us if POLICY in u["ev"])
    print(f"  {g:16} utenti {pct(len(us), len(U)):>6}  ricavi €{eur:>5}  ({pct(eur, rev)})")
for ra in PAYOUT:
    k = sum(1 for u in U if u["ramo"] == ra and POLICY in u["ev"])
    print(f"  {ra:8} {k:>3} polizze x €{PAYOUT[ra]} = €{k * PAYOUT[ra]}")


def bench(pred):
    """Tassi di riferimento per ramo: click|schermata e preventivo|click."""
    out = {}
    for ra in PAYOUT:
        us = [u for u in U if pred(u) and u["ramo"] == ra]
        out[ra] = (n(us, CTA) / n(us, SCREEN), n(us, QUOTE) / n(us, CTA))
    return out


def gap(segment, ref, pol_rate, with_click):
    """Polizze ed euro in più se il segmento avesse i tassi del riferimento, ramo per ramo."""
    pol = eur = 0.0
    for ra in PAYOUT:
        us = [u for u in U if u["intent"] == segment and u["ramo"] == ra]
        clicks = n(us, SCREEN) * ref[ra][0] if with_click else n(us, CTA)
        extra = max(clicks * ref[ra][1] - n(us, QUOTE), 0) * pol_rate
        pol += extra
        eur += extra * PAYOUT[ra]
    return pol, eur


si = [u for u in U if u["intent"] == "Già assicurati"]
pq_si = n(si, POLICY) / n(si, QUOTE)
refs = {
    "A media di tutti (pavimento)": bench(lambda u: True),
    "B tutti tranne già assicurati (centrale)": bench(lambda u: u["intent"] != "Già assicurati"),
    "C ci sto pensando (tetto)": bench(lambda u: u["intent"] == "Ci sto pensando"),
}
print(f"\nCosto collo di bottiglia 'già assicurati' (polizza|preventivo già assicurati = {pct(n(si, POLICY), n(si, QUOTE))})")
for name, ref in refs.items():
    (p1, e1), (p2, e2) = gap("Già assicurati", ref, pq_si, False), gap("Già assicurati", ref, pq_si, True)
    print(f"  {name:42} solo preventivo +{p1:.1f} pol. €{e1:,.0f} | click+preventivo +{p2:.1f} pol. €{e2:,.0f}"
          f"  | anno x4: €{4 * e1:,.0f}-€{4 * e2:,.0f}")
not_si = [u for u in U if u["intent"] != "Già assicurati"]
print(f"  rif. B preventivo|click complessivo: {n(not_si, QUOTE)}/{n(not_si, CTA)} = {pct(n(not_si, QUOTE), n(not_si, CTA))}"
      f"  vs già assicurati {pct(n(si, QUOTE), n(si, CTA))}")

no = [u for u in U if u["intent"] == "No"]
_, e_lo = gap("No", refs["A media di tutti (pavimento)"], n(no, POLICY) / n(no, QUOTE), True)
_, e_hi = gap("No", refs["A media di tutti (pavimento)"], n_pol / n(U, QUOTE), True)
print(f"Sintomo 2 ('No' al click medio del percorso): €{e_lo:,.0f}-€{e_hi:,.0f} in 3 mesi")

first = {}
for r in clean:
    first.setdefault((r["distinct_id"], r["event"]), r["time"])
lag = [(datetime.fromisoformat(first[k, POLICY]) - datetime.fromisoformat(first[k, "Path Started"])).days
       for (k, e) in first if e == POLICY]
print(f"\nGiorni da inizio percorso a polizza: max {max(lag)} | ultimo Path Started"
      f" {max(t for (_, e), t in first.items() if e == 'Path Started')} | ultimo evento {max(r['time'] for r in clean)}")
print("Nuovi utenti al mese:", dict(sorted(Counter(r["time"][:7] for r in clean if r["event"] == "Path Started").items())))

# ---------------------------------------------------------------- controllo
assert (len(raw) - len(rows), len(test_ids), n_pol, rev) == (669, 6, 98, 5200), "i numeri base del documento sono cambiati"
print("\nOK: numeri base verificati (669 duplicati, 6 utenti test, 98 polizze, €5.200)")
