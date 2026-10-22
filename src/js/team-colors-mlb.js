// MLB team colors by era, keyed by the team names GRIFFEY uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary]
// Seasons are GRIFFEY's keys (calendar year).
//
// Sources: Wikipedia's dated MLB color eras (Module:Sports color/baseball).
// Baseball jerseys are white and gray, so primary is the team's main color,
// usually the cap, black included (the Orioles lead with orange). A new era
// starts only when the pair visibly changes (royal blue and navy count as
// different); order flips in the source with no real change are ignored.
// Reviewed with Ronjan 2026-10-22
// (https://claude.ai/artifact/J3soVqQKYBmGb9nw5Tfu6m).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("MLB", {
  "Arizona Diamondbacks": [
    [1998, 2006, "#5F249F", "#005F61"],   // original purple and teal; Wikipedia 1998-2006
    [2007, 2023, "#A71930", "#E3D4AD"],   // 2007 rebrand: Sedona red and sand; Wikipedia 2007-23
    [2024, 9999, "#AA182C", "#3EC1CC"]],   // teal back with Sedona red in 2024; Wikipedia (current)
  "Atlanta Braves": [
    [1966, 1971, "#0C2340", "#C8102E"],   // navy and red, carried from Milwaukee; Wikipedia
    [1972, 1980, "#CE1141", "#003087"],   // 1972 redesign: red lead with royal blue; Wikipedia 1972-80
    [1981, 1986, "#0033A0", "#D50032"],   // royal blue and red; Wikipedia 1981-86
    [1987, 9999, "#13274F", "#CE1141"]],   // 1987 return to navy and red; Wikipedia (current)
  "Baltimore Orioles": [[1961, 9999, "#DF4601", "#000000"]],   // orange and black every era; orange leads as the signature color (Ronjan's call)
  "Boston Red Sox": [[1961, 9999, "#BD3039", "#0D2B56"]],   // red and navy every era; Wikipedia flips which comes first in some years
  "Chicago Cubs": [[1961, 9999, "#0E3386", "#CC3433"]],   // blue and red every era; Wikipedia
  "Chicago White Sox": [
    [1961, 1963, "#000000", "#C8102E"],   // black and red; Wikipedia 1951-63
    [1964, 1968, "#0C2340", "#C8102E"],   // navy and red; Wikipedia 1964-68
    [1969, 1975, "#003087", "#C8102E"],   // royal blue and red; Wikipedia 1969-75
    [1976, 1990, "#0C2340", "#C8102E"],   // navy and red (Veeck era and the 1987-90 set); Wikipedia
    [1991, 9999, "#000000", "#C4CED4"]],   // 1991 rebrand: black and silver; Wikipedia (current)
  "Cincinnati Reds": [
    [1961, 1967, "#C8102E", "#0C2340"],   // red with navy; Wikipedia 1961-67
    [1968, 1998, "#C6011F", "#FFFFFF"],   // red and white (Big Red Machine); Wikipedia 1968-98
    [1999, 9999, "#C6011F", "#000000"]],   // black added in 1999; Wikipedia (current)
  "Cleveland Guardians": [[1961, 9999, "#002B5C", "#E31937"]],   // navy and red every era (Indians, then Guardians); Wikipedia
  "Colorado Rockies": [[1993, 9999, "#33006F", "#000000"]],   // purple and black every year; Wikipedia
  "Detroit Tigers": [[1961, 9999, "#0C2C56", "#FF6600"]],   // navy and orange every year; Wikipedia
  "Houston Astros": [
    [1962, 1993, "#041E42", "#FA4616"],   // navy and orange (Colt .45s, then the rainbow era); Wikipedia
    [1994, 1999, "#0C2340", "#BA9765"],   // 1994 rebrand: navy and gold; Wikipedia 1994-99
    [2000, 2012, "#9A332A", "#D3BC8D"],   // 2000 rebrand: brick red and sand; Wikipedia 2000-12
    [2013, 9999, "#002D62", "#EB6E1F"]],   // 2013 return to navy and orange; Wikipedia (current)
  "Kansas City Athletics": [
    [1961, 1962, "#0C2340", "#C8102E"],   // navy and red; Wikipedia 1955-62
    [1963, 1967, "#00843D", "#FFCD00"]],   // Finley's kelly green and gold; Wikipedia 1963-67
  "Kansas City Royals": [[1969, 9999, "#004687", "#BD9B60"]],   // royal blue and gold every year (gold shade varies); Wikipedia
  "Las Vegas Athletics": [[2025, 9999, "#003831", "#EFB21E"]],   // green and gold; Wikipedia (Athletics)
  "Los Angeles Angels": [
    [1961, 2001, "#041C2C", "#BF0D3E"],   // navy and red (Los Angeles, California, and Anaheim through 2001); Wikipedia
    [2002, 9999, "#BA0021", "#003263"]],   // 2002 rebrand: red caps and red lead, with navy; Wikipedia (current)
  "Los Angeles Dodgers": [[1961, 9999, "#005A9C", "#FFFFFF"]],   // Dodger blue and white every year; Wikipedia
  "Miami Marlins": [
    [1993, 2011, "#000000", "#009CA6"],   // Florida Marlins: black and teal; Wikipedia
    [2012, 2018, "#000000", "#FF6600"],   // Miami rebrand: black and orange (with the rainbow); Wikipedia 2012-18
    [2019, 9999, "#000000", "#00A3E0"]],   // 2019 rebrand: black and Miami blue; Wikipedia (current)
  "Milwaukee Braves": [[1961, 1965, "#0C2340", "#C8102E"]],   // navy and red; Wikipedia
  "Milwaukee Brewers": [
    [1970, 1993, "#003DA5", "#FED141"],   // royal blue and gold (ball-in-glove from 1978); Wikipedia 1970-93
    [1994, 2019, "#0A2351", "#B6922E"],   // 1994 rebrand: navy and metallic gold; Wikipedia 1994-2019
    [2020, 9999, "#12284B", "#FFC52F"]],   // 2020: ball-in-glove back, navy and yellow gold; Wikipedia (current)
  "Minnesota Twins": [[1961, 9999, "#002B5C", "#D31145"]],   // navy and red every era; Wikipedia lists red first for 1976-86
  "Montreal Expos": [[1969, 2004, "#003087", "#E4002B"]],   // royal blue and red; Wikipedia
  "New York Mets": [[1962, 9999, "#002D72", "#FF5910"]],   // blue and orange every year; Wikipedia
  "New York Yankees": [[1961, 9999, "#132448", "#FFFFFF"]],   // navy and white every year; Wikipedia
  "Oakland Athletics": [
    [1968, 1981, "#00843D", "#FFCD00"],   // kelly green and gold (Swingin' A's); Wikipedia 1968-81
    [1982, 2024, "#003831", "#EFB21E"]],   // 1982: forest green and gold; Wikipedia (current)
  "Philadelphia Phillies": [
    [1961, 1974, "#E81828", "#FFFFFF"],   // red and white; Wikipedia 1950-74
    [1975, 1991, "#860038", "#6CADDF"],   // maroon and powder blue (Schmidt era); Wikipedia 1975-91
    [1992, 9999, "#E81828", "#002D72"]],   // 1992: red with blue; Wikipedia (current)
  "Pittsburgh Pirates": [[1961, 9999, "#000000", "#FDB827"]],   // black and gold every era; Wikipedia
  "San Diego Padres": [
    [1969, 1984, "#693F23", "#FFCD00"],   // brown and gold; Wikipedia 1969-84
    [1985, 1990, "#3F2021", "#E35205"],   // brown and orange; Wikipedia 1985-90
    [1991, 2003, "#0C2340", "#E35205"],   // navy and orange; Wikipedia 1991-2003
    [2004, 2011, "#05143F", "#D0AD7F"],   // Petco Park era: navy and sand; Wikipedia 2004-11
    [2012, 2019, "#002D62", "#FFFFFF"],   // navy and white (gold only for 2016); Wikipedia 2012-19
    [2020, 9999, "#2F241D", "#FFC425"]],   // 2020 return to brown and gold; Wikipedia (current)
  "San Francisco Giants": [[1961, 9999, "#000000", "#FD5A1E"]],   // black and orange every era; Wikipedia
  "Seattle Mariners": [
    [1977, 1992, "#012169", "#FFCD00"],   // royal blue and gold; Wikipedia 1977-92
    [1993, 9999, "#0C2C56", "#005C5C"]],   // 1993 rebrand: navy and teal; Wikipedia (current)
  "Seattle Pilots": [[1969, 1969, "#012169", "#FED141"]],   // royal blue and gold; Wikipedia
  "St. Louis Cardinals": [[1961, 9999, "#C41E3A", "#0C2340"]],   // red and navy every era; Wikipedia
  "Tampa Bay Rays": [
    [1998, 2000, "#000000", "#211551"],   // Devil Rays: black with purple (the rainbow era); Wikipedia 1998-2000
    [2001, 2007, "#034638", "#000000"],   // 2001: green and black; Wikipedia 2001-07
    [2008, 9999, "#092C5C", "#8FBCE6"]],   // 2008 rebrand to Rays: navy and light blue; Wikipedia (current)
  "Texas Rangers": [
    [1972, 1993, "#0033A0", "#E4002B"],   // royal blue and red; Wikipedia 1972-93
    [1994, 2002, "#C0111F", "#003278"],   // 1994 (Ballpark era): red lead with blue; Wikipedia 1994-2002
    [2003, 9999, "#003278", "#C0111F"]],   // blue lead again from 2003; Wikipedia (current)
  "Toronto Blue Jays": [
    [1977, 1996, "#134A8E", "#6CACE4"],   // royal blue and light blue (powder blue road uniforms); Wikipedia 1977-88
    [1997, 2003, "#002F6C", "#E8291C"],   // darker blue with red (red maple leaf); Wikipedia 2003
    [2004, 2011, "#004B87", "#717371"],   // 2004 rebrand: blue with graphite gray and black; Wikipedia 2004-11
    [2012, 9999, "#134A8E", "#1D2D5C"]],   // 2012 return to royal blue, with navy (Ronjan's call: red is muted on the uniforms outside the maple leaf)
  "Washington Nationals": [[2005, 9999, "#AB0003", "#11225B"]],   // red and navy; Wikipedia
  "Washington Senators": [[1961, 1971, "#C8102E", "#0C2340"]],   // red and navy; Wikipedia 1961-71
}, { confirmed: 2026 });
