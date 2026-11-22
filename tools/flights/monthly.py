"""Boils one month of BTS Marketing Carrier On-Time Performance data down to per-route
numbers, saved as cache/agg_YYYY_MM.pkl. The site's data files are built from these
monthly pieces (build.py), so a monthly refresh only has to process the new month.

Definitions follow BTS: every scheduled flight is exactly one of on time (arrived
within 15 minutes of schedule), delayed (arrived 15+ minutes late), canceled, or
diverted.

Usage: python monthly.py 2026 9
"""
import os, pickle, sys, zipfile
from collections import Counter, defaultdict
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
COLS = ['FlightDate', 'DayOfWeek', 'Marketing_Airline_Network', 'IATA_Code_Operating_Airline', 'Flight_Number_Marketing_Airline',
        'Tail_Number', 'Origin', 'OriginCityName', 'Dest', 'DestCityName', 'CRSDepTime', 'ArrDelay', 'ArrDel15',
        'Cancelled', 'CancellationCode', 'Diverted', 'CRSElapsedTime', 'ActualElapsedTime', 'Distance',
        'CarrierDelay', 'WeatherDelay', 'NASDelay', 'SecurityDelay', 'LateAircraftDelay']
CAUSES = ['CarrierDelay', 'WeatherDelay', 'NASDelay', 'SecurityDelay', 'LateAircraftDelay']


def load(y, m):
    path = os.path.join(CACHE, f'ontime_{y}_{m:02d}.zip')
    with zipfile.ZipFile(path) as z:
        name = next(n for n in z.namelist() if n.endswith('.csv'))
        for enc in ('utf-8', 'latin-1'):   # a few months (August 2018) contain stray non-UTF-8 bytes
            try:
                with z.open(name) as f:
                    df = pd.read_csv(f, usecols=COLS, encoding=enc, dtype={'Tail_Number': 'string', 'Flight_Number_Marketing_Airline': 'string',
                                                                            'CancellationCode': 'string'}, low_memory=False)
                break
            except UnicodeDecodeError:
                continue
    df['Cancelled'] = df['Cancelled'].fillna(0).astype(int)
    df['Diverted'] = df['Diverted'].fillna(0).astype(int)
    arrived = (df['Cancelled'] == 0) & (df['Diverted'] == 0)
    df['arrived'] = arrived.astype(int)
    df['ontime'] = (arrived & (df['ArrDel15'] == 0)).astype(int)
    df['delayed'] = (arrived & (df['ArrDel15'] == 1)).astype(int)
    df['delay_min'] = df['ArrDelay'].where(df['delayed'] == 1, 0).fillna(0)
    df['hour'] = (df['CRSDepTime'].fillna(0).astype(int) // 100).clip(0, 23)
    for c in CAUSES:
        df[c] = df[c].fillna(0)
    return df


def core(g):
    """The numbers every breakdown carries: [flights, ontime, delayed, canceled, diverted, delay minutes on delayed flights]."""
    return [int(len(g)), int(g['ontime'].sum()), int(g['delayed'].sum()), int(g['Cancelled'].sum()),
            int(g['Diverted'].sum()), float(g['delay_min'].sum())]


def main(y, m):
    df = load(y, m)
    out = {'month': f'{y}-{m:02d}', 'routes': {}, 'airports': {}}
    for code, city in pd.concat([df[['Origin', 'OriginCityName']].set_axis(['c', 'n'], axis=1),
                                 df[['Dest', 'DestCityName']].set_axis(['c', 'n'], axis=1)]).drop_duplicates('c').values:
        out['airports'][code] = city
    for (o, d), g in df.groupby(['Origin', 'Dest'], sort=False):
        arr = g[g['arrived'] == 1]
        r = {
            'core': core(g),
            'causes': [float(g[c].sum()) for c in CAUSES],
            'distance': float(g['Distance'].median()),
            'sched_sum': float(arr['CRSElapsedTime'].sum()), 'actual_sum': float(arr['ActualElapsedTime'].sum()), 'n_arr': int(len(arr)),
            'airlines': {}, 'hour': {}, 'dow': {},
            'cancel_codes': dict(Counter(g['CancellationCode'].dropna())),
            'days': int(g['FlightDate'].nunique()),
        }
        for (mk, op), ga in g.groupby(['Marketing_Airline_Network', 'IATA_Code_Operating_Airline'], sort=False):
            r['airlines'][f'{mk}|{op}'] = core(ga)
        for h, gh in g.groupby('hour', sort=False):
            r['hour'][int(h)] = core(gh)[:2] + [int(gh['Cancelled'].sum())]
        for dw, gd in g.groupby('DayOfWeek', sort=False):
            r['dow'][int(dw)] = core(gd)[:2] + [int(gd['Cancelled'].sum())]
        # Extremes for the fun facts: one record each, so windows can combine them
        if len(arr):
            rec = lambda row: {'date': row['FlightDate'], 'airline': row['Marketing_Airline_Network'], 'op': row['IATA_Code_Operating_Airline'],
                               'flight': str(row['Flight_Number_Marketing_Airline']), 'min': float(row['ActualElapsedTime'] if 'ActualElapsedTime' in row else 0)}
            ae = arr.dropna(subset=['ActualElapsedTime'])
            if len(ae):
                r['fastest'] = rec(ae.loc[ae['ActualElapsedTime'].idxmin()])
                r['slowest'] = rec(ae.loc[ae['ActualElapsedTime'].idxmax()])
            ad = arr.dropna(subset=['ArrDelay'])
            if len(ad):
                row = ad.loc[ad['ArrDelay'].idxmax()]
                r['longest_delay'] = {**rec(row), 'delay': float(row['ArrDelay'])}
        r['tails'] = dict(Counter(g['Tail_Number'].dropna()).most_common(10))
        out['routes'][f'{o}-{d}'] = r
    with open(os.path.join(CACHE, f'agg_{y}_{m:02d}.pkl'), 'wb') as f:
        pickle.dump(out, f)
    print(f'{y}-{m:02d}: {len(df):,} flights, {len(out["routes"]):,} routes')


if __name__ == '__main__':
    main(int(sys.argv[1]), int(sys.argv[2]))
