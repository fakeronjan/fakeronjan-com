"""Checks each event's date against its Wikipedia article (intro and, failing that, the full text)."""
import json, re, sys, time, urllib.error, urllib.parse, urllib.request
UA = 'birthday-lookup-build/1.0 (personal static site)'
MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
def fetch(params):
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json', 'redirects': 1})
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            time.sleep(int(e.headers.get('Retry-After') or 0) or 20 * (i + 1))
    raise RuntimeError('gave up: ' + url)
events = json.load(open('events.json'))
bad = []
for e in events:
    y, m, d = map(int, e['date'].split('-'))
    forms = [f'{MONTHS[m-1]} {d}, {y}', f'{d} {MONTHS[m-1]} {y}', f'{MONTHS[m-1]} {d} {y}']
    j = fetch({'action': 'query', 'prop': 'extracts', 'explaintext': 1, 'titles': e['wiki']})
    page = next(iter(j['query']['pages'].values()))
    if 'missing' in page:
        bad.append((e['date'], e['label'], 'ARTICLE MISSING: ' + e['wiki'])); continue
    text = page.get('extract', '')
    intro = text[:3000]
    if any(f in intro for f in forms):
        status = 'intro'
    elif any(f in text for f in forms):
        status = 'body'
    else:
        status = 'NOT FOUND'
        # nearby dates in the intro, to help fix it
        near = sorted(set(re.findall(r'(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, ' + str(y), text)))[:4]
        bad.append((e['date'], e['label'], f'not found; {y} dates in article: {near}'))
    time.sleep(1.0)
print(f'{len(events)} events checked, {len(bad)} need a look')
for b in bad: print(' ', *b)
