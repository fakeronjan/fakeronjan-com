"""Average fares for the flights page, from the US DOT Consumer Airfare Report (Table 1a, airport
pairs with at least 10 passengers a day), plus CPI to show them in 2026 dollars.

    python3 tools/flights/fares.py ~/code/fakeronjan/flights-data

Writes into the data repo:
  fares/meta.json      quarters covered, the dollar year, and each quarter's CPI factor
  fares/<window>.json  per window (each year, and last12): pairs and airports, summed so the page can
                       add windows together. Pair "A-B" (codes sorted) ->
                       [pax, nominal sum, 2026-dollar sum, biggest airline, its fare, cheapest airline,
                        its fare, factor for those two fares, latest quarter]
                       Sums are fare x passengers a day, so sum / pax is the passenger-weighted average.
                       Airports: code -> [pax, nominal sum, 2026-dollar sum] over every pair touching it.
  fares/ap/<A>.json    per airport, each pair's yearly [pax, nominal sum, 2026-dollar sum], for Trends

Fares are each way, and both directions share one (DOT doesn't split them).
"""
import csv
import io
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

FIRST_YEAR = 2018
API = "https://data.transportation.gov/resource/tfrh-tu9e.json"
CPI = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS"   # CPI-U, all items, not seasonally adjusted


def get(url):
    # plain curl: FRED stalls Python urllib and custom user agents, but answers curl right away
    return subprocess.run(["curl", "-sfL", "--retry", "3", "--max-time", "300", url],
                          capture_output=True, text=True, check=True).stdout


def fetch_rows():
    rows, offset = [], 0
    cols = "year,quarter,airport_1,airport_2,passengers,fare,carrier_lg,fare_lg,carrier_low,fare_low"
    while True:
        q = f"{API}?$select={cols}&$where=year>={FIRST_YEAR}&$order=year,quarter,airport_1,airport_2&$limit=50000&$offset={offset}"
        batch = json.loads(get(q.replace(" ", "%20")))
        rows += batch
        if len(batch) < 50000:
            return rows
        offset += 50000


def cpi_by_quarter():
    monthly = {}
    for r in csv.DictReader(io.StringIO(get(CPI))):
        y, m = int(r["observation_date"][:4]), int(r["observation_date"][5:7])
        if y >= FIRST_YEAR and r["CPIAUCNS"] not in ("", "."):
            monthly[(y, m)] = float(r["CPIAUCNS"])
    q = defaultdict(list)
    for (y, m), v in monthly.items():
        q[f"{y}-Q{(m - 1) // 3 + 1}"].append(v)
    base_year = max(y for y, _ in monthly)
    base_vals = [v for (y, _), v in monthly.items() if y == base_year]
    return {k: sum(v) / len(v) for k, v in q.items()}, base_year, sum(base_vals) / len(base_vals), len(base_vals)


def main(out_dir):
    out = Path(out_dir) / "fares"
    (out / "ap").mkdir(parents=True, exist_ok=True)
    meta_flights = json.loads((Path(out_dir) / "meta.json").read_text())
    cpi_q, base_year, base, base_months = cpi_by_quarter()
    rows = fetch_rows()

    by_q = defaultdict(dict)   # quarter -> pair -> record
    for r in rows:
        if not r.get("fare") or not r.get("passengers"):
            continue
        a, b = sorted((r["airport_1"], r["airport_2"]))
        qk = f"{r['year']}-Q{r['quarter']}"
        by_q[qk][f"{a}-{b}"] = r
    quarters = sorted(by_q)
    factor = {q: round(base / cpi_q[q], 5) for q in quarters if q in cpi_q}
    missing = [q for q in quarters if q not in factor]
    if missing:
        raise SystemExit(f"No CPI for quarters {missing}")

    # Windows match the flight data: each year, and the last 12 months
    l0, l1 = meta_flights["last12"]
    qof = lambda ym: f"{ym[:4]}-Q{(int(ym[5:7]) - 1) // 3 + 1}"
    last12 = [q for q in quarters if qof(l0) <= q <= qof(l1)]
    windows = {y: [q for q in quarters if q.startswith(y)] for y in meta_flights["years"]}
    windows["last12"] = last12

    for w, qs in windows.items():
        pairs, aps = {}, defaultdict(lambda: [0.0, 0.0, 0.0])
        for q in qs:
            f = factor[q]
            for k, r in by_q[q].items():
                pax, fare = float(r["passengers"]), float(r["fare"])
                p = pairs.setdefault(k, [0.0, 0.0, 0.0, None, None, None, None, None, None])
                p[0] += pax; p[1] += fare * pax; p[2] += fare * f * pax
                p[3:9] = [r.get("carrier_lg"), round(float(r["fare_lg"]), 2) if r.get("fare_lg") else None,
                          r.get("carrier_low"), round(float(r["fare_low"]), 2) if r.get("fare_low") else None, f, q]
                for c in k.split("-"):
                    a = aps[c]; a[0] += pax; a[1] += fare * pax; a[2] += fare * f * pax
        (out / f"{w}.json").write_text(json.dumps({
            "quarters": qs,
            "pairs": {k: [round(x, 1) for x in v[:3]] + v[3:] for k, v in sorted(pairs.items())},   # factor keeps 5 places
            "airports": {k: [round(x, 1) for x in v] for k, v in sorted(aps.items())},
        }, separators=(",", ":")))

    # Trends: each airport's pairs by year
    trend = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0.0])))
    for q in quarters:
        f, y = factor[q], q[:4]
        for k, r in by_q[q].items():
            pax, fare = float(r["passengers"]), float(r["fare"])
            a, b = k.split("-")
            for x, other in ((a, b), (b, a)):
                t = trend[x][other][y]
                t[0] += pax; t[1] += fare * pax; t[2] += fare * f * pax
    for ap, others in trend.items():
        (out / "ap" / f"{ap}.json").write_text(json.dumps(
            {o: {y: [round(v, 1) for v in t] for y, t in ys.items()} for o, ys in sorted(others.items())}, separators=(",", ":")))

    (out / "meta.json").write_text(json.dumps({
        "source": "US DOT Consumer Airfare Report, Table 1a",
        "first": quarters[0], "through": quarters[-1],
        "dollars": base_year, "dollars_months": base_months,
        "factor": factor,
    }, indent=1))
    print(f"fares: {len(rows)} rows, {quarters[0]} to {quarters[-1]}, {len(trend)} airports; "
          f"{base_year} dollars from {base_months} months of CPI")


if __name__ == "__main__":
    main(sys.argv[1])
