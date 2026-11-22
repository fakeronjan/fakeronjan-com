"""Combines monthly route aggregates (cache/agg_YYYY_MM.pkl, from monthly.py) into one
time window. Shared by the site build and the mockup."""
import os, pickle
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')


def add(a, b):
    return [x + y for x, y in zip(a, b)] if a else list(b)


def months_between(y0, m0, y1, m1):
    out, y, m = [], y0, m0
    while (y, m) <= (y1, m1):
        out.append((y, m))
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def combine(months):
    """months: [(y, m)] -> {'routes': {O-D: route}, 'airports': {code: city}, 'months': [...]}"""
    routes, airports, used = {}, {}, []
    for y, m in months:
        path = os.path.join(CACHE, f'agg_{y}_{m:02d}.pkl')
        if not os.path.exists(path):
            continue
        used.append(f'{y}-{m:02d}')
        a = pickle.load(open(path, 'rb'))
        airports.update(a['airports'])
        for key, r in a['routes'].items():
            w = routes.setdefault(key, {'core': None, 'causes': None, 'dist': [], 'sched_sum': 0, 'actual_sum': 0, 'n_arr': 0,
                                        'airlines': {}, 'hour': {}, 'dow': {}, 'month': {}, 'cancel_codes': Counter(),
                                        'days': 0, 'tails': Counter()})
            w['core'] = add(w['core'], r['core'])
            w['causes'] = add(w['causes'], r['causes'])
            w['dist'].append(r['distance'])
            for k in ('sched_sum', 'actual_sum', 'n_arr', 'days'):
                w[k] += r[k]
            for k, v in r['airlines'].items():
                w['airlines'][k] = add(w['airlines'].get(k), v)
            for part in ('hour', 'dow'):
                for k, v in r[part].items():
                    w[part][k] = add(w[part].get(k), v)
            w['month'][f'{y}-{m:02d}'] = r['core']
            w['cancel_codes'].update(r['cancel_codes'])
            w['tails'].update(r['tails'])
            for k, better in (('fastest', lambda n, o: n['min'] < o['min']), ('slowest', lambda n, o: n['min'] > o['min']),
                              ('longest_delay', lambda n, o: n['delay'] > o['delay'])):
                if k in r and (k not in w or better(r[k], w[k])):
                    w[k] = r[k]
    for w in routes.values():
        w['distance'] = sorted(w.pop('dist'))[0]
    return {'routes': routes, 'airports': airports, 'months': used}
