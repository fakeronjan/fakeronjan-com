// NBA team colors by era, keyed by the team names DUNCAN uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary, chart overrides]
// Seasons are DUNCAN's keys (ending year: 1997 = 1996-97).
//
// Sources: road-uniform and primary-logo colors sampled from SportsLogos.net,
// and Wikipedia's team color data (Module:Sports color/basketball) for current
// and former names. A new era starts only when the color pair visibly changes;
// shade tweaks keep the newer shade. Reviewed with Ronjan 2026-10-22
// (https://claude.ai/artifact/C3wsTexZ4EsUVeZ9asz3K5).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("NBA", {
  "Atlanta Hawks": [
    [1977, 1995, "#D02028", "#F4C834"],   // road jersey red with gold trim (1977-95 uniforms)
    [1996, 2007, "#E01C3C", "#000000"],   // red road jersey with black; 1995 hawk logo red/black
    [2008, 2015, "#1C2C5C", "#E4383C"],   // navy road jersey with red trim
    [2016, 2020, "#C8102E", "#C0D028"],   // 2015 rebrand: torch red, volt green, granite gray; volt approximated from the 2016 uniforms' trim (Ronjan's call)
    [2021, 9999, "#C8102E", "#FDB927"]],   // Wikipedia (current): red, legacy yellow
  "Boston Celtics": [[1977, 9999, "#008348", "#FFFFFF", {light: {s: "#000000"}}]],   // green road jersey every era; green and white uniforms (Ronjan's call)
  "Brooklyn Nets": [
    [1977, 1977, "#003DA6", "#EC0044"],   // Wikipedia (New York Nets): blue, red
    [1978, 1997, "#1C4CA4", "#E4184C"],   // blue road jersey with red trim (NJ Nets)
    [1998, 2012, "#04245C", "#CE1141"],   // navy road jersey; Wikipedia (NJ Nets): navy, red
    [2013, 9999, "#000000", "#FFFFFF", {dark: {p: "#A2AAAD", s: "#FFFFFF"}, light: {p: "#A2AAAD", s: "#000000"}}]],   // black and white since the Brooklyn move (Ronjan's call)
  "Buffalo Braves": [[1977, 1978, "#3E8EDE", "#E24301"]],   // light blue from 1973-74 through the move (SportsLogos News); Wikipedia
  "Charlotte Hornets": [
    [1989, 2002, "#00788C", "#3C2C84"],   // teal road jersey with purple trim; original Hornets teal and purple
    [2005, 2014, "#E75300", "#3D6085"],   // Wikipedia (Bobcats): orange, blue
    [2015, 9999, "#00788C", "#1D1160"]],   // Wikipedia (current): teal, purple; purple road jersey
  "Chicago Bulls": [[1977, 9999, "#CE1141", "#000000"]],   // red road jersey with black trim every era
  "Cleveland Cavaliers": [
    [1977, 1983, "#8C0804", "#FCB034"],   // wine road jersey with gold trim
    [1984, 1994, "#F05824", "#1C407C"],   // orange road jersey 1984-87, blue with orange 1988-94
    [1995, 2003, "#000000", "#5488CC"],   // black road jersey with blue; logo black, blue, orange
    [2004, 9999, "#860038", "#BC945C"]],   // wine road jersey with gold; Wikipedia (current)
  "Dallas Mavericks": [
    [1981, 2001, "#042C8C", "#048034"],   // blue and green; green road jersey 1982-93
    [2002, 9999, "#0064B1", "#BBC4CA"]],   // navy/blue road jersey with silver; Wikipedia (current)
  "Denver Nuggets": [
    [1977, 1982, "#2C3094", "#E0103C"],   // blue road jersey; logo blue and red
    [1983, 1993, "#2C3090", "#F4E42C"],   // rainbow skyline era: blue road jersey, yellow/red/green rainbow (Ronjan's call)
    [1994, 2003, "#141840", "#B48038"],   // navy road jersey; mountain logo gold, navy, maroon
    [2004, 2018, "#4C90CC", "#FCB824"],   // powder blue road jersey with gold
    [2019, 9999, "#0E2240", "#FEC524"]],   // Wikipedia (current): midnight blue, sunshine yellow
  "Detroit Pistons": [
    [1977, 1996, "#2C3094", "#EC144C"],   // blue road jersey with red (red jersey 1977-78)
    [1997, 2001, "#0C7070", "#000000"],   // teal road jersey with black trim
    [2002, 9999, "#1D428A", "#C8102E"]],   // blue road jersey with red; Wikipedia (current)
  "Golden State Warriors": [
    [1977, 1997, "#2C3094", "#FCCC3C"],   // blue road jersey with gold
    [1998, 2010, "#04245C", "#DC5834"],   // navy road jersey with orange (thunderbolt era)
    [2011, 9999, "#1D428A", "#FDB927"]],   // blue road jersey with gold; Wikipedia (current)
  "Houston Rockets": [
    [1977, 1995, "#BC1C2C", "#FCCC3C"],   // red road jersey with gold
    [1996, 2003, "#0C0C34", "#C42024"],   // navy pinstripe road jersey with red
    [2004, 2026, "#CE1141", "#C4CED4"],   // red road jersey with silver
    [2027, 9999, "#CE0E2D", "#FFD520"]],   // 2026-27 logo red with gold; Wikipedia (current)
  "Indiana Pacers": [[1977, 9999, "#0C2340", "#FFD520"]],   // blue road jersey with gold every era (royal before 1991, navy after)
  "Kansas City Kings": [[1977, 1985, "#1D3D92", "#CF321F"]],   // logo red and blue; Wikipedia
  "Los Angeles Clippers": [
    [1985, 2015, "#C8102E", "#0068B4"],   // red road jersey with blue (blue jersey 1985-87)
    [2016, 2024, "#1D428A", "#000000"],   // 2015 rebrand logo black, blue, red
    [2025, 9999, "#12173F", "#C8102E"]],   // Wikipedia (current): navy, red
  "Los Angeles Lakers": [[1977, 9999, "#552583", "#FDB927"]],   // purple road jersey with gold every era
  "Memphis Grizzlies": [
    [2002, 2004, "#00AFAA", "#96694C"],   // Vancouver look kept: teal, bronze (black road jersey)
    [2005, 9999, "#5D76A9", "#12173F"]],   // Wikipedia (current): Beale Street blue, navy
  "Miami Heat": [[1989, 9999, "#000000", "#98002E"]],   // black road jersey with red every era
  "Milwaukee Bucks": [
    [1977, 1993, "#204C24", "#BC1C2C"],   // green road jersey with red trim
    [1994, 2006, "#5C388C", "#0C4424"],   // purple road jersey with green
    [2007, 2015, "#0C643C", "#C41034"],   // green road jersey with red
    [2016, 9999, "#00471B", "#EEE1C6"]],   // Wikipedia (current): green, cream
  "Minnesota Timberwolves": [
    [1990, 1996, "#1C409C", "#0C9C4C"],   // blue road jersey with green
    [1997, 2017, "#045084", "#000000"],   // blue road jersey with black trim; logo blue, green, black (Ronjan's call)
    [2018, 2026, "#0C233F", "#236192"],   // 2017 logo midnight blue, lake blue
    [2027, 9999, "#1D428A", "#009A44"]],   // 2026-27 logo blue, green; Wikipedia (current)
  "New Orleans Jazz": [[1977, 1979, "#4C3262", "#EFC33D"]],   // logo purple; Wikipedia: purple, gold
  "New Orleans Pelicans": [
    [2003, 2013, "#0093B1", "#2C2C84"],   // teal road jersey with purple (New Orleans Hornets)
    [2014, 9999, "#0C2340", "#B9975B"]],   // navy road jersey with gold; Wikipedia (current)
  "New York Knicks": [
    [1977, 1979, "#1D428A", "#F58426"],   // blue road jersey with orange
    [1980, 1983, "#242064", "#CC1044"],   // navy and crimson red from 1979-80, Penn's colors picked by team president E. Michael Burke (Wikipedia); navy road jersey, white home, crimson trim
    [1984, 9999, "#1D428A", "#F58426"]],   // blue road jersey with orange; Wikipedia (current)
  "Oklahoma City Thunder": [[2009, 9999, "#007AC1", "#EF3B24"]],   // blue road jersey; Wikipedia (current)
  "Orlando Magic": [
    [1990, 1994, "#000000", "#0050B5"],   // black pinstripe road jersey with blue
    [1995, 9999, "#0050B5", "#000000"]],   // blue road jersey since 1995; Wikipedia (current)
  "Philadelphia 76ers": [
    [1977, 1997, "#1D428A", "#C8102E"],   // red road jersey, blue logo
    [1998, 2009, "#000000", "#B89454"],   // black road jersey; logo gold, black, blue (Ronjan's call)
    [2010, 9999, "#1D428A", "#C8102E"]],   // red road jersey 2010-15, blue since; Wikipedia (current)
  "Phoenix Suns": [[1977, 9999, "#1D1160", "#E56020"]],   // purple road jersey with orange every era
  "Portland Trail Blazers": [
    [1977, 1979, "#000000", "#E03A3E"],   // black road jersey with red
    [1980, 1985, "#E03A3E", "#000000"],   // red road jersey 1980-85
    [1986, 9999, "#000000", "#E03A3E"]],   // black road jersey with red since 1986)
  "Sacramento Kings": [
    [1986, 1994, "#1D3D92", "#CF321F"],   // blue road jersey with red (same colors as Kansas City)
    [1995, 2002, "#000000", "#5A2D81"],   // black road jersey with purple
    [2003, 9999, "#5A2D81", "#000000"]],   // purple road jersey with black since 2003; Wikipedia (current)
  "San Antonio Spurs": [[1977, 9999, "#000000", "#C4CED4"]],   // black road jersey with silver every era
  "San Diego Clippers": [
    [1979, 1982, "#3E8EDE", "#E24301"],   // Braves light blue carried over (SportsLogos News); Wikipedia
    [1983, 1984, "#0068B4", "#C8102E"]],   // 1983 logo blue and red
  "Seattle SuperSonics": [
    [1977, 1995, "#04643C", "#FCBC14"],   // green road jersey with gold
    [1996, 2001, "#1C443C", "#A4283C"],   // dark green road jersey with red
    [2002, 2008, "#005830", "#FEC222"]],   // green road jersey with gold; Wikipedia
  "Toronto Raptors": [
    [1996, 2006, "#3C3894", "#CE1141"],   // purple road jersey; logo purple, red, black
    [2007, 9999, "#CE1141", "#000000"]],   // red road jersey with black
  "Utah Jazz": [
    [1980, 1984, "#04643C", "#FCC82C"],   // green road jersey with gold
    [1985, 1996, "#542C64", "#FCC82C"],   // purple road jersey with gold
    [1997, 2004, "#64489C", "#9C504C"],   // purple road jersey; mountain logo purple, copper, teal
    [2005, 2010, "#00245C", "#6CACDC"],   // navy road jersey with light blue
    [2011, 2022, "#002B5C", "#F9A01B"],   // navy road jersey with gold
    [2023, 2025, "#FFF21F", "#000000"],   // 2022 rebrand: spotlight yellow (#FFF21F per a third-party site citing team guidelines; Ronjan: good enough), black
    [2026, 9999, "#4E008E", "#79A3DC"]],   // Wikipedia (current): purple, light blue
  "Vancouver Grizzlies": [[1996, 2001, "#00AFAA", "#96694C"]],   // teal road jersey; Wikipedia: teal, bronze
  "Washington Wizards": [
    [1977, 1997, "#EA2A33", "#174BAA"],   // red road jersey with blue (Bullets); Wikipedia
    [1998, 2011, "#045084", "#8C644C"],   // blue road jersey; logo blue, bronze, black
    [2012, 9999, "#002B5C", "#E31837"]],   // red road jersey with navy; Wikipedia (current)
}, { confirmed: 2027 });
