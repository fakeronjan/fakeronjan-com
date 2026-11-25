"""Builds the static data behind fakeronjan.com/birthday.

Sources:
  - Wikipedia's 366 day pages ("August 15"), Births sections: editor-picked notable
    people with a one-line description. These feed "Same birthday" and the
    non-league groups in "Closest in age".
  - Wikidata: full NBA / NFL / MLB / NHL / WNBA rosters (anyone who played for a
    team in the league), and for everyone, a fame score (how many Wikipedia
    language editions have an article on them) and occupations.

Output (src/data/birthdays/):
  days/MM-DD.json   people born on that day of the year, most famous first
  years/YYYY.json   people with an exact birth date who belong to a group, by birth year
  meta.json         build date and counts

Usage: python3 tools/birthdays/build.py            (caches raw downloads in tools/birthdays/cache/)
"""
import hashlib
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(HERE, '..', '..', 'src', 'data', 'birthdays')
UA = 'birthday-lookup-build/1.0 (personal static site; contact via repo)'
os.makedirs(CACHE, exist_ok=True)

LEAGUES = {  # group id -> Wikidata league item
    'nba': 'Q155223', 'nfl': 'Q1215884', 'mlb': 'Q1163715', 'nhl': 'Q1215892', 'wnba': 'Q2593221',
}
OCCUPATIONS = {  # group id -> Wikidata occupation items
    'soccer': {'Q937857'},
    'tennis': {'Q10833314'},
    'actors': {'Q33999', 'Q10800557', 'Q10798782', 'Q2259451', 'Q2405480'},
    'musicians': {'Q177220', 'Q639669', 'Q488205', 'Q2252262', 'Q753110', 'Q855091', 'Q386854', 'Q806349', 'Q36834'},
}
US_POLITICIAN = ('Q82955', 'Q30')  # politician, citizen of the United States
# League rosters list everyone who ever played a game, so they'd swamp "Closest in age" with
# journeymen. Keep players with an article in at least this many Wikipedia languages (Ronjan 11/24).
# Per league, since American football and baseball get far fewer non-English articles than
# basketball or hockey: each floor keeps roughly the best-known 2,000-2,500 players (NFL at 6 keeps
# Hall of Famers like Tim Brown and Ted Hendricks, who have 9).
MIN_ROSTER_LINKS = {'nfl': 6, 'mlb': 7, 'nba': 10, 'nhl': 10, 'wnba': 8}
PHOTO_PX = 120   # thumbnail width: Wikimedia only serves set sizes (120, 250, ...); 160 returns HTTP 400
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
          'September', 'October', 'November', 'December']


def get(url, cache_name=None, data=None, tries=8):
    path = os.path.join(CACHE, cache_name) if cache_name else None
    if path and os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return f.read()
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json, application/json'})
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read().decode('utf-8')
            if path:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(body)
            return body
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get('Retry-After') or 0) or 20 * (i + 1)   # rate limited: back off hard
            print(f'  HTTP {e.code}, retry {i + 1} in {wait}s', file=sys.stderr)
            time.sleep(wait)
        except Exception as e:
            wait = 5 * (i + 1)
            print(f'  retry {i + 1} after {e} (waiting {wait}s)', file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f'failed: {url[:120]}')


def sparql(query, cache_name):
    body = urllib.parse.urlencode({'query': query}).encode()
    txt = get('https://query.wikidata.org/sparql', cache_name, data=body)
    time.sleep(0 if os.path.exists(os.path.join(CACHE, cache_name)) else 1)
    return json.loads(txt)['results']['bindings']


# ------------------------------------------------------------------ day pages

def clean(txt):
    txt = re.sub(r'<!--.*?-->', '', txt, flags=re.S)
    txt = re.sub(r'<ref[^>]*/>', '', txt)
    txt = re.sub(r'<ref[^>]*>.*?</ref>', '', txt, flags=re.S)
    for _ in range(3):
        txt = re.sub(r'\{\{[^{}]*\}\}', '', txt)
    txt = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', txt)
    txt = re.sub(r"'''?", '', txt)
    txt = txt.replace('&ndash;', '–').replace('&nbsp;', ' ').replace('&amp;', '&')
    return re.sub(r'\s+', ' ', txt).strip(' ,')


LINE = re.compile(r'^(\*+)\s*(.*)$')
YEAR = re.compile(r'^\[?\[?(\d{1,4})(?:\s*(BC|BCE|AD))?\]?\]?\s*(?:&ndash;|–|\u2014|-)\s*(.*)$')


def parse_births(wikitext):
    """Births section lines -> [{year, title, name, desc, died}]."""
    m = re.search(r'==\s*Births\s*==(.*?)(?:\n==\s*Deaths\s*==|\Z)', wikitext, flags=re.S)
    if not m:
        return []
    out, year = [], None
    for raw in m.group(1).split('\n'):
        lm = LINE.match(raw.strip())
        if not lm:
            continue
        depth, rest = len(lm.group(1)), lm.group(2).strip()
        ym = YEAR.match(rest)
        if ym:
            year = -int(ym.group(1)) if ym.group(2) in ('BC', 'BCE') else int(ym.group(1))
            rest = ym.group(3)
        else:
            bare = re.match(r'^\[?\[?(\d{1,4})\]?\]?\s*$', rest)
            if bare:          # "*[[1950]]" heading a nested list
                year = int(bare.group(1))
                continue
            if depth < 2 or year is None:
                continue
        link = re.search(r'\[\[([^|\]#]+)(?:\|([^\]]*))?\]\]', rest)
        if not link or year is None:
            continue
        title = link.group(1).strip()
        name = clean(link.group(2) or link.group(1))
        after = rest[link.end():]
        died = None
        dm = re.search(r'\((?:died|d\.)\s*\[?\[?(\d{3,4})', after)
        if dm:
            died = int(dm.group(1))
            after = after[:dm.start()] + after[dm.end():].split(')', 1)[-1]
        desc = clean(after).lstrip(',').strip()
        desc = re.sub(r'\s*\(\s*\)\s*', ' ', desc).strip(' ,')
        out.append({'year': year, 'title': title, 'name': name, 'desc': desc, 'died': died})
    return out


def day_pages():
    people = []
    for mi, mname in enumerate(MONTHS, 1):
        ndays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mi - 1]
        for d in range(1, ndays + 1):
            page = f'{mname} {d}'
            # Plain wikitext download: served from Wikipedia's cache, far lighter than the parse API
            url = 'https://en.wikipedia.org/w/index.php?' + urllib.parse.urlencode({'title': page.replace(' ', '_'), 'action': 'raw'})
            name = f'day-{mi:02d}-{d:02d}.wiki'
            old = os.path.join(CACHE, f'day-{mi:02d}-{d:02d}.json')
            if os.path.exists(old) and not os.path.exists(os.path.join(CACHE, name)):
                with open(os.path.join(CACHE, name), 'w', encoding='utf-8') as f:
                    f.write(json.load(open(old, encoding='utf-8'))['parse']['wikitext']['*'])
            cached = os.path.exists(os.path.join(CACHE, name))
            txt = get(url, name)
            if not cached:
                time.sleep(1.0)
            for p in parse_births(txt):
                p['md'] = f'{mi:02d}-{d:02d}'
                people.append(p)
        print(f'  {mname}: {len(people)} people so far', file=sys.stderr)
    return people


# ------------------------------------------------------------------ Wikidata

def enrich(titles):
    """enwiki title -> {qid, sitelinks, occ:set, us:bool, birth:'YYYY-MM-DD' or None}."""
    info = {}
    titles = sorted(set(titles))
    for i in range(0, len(titles), 250):
        batch = titles[i:i + 250]
        vals = ' '.join('<https://en.wikipedia.org/wiki/' + urllib.parse.quote(t.replace(' ', '_'), safe='') + '>' for t in batch)
        q = f'''SELECT ?a ?p ?sl (GROUP_CONCAT(DISTINCT ?o; separator=" ") AS ?occ) (SAMPLE(?us) AS ?isus) (SAMPLE(?bd) AS ?birth) WHERE {{
          VALUES ?a {{ {vals} }}
          ?a schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>.
          ?p wikibase:sitelinks ?sl.
          OPTIONAL {{ ?p wdt:P106 ?o. }}
          OPTIONAL {{ ?p wdt:P27 wd:Q30. BIND(1 AS ?us) }}
          OPTIONAL {{ ?p p:P569/psv:P569 [wikibase:timeValue ?bd; wikibase:timePrecision 11]. }}
        }} GROUP BY ?a ?p ?sl'''
        for r in sparql(q, f'enrich-{i // 250:04d}.json'):
            t = urllib.parse.unquote(r['a']['value'].rsplit('/wiki/', 1)[1]).replace('_', ' ')
            info[t] = {
                'qid': r['p']['value'].rsplit('/', 1)[1],
                'sitelinks': int(r['sl']['value']),
                'occ': {o.rsplit('/', 1)[1] for o in r.get('occ', {}).get('value', '').split()},
                'us': 'isus' in r,
                'birth': r['birth']['value'][:10] if 'birth' in r and not r['birth']['value'].startswith('-') else None,
            }
        if i // 250 % 20 == 0:
            print(f'  enriched {min(i + 250, len(titles))}/{len(titles)}', file=sys.stderr)
    return info


def league_roster(group, qid):
    """Everyone who played for a team in the league (or is tagged with the league), in two light
    queries: the player list first, then details in batches (one big query times out)."""
    ids = sparql(f'''SELECT DISTINCT ?p WHERE {{ {{ ?p wdt:P118 wd:{qid}. }} UNION {{ ?p wdt:P54 ?t. ?t wdt:P118 wd:{qid}. }} ?p wdt:P31 wd:Q5. }}''',
                 f'league-{group}-ids.json')
    qids = sorted({r['p']['value'].rsplit('/', 1)[1] for r in ids})
    out = {}
    for i in range(0, len(qids), 300):
        batch = ' '.join(f'wd:{q}' for q in qids[i:i + 300])
        rows = sparql(f'''SELECT ?p ?pLabel ?pDescription ?sl ?bd ?article WHERE {{
          VALUES ?p {{ {batch} }}
          ?p wikibase:sitelinks ?sl; p:P569/psv:P569 [wikibase:timeValue ?bd; wikibase:timePrecision 11].
          OPTIONAL {{ ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>. }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}''', f'league-{group}-{i // 300:03d}.json')
        for r in rows:
            qid_p = r['p']['value'].rsplit('/', 1)[1]
            bd = r['bd']['value']
            if bd.startswith('-') or qid_p in out:
                continue
            name = r.get('pLabel', {}).get('value', '')
            if re.fullmatch(r'Q\d+', name):
                continue
            title = urllib.parse.unquote(r['article']['value'].rsplit('/wiki/', 1)[1]).replace('_', ' ') if 'article' in r else None
            out[qid_p] = {'name': name, 'birth': bd[:10], 'sitelinks': int(r['sl']['value']),
                          'desc': r.get('pDescription', {}).get('value', ''), 'title': title}
    print(f'  {group}: {len(qids)} players, {len(out)} with exact birth dates', file=sys.stderr)
    return out


def photos(qids):
    """Wikidata QID -> Commons thumbnail path (after .../commons/thumb/) for the person's main image
    (P18), 300 people a query, cached. Wikidata only links Commons, so every photo is freely licensed.
    Wikipedia's own photo service rate-limits a lookup this size, so this goes through Wikidata.
    Stored as the file path ('3/34/Name.jpg') when the thumbnail is the usual '160px-Name.jpg';
    SVGs keep the whole thumbnail path ('.../160px-Name.svg.png'). Other formats are skipped."""
    out, qids = {}, sorted(q for q in qids if q)
    for i in range(0, len(qids), 300):
        batch = ' '.join(f'wd:{q}' for q in qids[i:i + 300])
        rows = sparql(f'''SELECT ?p (SAMPLE(?img) AS ?i) WHERE {{ VALUES ?p {{ {batch} }} ?p wdt:P18 ?img. }} GROUP BY ?p''',
                      f'p18-{i // 300:04d}.json')
        for r in rows:
            name = urllib.parse.unquote(r['i']['value'].rsplit('/', 1)[1]).replace(' ', '_')
            h = hashlib.md5(name.encode('utf-8')).hexdigest()
            folder, ext = f'{h[0]}/{h[:2]}/{name}', name.rsplit('.', 1)[-1].lower()
            if ext in ('jpg', 'jpeg', 'png', 'gif'):
                out[r['p']['value'].rsplit('/', 1)[1]] = folder
            elif ext == 'svg':
                out[r['p']['value'].rsplit('/', 1)[1]] = f'{folder}/{PHOTO_PX}px-{name}.png'
        if i // 300 % 50 == 0:
            print(f'  photos {min(i + 300, len(qids))}/{len(qids)}', file=sys.stderr)
    return out


# ------------------------------------------------------------------ build

def main():
    print('Day pages...', file=sys.stderr)
    people = day_pages()
    print(f'{len(people)} births parsed', file=sys.stderr)
    print('Wikidata enrichment...', file=sys.stderr)
    info = enrich([p['title'] for p in people])
    print('League rosters...', file=sys.stderr)
    rosters = {g: league_roster(g, q) for g, q in LEAGUES.items()}

    # Same birthday: day files
    by_day = defaultdict(list)
    for p in people:
        i = info.get(p['title'], {})
        rec = {'n': p['name'], 'y': p['year'], 'd': p['desc'], 't': p['title'], 's': i.get('sitelinks', 0)}
        if p['died']:
            rec['x'] = p['died']
        by_day[p['md']].append(rec)

    # Closest in age: everyone with an exact date who belongs to a group
    grouped = {}   # qid or title -> record
    for g, roster in rosters.items():
        for qid, r in roster.items():
            if r['sitelinks'] < MIN_ROSTER_LINKS[g]:   # everyone who ever played; keep the ones known beyond one wiki
                continue
            rec = grouped.setdefault(qid, {'n': r['name'], 'b': r['birth'], 'd': r['desc'], 't': r['title'], 's': r['sitelinks'], 'g': []})
            if g not in rec['g']:
                rec['g'].append(g)
    for p in people:
        # Everyone on the birthday pages counts under Everyone in "Closest in age", group or not, on the
        # birthday page's own date, so the two sections always agree (Ronjan 11/24: anyone in Same
        # birthday should be eligible). Wikidata only adds groups and fame here.
        if p['year'] < 1:
            continue
        i = info.get(p['title']) or {'qid': None, 'sitelinks': 0, 'occ': set(), 'us': False}
        exact = f"{p['year']:04d}-{p['md']}"
        gs = [g for g, occ in OCCUPATIONS.items() if i['occ'] & occ]
        if US_POLITICIAN[0] in i['occ'] and i['us']:
            gs.append('uspol')
        rec = grouped.setdefault(i['qid'] or f"title:{p['title']}", {'n': p['name'], 'b': exact, 'd': p['desc'], 't': p['title'], 's': i['sitelinks'], 'g': []})
        rec['b'] = exact                           # the birthday page's date, same as Same birthday
        rec['d'] = p['desc'] or rec['d']           # Wikipedia's line reads better than Wikidata's
        for g in gs:
            if g not in rec['g']:
                rec['g'].append(g)

    by_year = defaultdict(list)
    for rec in grouped.values():
        if rec['b'] and 1850 <= int(rec['b'][:4]) <= date.today().year:
            by_year[rec['b'][:4]].append(rec)

    print('Photos...', file=sys.stderr)
    qid_of = {t: v['qid'] for t, v in info.items()}
    for roster in rosters.values():
        for q, r in roster.items():
            if r.get('title'):
                qid_of.setdefault(r['title'], q)
    needed = {qid_of[r['t']] for lst in list(by_day.values()) + list(by_year.values()) for r in lst if r.get('t') in qid_of}
    pics = photos(needed)
    n = 0
    for lst in list(by_day.values()) + list(by_year.values()):
        for r in lst:
            q = qid_of.get(r.get('t'))
            if q in pics:
                r['i'] = pics[q]
                n += 1
    print(f'{len(pics)} photos for {len(needed)} people ({n} records)', file=sys.stderr)

    os.makedirs(os.path.join(OUT, 'days'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'years'), exist_ok=True)
    for md, lst in by_day.items():
        lst.sort(key=lambda r: (-r['s'], r['y']))
        with open(os.path.join(OUT, 'days', f'{md}.json'), 'w', encoding='utf-8') as f:
            json.dump(lst, f, ensure_ascii=False, separators=(',', ':'))
    for y, lst in by_year.items():
        lst.sort(key=lambda r: (r['b'], -r['s']))
        with open(os.path.join(OUT, 'years', f'{y}.json'), 'w', encoding='utf-8') as f:
            json.dump(lst, f, ensure_ascii=False, separators=(',', ':'))
    counts = defaultdict(int)
    for rec in grouped.values():
        for g in rec['g']:
            counts[g] += 1
    meta = {'built': date.today().isoformat(), 'day_people': len(people), 'grouped_people': sum(len(v) for v in by_year.values()),
            'groups': dict(sorted(counts.items())), 'years': [min(by_year), max(by_year)]}
    with open(os.path.join(OUT, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    print(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main()
