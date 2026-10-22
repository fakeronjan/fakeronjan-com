// NHL team colors by era, keyed by the team names SAKIC uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary]
// Seasons are SAKIC's keys (ending year: 1997 = 1996-97).
//
// Sources: each team's uniform history on Wikipedia (which jersey was the
// dark one, and when), SportsLogos.net logo colors by era, and Wikipedia's
// current team colors (Module:Sports color/ice hockey). Primary is the dark
// jersey's color: the road jersey until 2003, the home jersey since, black
// included. A new era starts only when the pair visibly changes (royal blue
// and navy count as different). Reviewed with Ronjan 2026-10-22
// (https://claude.ai/artifact/C34CHR8TSG6ck5dJiZQhqi).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("NHL", {
  "Anaheim Ducks": [
    [1994, 2006, "#4B2E68", "#00685E"],   // Mighty Ducks: eggplant and jade dark jersey
    [2007, 2014, "#000000", "#B9975B"],   // 2006 rebrand: black jersey with metallic gold
    [2015, 2024, "#000000", "#F47A38"],   // the black 'webbed D' jersey with thick orange stripes became the primary in 2014-15
    [2025, 9999, "#FC4C02", "#000000"]],   // 2024 rebrand: orange home jersey with black (Wikipedia lists orange, then gold) (Ronjan's call)
  "Arizona Coyotes": [
    [1997, 2003, "#000000", "#A6192E"],   // Kachina era: black dark jersey with brick red, green, and sand
    [2004, 2020, "#8C2633", "#E2D6B5"],   // 2003 redesign: brick red home jersey with sand
    [2021, 2024, "#000000", "#A6192E"]],   // the black Kachina jersey became the primary home jersey in 2020-21
  "Atlanta Flames": [[1980, 1980, "#C8102E", "#FFD100"]],   // red jersey with gold; Wikipedia
  "Atlanta Thrashers": [
    [2000, 2006, "#041E42", "#FFA300"],   // navy dark jersey; Wikipedia: navy, gold
    [2007, 2011, "#5C88DA", "#041E42"]],   // the light blue alternate became the full-time home jersey in 2006-07
  "Boston Bruins": [[1980, 9999, "#000000", "#FFB81C"]],   // black jersey with gold every year; Wikipedia
  "Buffalo Sabres": [
    [1980, 1996, "#003087", "#FFB81C"],   // royal blue jersey with gold
    [1997, 2006, "#000000", "#C8102E"],   // 1996 rebrand: black jersey with red and silver (goat head) (Ronjan's call)
    [2007, 2020, "#002654", "#FCB514"],   // navy and gold: the 2006 'Buffaslug', then the navy classic crest from 2010
    [2021, 9999, "#003087", "#FFB81C"]],   // back to royal blue and gold for 2020-21; Wikipedia
  "Calgary Flames": [[1981, 9999, "#C8102E", "#F1BE48"]],   // red jersey with gold every year (black trim 1995-2020); Wikipedia
  "Carolina Hurricanes": [
    [1998, 2022, "#CC0000", "#000000"],   // red jersey with black trim
    [2023, 9999, "#000000", "#CC0000"]],   // the black jersey became the full-time home jersey in August 2022; Wikipedia
  "Chicago Blackhawks": [[1980, 9999, "#CF0A2C", "#000000"]],   // red jersey with black every year; Wikipedia
  "Colorado Avalanche": [[1996, 9999, "#6F263D", "#236192"]],   // burgundy jersey with steel blue every year; Wikipedia
  "Colorado Rockies": [[1980, 1982, "#0033A0", "#C8102E"]],   // blue road jersey with gold and red; Wikipedia
  "Columbus Blue Jackets": [[2001, 9999, "#002654", "#CE1126"]],   // navy jersey with red every year; Wikipedia
  "Dallas Stars": [
    [1994, 1999, "#000000", "#00843D"],   // kept the North Stars' black jersey with green and gold
    [2000, 2007, "#00843D", "#000000"],   // the green All-Star-style jersey became the primary dark jersey in 1999-2000
    [2008, 2013, "#000000", "#00843D"],   // black home jersey from 2007-08
    [2014, 9999, "#006847", "#000000"]],   // 2013 rebrand: victory green jersey; Wikipedia
  "Detroit Red Wings": [[1980, 9999, "#CE1126", "#FFFFFF"]],   // red jersey with white every year; Wikipedia
  "Edmonton Oilers": [
    [1980, 1996, "#0038A8", "#FC4C02"],   // royal blue jersey with orange
    [1997, 2009, "#041E42", "#B87333"],   // 1996 rebrand: midnight blue jersey with copper and red
    [2010, 2017, "#0038A8", "#FC4C02"],   // the royal blue throwback became the home jersey in 2009-10
    [2018, 2022, "#FC4C02", "#041E42"],   // orange home jersey from 2017-18, with midnight blue
    [2023, 9999, "#0038A8", "#FC4C02"]],   // royal blue home jersey again from 2022-23 (NHL.com)
  "Florida Panthers": [
    [1994, 2003, "#C8102E", "#041E42"],   // red dark jersey with navy
    [2004, 2011, "#041E42", "#C8102E"],   // the navy jersey became the primary home jersey in 2003-04
    [2012, 9999, "#C8102E", "#041E42"]],   // red home jersey again from 2011-12; Wikipedia
  "Hartford Whalers": [
    [1980, 1992, "#00843D", "#1C2B65"],   // green jersey with blue
    [1993, 1997, "#1C2B65", "#9CA4AC"]],   // 1992 redesign: dark blue jersey with silver
  "Los Angeles Kings": [
    [1980, 1988, "#552583", "#FDB927"],   // 'Forum blue' (purple) jersey with gold
    [1989, 1998, "#000000", "#A2AAAD"],   // Gretzky era: black jersey with silver
    [1999, 2011, "#552583", "#A2AAAD"],   // 1998 rebrand: purple, silver, and black (Ronjan's call)
    [2012, 9999, "#000000", "#A2AAAD"]],   // black home jersey with silver from 2011-12; Wikipedia
  "Minnesota North Stars": [
    [1980, 1991, "#00843D", "#FFD100"],   // green jersey with gold
    [1992, 1993, "#000000", "#00843D"]],   // 1991 redesign: black became the primary color
  "Minnesota Wild": [
    [2001, 2007, "#154734", "#A6192E"],   // forest green jersey with red
    [2008, 2017, "#A6192E", "#154734"],   // the red 'Iron Range' jersey was the home jersey from 2007-08
    [2018, 9999, "#154734", "#A6192E"]],   // green home jersey again from 2017-18; Wikipedia
  "Montreal Canadiens": [[1980, 9999, "#AF1E2D", "#192168"]],   // red jersey with blue every year; Wikipedia
  "Nashville Predators": [
    [1999, 2011, "#041E42", "#FFB81C"],   // navy jersey with gold
    [2012, 9999, "#FFB81C", "#041E42"]],   // 2011 redesign: gold home jersey with navy; Wikipedia
  "New Jersey Devils": [
    [1983, 1993, "#C8102E", "#00843D"],   // red jersey with green ('Christmas colors')
    [1994, 9999, "#C8102E", "#000000"]],   // green replaced by black in 1992-93; Wikipedia
  "New York Islanders": [
    [1980, 1995, "#00539B", "#F47D30"],   // royal blue jersey with orange
    [1996, 2010, "#00285C", "#F47D30"],   // navy and orange from the 1995 fisherman set through 2009-10
    [2011, 9999, "#00539B", "#F47D30"]],   // the royal blue throwback became the home jersey in 2010-11; Wikipedia
  "New York Rangers": [[1980, 9999, "#0038A8", "#CE1126"]],   // blue jersey with red every year; Wikipedia
  "Ottawa Senators": [
    [1993, 1999, "#000000", "#C8102E"],   // black road jersey with red
    [2000, 2020, "#C8102E", "#000000"],   // the red jersey became the primary dark jersey from 1999
    [2021, 9999, "#000000", "#C8102E"]],   // 2020: black home jersey again with the 1990s-style set; Wikipedia
  "Philadelphia Flyers": [
    [1980, 2000, "#F74902", "#000000"],   // orange jersey with black
    [2001, 2009, "#000000", "#F74902"],   // black became the primary dark jersey in the 2000 playoffs
    [2010, 9999, "#F74902", "#000000"]],   // orange home jersey again from 2009-10; Wikipedia
  "Pittsburgh Penguins": [
    [1980, 2002, "#000000", "#FCB514"],   // black and gold since January 1980
    [2003, 2016, "#000000", "#CFC493"],   // Vegas gold era (logo and jerseys) (Ronjan's call)
    [2017, 9999, "#000000", "#FCB514"]],   // back to Pittsburgh gold in 2016-17; Wikipedia
  "Quebec Nordiques": [[1980, 1995, "#0072CE", "#C8102E"]],   // powder blue road jersey with red; Wikipedia
  "San Jose Sharks": [[1992, 9999, "#006D75", "#000000"]],   // teal jersey with black every year (deeper teal from 1998-99); Wikipedia
  "Seattle Kraken": [[2022, 9999, "#001628", "#99D9D9"]],   // deep sea blue jersey with ice blue; Wikipedia
  "St. Louis Blues": [
    [1980, 1994, "#005EB8", "#FCB514"],   // blue jersey with gold
    [1995, 1998, "#005EB8", "#C8102E"],   // 1994-95 set put red in a prominent role
    [1999, 2025, "#002F87", "#FCB514"],   // navy-leaning Blues blue with gold
    [2026, 9999, "#0070CC", "#FFB81C"]],   // 2025-26 redesign: back to the original lighter blue and yellow; Wikipedia
  "Tampa Bay Lightning": [
    [1993, 2001, "#000000", "#002868"],   // black road jersey with blue and silver, 1992-93 to 2000-01
    [2002, 2011, "#002868", "#000000"],   // blue dark jersey with black
    [2012, 9999, "#002868", "#FFFFFF"]],   // 2011 rebrand: blue and white only; Wikipedia
  "Toronto Maple Leafs": [[1980, 9999, "#00205B", "#FFFFFF"]],   // blue jersey with white every year; Wikipedia
  "Utah Mammoth": [[2025, 9999, "#010101", "#7AB2E0"]],   // rock black jersey with mountain blue (Utah Hockey Club, then Mammoth); Wikipedia
  "Vancouver Canucks": [
    [1980, 1997, "#000000", "#FFC72C"],   // black dark jersey with gold and red (Flying V, then the skate logo) (Ronjan's call)
    [1998, 2007, "#00205B", "#8B2332"],   // 1997 Orca rebrand: dark blue jersey with maroon
    [2008, 9999, "#00205B", "#00843D"]],   // 2007 redesign: blue jersey with green; Wikipedia
  "Vegas Golden Knights": [
    [2018, 2022, "#333F48", "#B9975B"],   // steel gray home jersey with gold
    [2023, 9999, "#B9975B", "#333F48"]],   // the gold jersey became the primary in 2022-23; Wikipedia
  "Washington Capitals": [
    [1980, 1995, "#C8102E", "#041E42"],   // red road jersey with blue
    [1996, 2000, "#005488", "#000000"],   // 1995 rebrand: blue road jersey with black and copper
    [2001, 2007, "#000000", "#B88444"],   // the black alternate (copper stripes) became the dark jersey in 2000-01
    [2008, 9999, "#C8102E", "#041E42"]],   // 2007 return to red, white, and blue; Wikipedia
  "Winnipeg Jets": [
    [1980, 1996, "#012169", "#C8102E"],   // original Jets: blue jersey with red
    [2012, 9999, "#041E42", "#004C97"]],   // 2011 Jets: polar night blue jersey with aviator blue; Wikipedia
}, { confirmed: 2027 });
