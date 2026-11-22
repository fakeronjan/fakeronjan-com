"""Writes the static data behind fakeronjan.com/flights into the flights-data repo.

Layout (everything a page needs for a route sums across the chosen years in the browser):
  meta.json                 years available, the last-12-months span, build date
  airports.json             {code: [city, flights in the latest full window]}
  y/<window>/<ORIGIN>.json  {DEST: route} for that window; window = a year or "last12"
  y/<window>/rank.json      every route's totals, for rankings: [origin, dest, flights, on time, delayed, canceled,
                            diverted, delay minutes, scheduled minutes, actual minutes, arrived, distance, brand codes]
  trends/<ORIGIN>.json      {DEST: {year: [flights, on time, delayed, canceled, diverted], airlines: {year: {brand: flights}}}}

Usage: python build_site.py /path/to/flights-data
"""
import json, os, sys
from collections import Counter, defaultdict
from datetime import date
from window import combine, months_between, CACHE

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', '..', 'fakeronjan', 'flights-data')


def available_months():
    out = []
    for f in sorted(os.listdir(CACHE)):
        if f.startswith('agg_') and f.endswith('.pkl'):
            y, m = f[4:-4].split('_')
            out.append((int(y), int(m)))
    return out


def compact(r):
    o = {
        'c': r['core'][:5] + [round(r['core'][5])],                    # flights, on time, delayed, canceled, diverted, delay minutes
        'x': [round(v) for v in r['causes']],                          # carrier, weather, air traffic, security, late plane (minutes)
        'd': r['distance'],
        't': [round(r['sched_sum']), round(r['actual_sum']), r['n_arr']],
        'a': {k: v[:5] + [round(v[5])] for k, v in r['airlines'].items()},
        'h': {str(k): v for k, v in r['hour'].items()},
        'w': {str(k): v for k, v in r['dow'].items()},
        'mo': {},                                                      # calendar month 1-12 -> [flights, on time, canceled]
        'k': dict(r['cancel_codes']),
        'tl': r['tails'].most_common(5),
    }
    for ym, c in r['month'].items():
        mo = str(int(ym[5:]))
        prev = o['mo'].get(mo, [0, 0, 0])
        o['mo'][mo] = [prev[0] + c[0], prev[1] + c[1], prev[2] + c[3]]
    for k in ('fastest', 'slowest', 'longest_delay'):
        if k in r:
            o[{'fastest': 'fa', 'slowest': 'sl', 'longest_delay': 'ld'}[k]] = r[k]
    return o


def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(obj, f, separators=(',', ':'))


def write_window(name, W):
    by_origin = defaultdict(dict)
    rank = []
    for key, r in W['routes'].items():
        o, d = key.split('-')
        by_origin[o][d] = compact(r)
        brands = sorted({k.split('|')[0] for k in r['airlines']})
        # flights, on time, delayed, canceled, diverted, delay minutes, scheduled sum, actual sum, arrived, distance, brands
        rank.append([o, d] + r['core'][:5] + [round(r['core'][5]), round(r['sched_sum']), round(r['actual_sum']), r['n_arr'],
                                              r['distance'], ''.join(brands)])
    for o, routes in by_origin.items():
        write(os.path.join(OUT, 'y', name, f'{o}.json'), routes)
    write(os.path.join(OUT, 'y', name, 'rank.json'), rank)
    print(f'  {name}: {len(W["routes"]):,} routes, {sum(r["core"][0] for r in W["routes"].values()):,} flights, {len(W["months"])} months')


def main():
    months = available_months()
    years = sorted({y for y, _ in months})
    last = months[-1]
    first12 = months_between(last[0] - (1 if last[1] < 12 else 0), (last[1] % 12) + 1, *last)
    trends = defaultdict(lambda: defaultdict(lambda: {'y': {}, 'a': {}}))
    airports = {}
    for y in years:
        W = combine([m for m in months if m[0] == y])
        write_window(str(y), W)
        airports.update(W['airports'])
        for key, r in W['routes'].items():
            o, d = key.split('-')
            t = trends[o][d]
            t['y'][str(y)] = r['core'][:5]
            brands = Counter()
            for k, v in r['airlines'].items():
                brands[k.split('|')[0]] += v[0]
            t['a'][str(y)] = dict(brands)
    W12 = combine(first12)
    write_window('last12', W12)
    for o, dests in trends.items():
        write(os.path.join(OUT, 'trends', f'{o}.json'), dests)
    volume = Counter()
    for key, r in W12['routes'].items():
        o, d = key.split('-')
        volume[o] += r['core'][0]
        volume[d] += r['core'][0]
    write(os.path.join(OUT, 'airports.json'), {c: [airports.get(c, c), volume.get(c, 0)] for c in sorted(airports)})
    months_in = {str(y): sum(1 for m in months if m[0] == y) for y in years}
    write(os.path.join(OUT, 'meta.json'), {
        'built': date.today().isoformat(), 'years': [str(y) for y in years], 'months_in_year': months_in,
        'last12': [f'{first12[0][0]}-{first12[0][1]:02d}', f'{last[0]}-{last[1]:02d}'],
    })
    print('meta', json.load(open(os.path.join(OUT, 'meta.json'))))


if __name__ == '__main__':
    main()
