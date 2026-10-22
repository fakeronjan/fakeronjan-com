// NFL team colors by era, keyed by the team names DILLON uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary, options]
// Seasons are DILLON's keys (the year a season starts).
//
// Sources: Wikipedia's dated NFL color eras (Module:Gridiron color/data),
// checked against home-jersey and primary-logo colors from SportsLogos.net.
// A new era starts only when the color pair visibly changes; shade tweaks
// keep the newer shade. Royal blue and navy count as different. Primary is
// the main jersey's color. Reviewed with Ronjan 2026-10-22
// (https://claude.ai/artifact/XZURq222nAGu4tvW6XJEnL).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("NFL", {
  "Arizona Cardinals": [[1988, 9999, "#97233F", "#000000"]],   // cardinal red jerseys with black every year since the move (Phoenix 1988-93); 2005 redesign added more black but kept the pair; Wikipedia (current)
  "Atlanta Falcons": [
    [1971, 1989, "#C60C30", "#000000"],   // red jerseys with black; Wikipedia 1971-89
    [1990, 2003, "#000000", "#C60C30", {blackPrimary: true}],   // black jerseys with red (Ronjan's call: primary follows the main jersey, black included, for the Falcons)
    [2004, 2019, "#A71930", "#000000"],   // red jerseys with black
    [2020, 9999, "#000000", "#A71930", {blackPrimary: true}]],   // 2020 redesign: black jerseys with red (Ronjan's call)
  "Baltimore Colts": [[1971, 1983, "#003B8F", "#FFFFFF"]],   // royal blue jerseys, white helmets; blue and white are the only team colors
  "Baltimore Ravens": [[1996, 9999, "#241773", "#000000"]],   // purple jerseys with black trim; Wikipedia lists purple, black, metallic gold
  "Buffalo Bills": [
    [1971, 2001, "#00338D", "#C60C30"],   // royal blue jerseys with red
    [2002, 2010, "#00274D", "#C60C30"],   // 2002 redesign: navy jerseys with red; Wikipedia 2002-10
    [2011, 9999, "#00338D", "#C60C30"]],   // back to royal blue with red in 2011; Wikipedia (current)
  "Carolina Panthers": [[1995, 9999, "#0085CA", "#000000"]],   // black jerseys with Panthers blue and silver; black is never primary, so blue leads; Wikipedia (current)
  "Chicago Bears": [[1971, 9999, "#0B162A", "#C83803"]],   // navy jerseys with orange every year; Wikipedia (current)
  "Cincinnati Bengals": [[1971, 9999, "#FB4F14", "#000000"]],   // orange and black every era (orange jerseys 1971-80, black since 1981 with orange stripes); Wikipedia (current)
  "Cleveland Browns": [[1971, 9999, "#311D00", "#FF3C00"]],   // brown jerseys with orange every year (1999-2014 shade darker); Wikipedia (current)
  "Dallas Cowboys": [[1971, 9999, "#041E42", "#869397"]],   // navy and silver every era (the Cowboys wear white at home); Wikipedia (current)
  "Denver Broncos": [
    [1971, 1996, "#FB4F14", "#0A3D91"],   // Orange Crush: orange jerseys, royal blue helmets and trim; Wikipedia 1962-96 (orange, royal blue)
    [1997, 2011, "#002244", "#FB4F14"],   // 1997 redesign: navy jerseys with orange (Ronjan's call: navy primary while it was the main jersey)
    [2012, 9999, "#FB4F14", "#002244"]],   // orange became the main jersey again in 2012; Wikipedia (current)
  "Detroit Lions": [[1971, 9999, "#0076B6", "#B0B7BC"]],   // Honolulu blue and silver every year; Wikipedia (current)
  "Green Bay Packers": [[1971, 9999, "#203731", "#FFB612"]],   // green jerseys with gold every year; Wikipedia (current)
  "Houston Oilers": [[1971, 1996, "#4B92DB", "#C8102E"]],   // Columbia blue jerseys with scarlet; Wikipedia (Oilers)
  "Houston Texans": [[2002, 9999, "#03202F", "#C8102E"]],   // deep steel blue jerseys with battle red; 2024 redesign kept the pair (red a little brighter); Wikipedia
  "Indianapolis Colts": [[1984, 9999, "#002C5F", "#FFFFFF"]],   // blue jerseys, white helmets; blue and white every year (gray only as facemask trim); Wikipedia (current)
  "Jacksonville Jaguars": [
    [1995, 2012, "#006778", "#000000"],   // teal jerseys with black (and gold trim through 2008)
    [2013, 2017, "#006778", "#D7A22A"],   // 2013 redesign: black-and-gold jerseys with teal accents (Ronjan's call: teal and gold)
    [2018, 9999, "#006778", "#000000"]],   // 2018 redesign: teal and black; Wikipedia (current)
  "Kansas City Chiefs": [[1971, 9999, "#E31837", "#FFB612"]],   // red jerseys with gold every year; Wikipedia (current)
  "Las Vegas Raiders": [[2020, 9999, "#A5ACAF", "#000000"]],   // silver and black; Wikipedia
  "Los Angeles Chargers": [
    [2017, 2018, "#002A5E", "#FFC20E"],   // navy jerseys with gold (first two LA seasons); Wikipedia 2017-18
    [2019, 9999, "#0080C6", "#FFC20E"]],   // powder blue became the main jersey in 2019; Wikipedia (current)
  "Los Angeles Raiders": [[1982, 1994, "#A5ACAF", "#000000"]],   // silver and black
  "Los Angeles Rams": [
    [1971, 1972, "#002244", "#FFFFFF"],   // blue and white uniforms (before the 1973 yellow horns); Wikipedia 1964-72
    [1973, 1994, "#003594", "#FFD100"],   // royal blue jerseys with yellow; Wikipedia 1973-94
    [2016, 2019, "#002244", "#B3995D"],   // back in LA with St. Louis's navy and metallic gold jerseys (Wikipedia lists royal for 2018-19, but that was the alternate)
    [2020, 9999, "#003594", "#FFD100"]],   // 2020 redesign: royal blue and sol yellow; Wikipedia (current)
  "Miami Dolphins": [[1971, 9999, "#008E97", "#FC4C02"]],   // aqua and orange every year (aqua a bit darker 1974-2012); Wikipedia (current)
  "Minnesota Vikings": [[1971, 9999, "#4F2683", "#FFC62F"]],   // purple jerseys with gold every year; Wikipedia (current)
  "New England Patriots": [
    [1971, 1992, "#C60C30", "#00539B"],   // Pat Patriot era: red jerseys with royal blue; Wikipedia 1971-92
    [1993, 1999, "#0A2C80", "#C60C30"],   // Flying Elvis: royal blue jerseys with red (sampled from the uniform)
    [2000, 9999, "#002244", "#C60C30"]],   // 2000 redesign: navy jerseys with red and silver; Wikipedia (current)
  "New Orleans Saints": [[1971, 9999, "#D3BC8D", "#000000"]],   // black and gold every year; black is never primary, so gold leads (old gold darker before 2000); Wikipedia (current)
  "New York Giants": [
    [1971, 1975, "#140F44", "#E62409"],   // dark navy jerseys with red; Wikipedia 1961-75
    [1976, 1999, "#00338D", "#C60C30"],   // royal blue jerseys with red; Wikipedia 1976-99
    [2000, 9999, "#0B2265", "#A71930"]],   // navy jerseys with red; Wikipedia (current)
  "New York Jets": [
    [1971, 1997, "#00683C", "#FFFFFF"],   // kelly green and white jerseys
    [1998, 2018, "#203731", "#FFFFFF"],   // 1998 return to the Namath-era logo: hunter green and white
    [2019, 9999, "#115740", "#000000"]],   // 2019 redesign: gotham green with black; the 2024 legacy jerseys kept a similar green; Wikipedia (current)
  "Oakland Raiders": [[1971, 2019, "#A5ACAF", "#000000"]],   // silver and black (Oakland 1971-81 and 1995-2019)
  "Philadelphia Eagles": [
    [1971, 1995, "#076B3B", "#A2AAAD"],   // kelly green jerseys with silver; Wikipedia 1973-95
    [1996, 9999, "#004C54", "#A5ACAF"]],   // 1996 redesign: midnight green with silver; Wikipedia (current)
  "Pittsburgh Steelers": [[1971, 9999, "#FFB612", "#000000"]],   // black jerseys with gold every year; black is never primary, so gold leads; Wikipedia (current)
  "San Diego Chargers": [
    [1971, 1973, "#4278B8", "#F1D022"],   // powder blue jerseys with gold; Wikipedia 1961-73
    [1974, 1987, "#001170", "#FAA70A"],   // Air Coryell: royal blue jerseys with gold; Wikipedia 1974-87
    [1988, 2016, "#002A5E", "#FFC20E"]],   // navy jerseys with gold; Wikipedia 1988-2016
  "San Francisco 49ers": [[1971, 9999, "#AA0000", "#B3995D"]],   // red jerseys with gold every year (a darker red 1996-2008); Wikipedia (current)
  "Seattle Seahawks": [
    [1976, 2001, "#00338D", "#008542"],   // royal blue jerseys with green and silver; Wikipedia 1976-2001
    [2002, 2011, "#2D5980", "#62C141"],   // 2002 redesign: Seahawks blue (steel blue) jerseys with lime green trim; sampled from the uniform
    [2012, 9999, "#002244", "#69BE28"]],   // 2012 redesign: college navy with action green; Wikipedia (current)
  "St. Louis Cardinals": [[1971, 1987, "#B8102F", "#000000"]],   // red jerseys; logo cardinal red with black outline (same pair as the Arizona era)
  "St. Louis Rams": [
    [1995, 1999, "#003594", "#FFD100"],   // royal blue jerseys with yellow, carried from LA; Wikipedia 1995-99
    [2000, 2015, "#002244", "#B3995D"]],   // 2000 redesign: navy and metallic gold; Wikipedia (St. Louis)
  "Tampa Bay Buccaneers": [
    [1976, 1996, "#F98E1D", "#CC0000"],   // Bucco Bruce era: creamsicle orange jerseys with red; Wikipedia 1976-96
    [1997, 9999, "#A71930", "#322F2B"]],   // 1997 redesign: red jerseys with pewter (pewter darker since 2014); Wikipedia (current)
  "Tennessee Titans": [
    [1997, 1998, "#4B92DB", "#C8102E"],   // Tennessee Oilers: Columbia blue with scarlet, carried from Houston
    [1999, 2025, "#0C2340", "#4B92DB"],   // Titans navy and Titans blue (jersey switched between navy and light blue a few times; navy most years)
    [2026, 9999, "#4B92DB", "#C8102E"]],   // 2026 redesign: light blue and red (new primary logo); Wikipedia (current)
  "Washington Commanders": [[1971, 9999, "#5A1414", "#FFB612"]],   // burgundy jerseys with gold every year (Redskins, Football Team, Commanders); Wikipedia (current)
}, { confirmed: 2026 });
