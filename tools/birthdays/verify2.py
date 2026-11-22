import json, re, time, urllib.error, urllib.parse, urllib.request
UA = 'birthday-lookup-build/1.0 (personal static site)'
M = ['January','February','March','April','May','June','July','August','September','October','November','December']
def fetch(params):
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json', 'redirects': 1})
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r: return json.load(r)
        except urllib.error.HTTPError as e: time.sleep(int(e.headers.get('Retry-After') or 0) or 20 * (i + 1))
checks = [('1927-05-21','Spirit of St. Louis'),('1928-09-28','History of penicillin'),('1962-10-16','Cuban Missile Crisis'),
 ('1964-02-09','The Beatles in the United States'),('1969-07-20','Apollo 11'),('1969-08-15','Woodstock'),
 ('1973-09-20','Battle of the Sexes (tennis)'),('1990-02-11','Nelson Mandela'),('1993-06-11','Jurassic Park (film)'),
 ('1994-05-10','Nelson Mandela'),('1994-06-17','O. J. Simpson murder case'),('1997-05-11','Deep Blue versus Garry Kasparov'),
 ('1998-09-04','Google'),('2001-10-23','IPod Classic'),('2004-10-27','2004 World Series'),('2016-11-02','2016 World Series'),
 ('2020-03-11','COVID-19 pandemic'),('2022-11-30','ChatGPT')]
for date, title in checks:
    y, m, d = map(int, date.split('-'))
    j = fetch({'action': 'query', 'prop': 'extracts', 'explaintext': 1, 'titles': title})
    page = next(iter(j['query']['pages'].values()))
    if 'missing' in page: print(date, title, 'MISSING'); continue
    t = page.get('extract', '')
    pats = [f'{M[m-1]} {d}', f'{d} {M[m-1]}']
    hits = []
    for pat in pats:
        for mm in re.finditer(r'\b' + re.escape(pat) + r'\b', t):
            hits.append(t[max(0, mm.start()-70):mm.end()+40].replace('\n', ' '))
    print(date, title, '|', (hits[0] if hits else 'NO MONTH-DAY MATCH'))
    time.sleep(1)
