#!/bin/zsh
# Downloads BTS Marketing Carrier On-Time Performance (2018 on: ticket brand plus operating airline) monthly files into cache/.
# Usage: ./download.sh 2025 10 2026 9   (start year, start month, end year, end month)
set -e
cd "$(dirname "$0")/cache"
y=$1; m=$2
while (( y < $3 || (y == $3 && m <= $4) )); do
  f="ontime_${y}_$(printf %02d $m).zip"
  if [[ ! -s $f ]] || (( $(stat -f%z $f) < 1000000 )); then
    curl -sfL --retry 3 --max-time 600 -o "$f" "https://transtats.bts.gov/PREZIP/On_Time_Marketing_Carrier_On_Time_Performance_Beginning_January_2018_${y}_${m}.zip"
    echo "$f $(stat -f%z $f)"
  fi
  (( m++ )); if (( m > 12 )); then m=1; (( y++ )); fi
done
