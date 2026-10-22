// WNBA team colors by era, keyed by the team names LOBO uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary]
//
// Sources: era years from each team's primary-logo history on SportsLogos.net
// and its Wikipedia article. Current and final-era hex values from Wikipedia's
// team color data (Module:Sports color/basketball); older eras sampled from that
// era's primary logo ("logo"). Researched 2026-10-22.
TeamColors.register("WNBA", {
  "Atlanta Dream": [
    [2008, 2019, "#4C90CC", "#E41834"],          // logo: sky blue, red
    [2020, 9999, "#E31837", "#373A36"]],         // red, dark grey
  "Charlotte Sting": [
    [1997, 2003, "#301048", "#2898A0"],          // logo: purple, teal (Hornets colors)
    [2004, 2006, "#325A8B", "#F26531"]],         // blue, orange (Bobcats colors)
  "Chicago Sky": [[2006, 9999, "#5091CD", "#FFD520"]],
  "Cleveland Rockers": [[1997, 2003, "#4682B4", "#000000"]],
  "Connecticut Sun": [
    [2003, 2020, "#F47424", "#C41030"],          // logo: orange, red
    [2021, 9999, "#F05023", "#0A2240"]],         // orange, navy
  "Dallas Wings": [[2016, 9999, "#002B5C", "#C4D600"]],
  "Detroit Shock": [
    [1998, 2002, "#F4A00C", "#106C6C"],          // logo: gold, teal
    [2003, 2009, "#ED174C", "#006BB6"]],
  "Golden State Valkyries": [[2025, 9999, "#B896D4", "#000000"]],
  "Houston Comets": [[1997, 2008, "#CE1141", "#00285E"]],
  "Indiana Fever": [[2000, 9999, "#002D62", "#E03A3E"]],
  "Las Vegas Aces": [
    [2018, 2023, "#B80828", "#000000"],          // logo: red, black (gold accent)
    [2024, 9999, "#A7A8AA", "#000000"]],         // silver, black
  "Los Angeles Sparks": [[1997, 9999, "#552583", "#FDB927"]],
  "Miami Sol": [[2000, 2002, "#B22222", "#F49C34"]],
  "Minnesota Lynx": [
    [1999, 2017, "#145084", "#048454"],          // logo: blue, green
    [2018, 9999, "#0C233F", "#266092"]],         // midnight navy, lake blue
  "New York Liberty": [
    [1997, 2019, "#0048B8", "#F86018"],          // logo: blue, orange
    [2020, 9999, "#86CEBC", "#000000"]],         // seafoam, black
  "Orlando Miracle": [[1999, 2002, "#187CB4", "#000000"]],   // logo: electric blue, black
  "Phoenix Mercury": [
    [1997, 2010, "#EC3834", "#F4E450"],          // logo: red, yellow
    [2011, 2025, "#3C247C", "#E4601C"],          // logo: purple, orange
    [2026, 9999, "#3C286E", "#FA4B0A"]],         // purple, orange
  "Portland Fire": [
    [2000, 2002, "#E03A3E", "#000000"],          // red, black
    [2026, 9999, "#C8102E", "#3F3735"]],
  "Sacramento Monarchs": [[1997, 2009, "#753BBD", "#CE1141"]],
  "San Antonio Silver Stars": [[2003, 2017, "#C4CCD4", "#000000"]],   // logo: silver, black
  "Seattle Storm": [
    [2000, 2015, "#34584C", "#8C202C"],          // logo: green, red
    [2016, 9999, "#2C5235", "#FEE11A"]],         // green, yellow
  "Toronto Tempo": [[2026, 9999, "#441E36", "#B3C7E7"]],
  "Tulsa Shock": [[2010, 2015, "#FDBB30", "#C41230"]],
  "Utah Starzz": [[1997, 2002, "#008080", "#483D8B"]],
  "Washington Mystics": [
    [1998, 2010, "#004880", "#B87040"],          // logo: blue, bronze
    [2011, 9999, "#E03A3E", "#002B5C"]],         // red, navy
});
