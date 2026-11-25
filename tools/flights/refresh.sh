#!/bin/zsh
# Flight Stats monthly refresh (runs daily from launchd: ~/Library/LaunchAgents/com.ronjan.flights-refresh.plist).
# Each run checks two public sources and only does work when one has something new:
#   1. BTS On-Time: the month after the newest one in cache/. While BTS has it, download it and
#      summarize it (monthly.py), then keep going to catch up on any further months.
#   2. DOT Consumer Airfare Report (Table 1a): a quarter newer than flights-data/fares/meta.json.
# Then it rebuilds flights-data (build_site.py, then fares.py, which reads the new meta.json) and pushes.
# On a Mac because monthly.py peaks near 1.8 GB of memory (the droplet has 1 GB) and the 357 MB of
# monthly summaries live here. Log: tools/flights/refresh.log
set -u
HERE=${0:A:h}
PY=$HOME/code/fakeronjan/.venv/bin/python
DATA=$HOME/code/fakeronjan/flights-data
LOG=$HERE/refresh.log
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH
log() { print -r -- "$(date '+%Y-%m-%d %H:%M:%S') $*" >> $LOG; }
cd $HERE

# 1. Newest summarized month, then each following month BTS has published
latest=$(ls cache/agg_*.pkl | sed -E 's/.*agg_([0-9]{4})_([0-9]{2}).pkl/\1\2/' | sort | tail -1)
y=${latest[1,4]}; m=$((10#${latest[5,6]}))
new_months=0
while true; do
  (( m++ )); if (( m > 12 )); then m=1; (( y++ )); fi
  url="https://transtats.bts.gov/PREZIP/On_Time_Marketing_Carrier_On_Time_Performance_Beginning_January_2018_${y}_${m}.zip"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 -I "$url")
  [[ $code == 200 ]] || break
  log "BTS has $y-$m: downloading"
  ./download.sh $y $m $y $m >> $LOG 2>&1 || { log "download failed for $y-$m"; break; }
  $PY monthly.py $y $m >> $LOG 2>&1 || { log "monthly.py failed for $y-$m"; break; }
  (( new_months++ ))
done

# 2. A fare quarter newer than the one on the site
have=$($PY -c "import json;print(json.load(open('$DATA/fares/meta.json'))['through'])")
dot=$(curl -sfL --max-time 120 'https://data.transportation.gov/resource/tfrh-tu9e.json?$select=max(year)%20as%20y&$where=year>2000' | $PY -c "import json,sys;print(json.load(sys.stdin)[0]['y'])")
dotq=$(curl -sfL --max-time 120 "https://data.transportation.gov/resource/tfrh-tu9e.json?\$select=max(quarter)%20as%20q&\$where=year=$dot" | $PY -c "import json,sys;print(json.load(sys.stdin)[0]['q'])")
new_fares=0
[[ -n $dot && -n $dotq && "$dot-Q$dotq" > "$have" ]] && { log "DOT has fares for $dot-Q$dotq (site has $have)"; new_fares=1; }

if (( new_months == 0 && new_fares == 0 )); then
  log "nothing new (flights through $latest, fares through $have)"
  exit 0
fi

# 3. Rebuild and push
cd $DATA && git pull -q --ff-only || { log "flights-data pull failed"; exit 1; }
cd $HERE
if (( new_months > 0 )); then $PY build_site.py $DATA >> $LOG 2>&1 || { log "build_site.py failed"; exit 1; }; fi
$PY fares.py $DATA >> $LOG 2>&1 || { log "fares.py failed"; exit 1; }
cd $DATA
git add -A
if git diff --cached --quiet; then log "rebuilt, no changes to push"; exit 0; fi
git commit -qm "Monthly refresh: $new_months new month(s)$( (( new_fares )) && print ', new fare quarter')"
git push -q && log "pushed $(git log --oneline -1)" || log "push failed"
