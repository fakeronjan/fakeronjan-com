"""Writes the static data behind fakeronjan.com/flights into the flights-data repo.

Layout (everything a page needs for a route sums across the chosen years in the browser):
  meta.json                 years available, the last-12-months span, build date
  airports.json             {code: [city, flights in the latest full window]}
  y/<window>/<ORIGIN>.json  {DEST: route} for that window; window = a year or "last12"
  y/<window>/rank.json      every route's totals, for rankings: [origin, dest, flights, on time, delayed, canceled,
                            diverted, delay minutes, scheduled minutes, actual minutes, arrived, distance, brand codes]
  trends/<ORIGIN>.json      {DEST: {year: [flights, on time, delayed, canceled, diverted], airlines: {year: {brand: flights}}}}
  y/<window>/ap/<CODE>.json an airport: its departures summed like a route, plus arrivals, destinations, airline flights
  y/<window>/al/<BRAND>.json an airline (regional operators folded in): totals, operators, routes, airports
  y/<window>/al/index.json  every airline's totals, to compare them
  trends/ap/<CODE>.json     an airport's departures and airline mix by year
  trends/al.json            each airline's totals and operator mix by year

Usage: python build_site.py /path/to/flights-data
"""
import json, os, sys
from collections import Counter, defaultdict
from datetime import date
from window import add, combine, months_between, CACHE

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


def blank():
    return {'core': None, 'causes': None, 'distance': 0, 'sched_sum': 0, 'actual_sum': 0, 'n_arr': 0, 'airlines': {}, 'hour': {}, 'dow': {},
            'month': {}, 'cancel_codes': Counter(), 'tails': Counter()}


def fold(w, r):
    """Adds one route's numbers into an airport total."""
    w['core'] = add(w['core'], r['core'])
    w['causes'] = add(w['causes'], r['causes'])
    for k in ('sched_sum', 'actual_sum', 'n_arr'):
        w[k] += r[k]
    for part in ('airlines', 'hour', 'dow', 'month'):
        for k, v in r[part].items():
            w[part][k] = add(w[part].get(k), v)
    w['cancel_codes'].update(r['cancel_codes'])
    w['tails'].update(r['tails'])
    if 'longest_delay' in r and ('longest_delay' not in w or r['longest_delay']['delay'] > w['longest_delay']['delay']):
        w['longest_delay'] = r['longest_delay']


def write_airports(name, W):
    """y/<window>/ap/<CODE>.json: an airport's departures (on time, causes, hours...), plus arrivals,
    destinations, and each airline's flights in and out."""
    deps, extra = defaultdict(blank), defaultdict(lambda: {'in': 0, 'dests': {}, 'ab': Counter()})
    for key, r in W['routes'].items():
        o, d = key.split('-')
        fold(deps[o], r)
        c = r['core']
        extra[o]['dests'][d] = [c[0], c[1], c[3], r['distance']]
        extra[d]['in'] += c[0]
        for k, v in r['airlines'].items():
            b = k.split('|')[0]
            extra[o]['ab'][b] += v[0]
            extra[d]['ab'][b] += v[0]
    for code, w in deps.items():
        o = compact(w)
        o.update({'in': extra[code]['in'], 'dests': extra[code]['dests'], 'ab': dict(extra[code]['ab'])})
        write(os.path.join(OUT, 'y', name, 'ap', f'{code}.json'), o)


def write_airlines(name, W):
    """y/<window>/al/<BRAND>.json for each ticket brand (regional operators fold in), and al/index.json to compare them."""
    routes, airports = defaultdict(dict), defaultdict(Counter)
    for key, r in W['routes'].items():
        o, d = key.split('-')
        per = defaultdict(lambda: [0] * 6)
        for k, v in r['airlines'].items():
            b = k.split('|')[0]
            per[b] = add(per[b] if per[b] != [0] * 6 else None, v)
        for b, c in per.items():
            routes[b][key] = [c[0], c[1], c[2], c[3], round(c[5]), r['distance']]
            airports[b][o] += c[0]
            airports[b][d] += c[0]
    index = {}
    for b, w in W.get('brands', {}).items():
        w = dict(w, distance=0, airlines={f'{b}|{op}': c for op, c in w['ops'].items()})
        o = compact(w)
        o['routes'] = routes[b]
        o['airports'] = dict(airports[b])
        write(os.path.join(OUT, 'y', name, 'al', f'{b}.json'), o)
        index[b] = {'c': o['c'], 'x': o['x'], 't': o['t'], 'nr': len(routes[b]), 'na': len(airports[b])}
    write(os.path.join(OUT, 'y', name, 'al', 'index.json'), index)


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
    write_airports(name, W)
    write_airlines(name, W)
    print(f'  {name}: {len(W["routes"]):,} routes, {sum(r["core"][0] for r in W["routes"].values()):,} flights, {len(W["months"])} months')


def main():
    months = available_months()
    years = sorted({y for y, _ in months})
    last = months[-1]
    first12 = months_between(last[0] - (1 if last[1] < 12 else 0), (last[1] % 12) + 1, *last)
    trends = defaultdict(lambda: defaultdict(lambda: {'y': {}, 'a': {}}))
    ap_trends = defaultdict(lambda: {'y': {}, 'a': {}})      # departures by year, airline flights in and out by year
    al_trends = defaultdict(lambda: {'y': {}, 'ops': {}})
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
            dep = ap_trends[o]['y'].get(str(y))
            ap_trends[o]['y'][str(y)] = add(dep, r['core'][:5])
            for b, n in brands.items():
                for code in (o, d):
                    mix = ap_trends[code]['a'].setdefault(str(y), {})
                    mix[b] = mix.get(b, 0) + n
        for b, w in W.get('brands', {}).items():
            al_trends[b]['y'][str(y)] = w['core'][:5]
            al_trends[b]['ops'][str(y)] = {op: c[0] for op, c in w['ops'].items()}
    W12 = combine(first12)
    write_window('last12', W12)
    for o, dests in trends.items():
        write(os.path.join(OUT, 'trends', f'{o}.json'), dests)
    for code, t in ap_trends.items():
        write(os.path.join(OUT, 'trends', 'ap', f'{code}.json'), t)
    write(os.path.join(OUT, 'trends', 'al.json'), al_trends)
    volume = Counter()
    for key, r in W12['routes'].items():
        o, d = key.split('-')
        volume[o] += r['core'][0]
        volume[d] += r['core'][0]
    write(os.path.join(OUT, 'airports.json'), {c: [airports.get(c, c), volume.get(c, 0)] for c in sorted(airports)})
    markets = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'markets.json'))).items() if not k.startswith('_')}
    write(os.path.join(OUT, 'markets.json'), markets)
    months_in = {str(y): sum(1 for m in months if m[0] == y) for y in years}
    write(os.path.join(OUT, 'meta.json'), {
        'built': date.today().isoformat(), 'years': [str(y) for y in years], 'months_in_year': months_in,
        'last12': [f'{first12[0][0]}-{first12[0][1]:02d}', f'{last[0]}-{last[1]:02d}'],
    })
    print('meta', json.load(open(os.path.join(OUT, 'meta.json'))))


if __name__ == '__main__':
    main()
