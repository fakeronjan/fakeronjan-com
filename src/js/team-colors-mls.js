// MLS team colors by era, keyed by the club names COBI uses (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary]
// Seasons are COBI's keys (calendar year).
//
// Sources: each club's Wikipedia article (infobox home kit, colors and crest
// history) and crest colors by era from SportsLogos.net. Primary is the home
// shirt's color; clubs that wear white at home (Galaxy, Red Bulls, Whitecaps)
// lead with their brand color instead. Secondary is the next most prominent
// color on the uniform. A new era starts only when the pair visibly changes.
// Judgment calls made by Claude at Ronjan's request, 2026-10-22, no review.
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("MLS", {
  "Atlanta United FC": [[2017, 9999, "#80000A", "#000000"]],   // red and black striped home shirt
  "Austin FC": [[2021, 9999, "#00B140", "#000000"]],   // verde home shirt with black
  "CF Montréal": [
    [2012, 2020, "#0033A1", "#000000"],   // Montreal Impact: blue home shirt with black
    [2021, 2022, "#000000", "#0033A0"],   // 2021 rebrand: black home shirt with blue
    [2023, 9999, "#003DA5", "#000000"]],   // 2023: blue home shirt again, black shorts
  "Charlotte FC": [[2022, 9999, "#0085CA", "#000000"]],   // Carolina blue home shirt with black
  "Chicago Fire FC": [
    [1998, 2021, "#C8102E", "#0A174A"],   // red home shirt with navy
    [2022, 9999, "#FF0000", "#7CCDEF"]],   // 2022 crest: red with sky blue
  "Chivas USA": [[2005, 2014, "#C8102E", "#FFFFFF"]],   // red-and-white striped home shirt
  "Colorado Rapids": [
    [1996, 2006, "#0438A4", "#000000"],   // blue and black
    [2007, 9999, "#862633", "#8BB8E8"]],   // 2007 rebrand: burgundy home shirt with sky blue
  "Columbus Crew": [[1996, 9999, "#FEF200", "#000000"]],   // gold home shirt with black
  "D.C. United": [[1996, 9999, "#000000", "#EF3E42"]],   // black home shirt with red
  "FC Cincinnati": [[2019, 9999, "#003087", "#F05323"]],   // blue home shirt with orange
  "FC Dallas": [
    [1996, 2004, "#000000", "#A4182C"],   // Dallas Burn: black with red
    [2005, 9999, "#BF0D3E", "#FFFFFF"]],   // red-and-white hooped home shirt
  "Houston Dynamo FC": [
    [2006, 2020, "#F4911E", "#101E3E"],   // orange home shirt with navy
    [2021, 9999, "#FF6B00", "#101820"]],   // 2021 rebrand: orange with black
  "Inter Miami CF": [[2020, 9999, "#F7B5CD", "#231F20"]],   // pink home shirt with black
  "LA Galaxy": [
    [1996, 2007, "#2C6E49", "#E6B83D"],   // green and gold
    [2008, 9999, "#00245D", "#FFD200"]],   // white home shirt with navy and gold; navy leads
  "LAFC": [[2018, 9999, "#000000", "#C39E6D"]],   // black home shirt with gold
  "Miami Fusion": [[1998, 2001, "#1C39BB", "#FCC808"]],   // blue with gold
  "Minnesota United FC": [[2017, 9999, "#2C2526", "#8CD2F4"]],   // gray home shirt with sky blue
  "Nashville SC": [[2020, 9999, "#ECE83A", "#1F1646"]],   // gold home shirt with navy
  "New England Revolution": [[1996, 9999, "#0A2240", "#CE0E2D"]],   // navy home shirt with red
  "New York City FC": [[2015, 9999, "#6CACE4", "#041E42"]],   // sky blue home shirt with navy
  "Orlando City SC": [[2015, 9999, "#633492", "#FDE192"]],   // purple home shirt with gold
  "Philadelphia Union": [[2010, 9999, "#071B2C", "#B19B69"]],   // navy home shirt with gold
  "Portland Timbers": [[2011, 9999, "#00482B", "#D69A00"]],   // green home shirt with gold
  "Real Salt Lake": [[2005, 9999, "#B30838", "#013A81"]],   // claret home shirt with cobalt
  "Red Bull New York": [
    [1996, 2005, "#000000", "#C8102E"],   // MetroStars: black with red
    [2006, 9999, "#ED1E36", "#23326A"]],   // Red Bulls: white home shirt with red and navy; red leads
  "San Diego FC": [[2025, 9999, "#02152B", "#697A7C"]],   // deep blue home shirt with gray
  "San Jose Earthquakes": [
    [1996, 1999, "#000000", "#D80000"],   // San Jose Clash: black with red
    [2000, 9999, "#0067B1", "#000000"]],   // Earthquakes: blue home shirt with black
  "Seattle Sounders FC": [[2009, 9999, "#00BD62", "#005595"]],   // Rave green home shirt with blue
  "Sporting Kansas City": [
    [1996, 2010, "#3C80C0", "#000000"],   // Wiz/Wizards: blue with black
    [2011, 9999, "#91B0D5", "#002F65"]],   // Sporting blue home shirt with dark indigo
  "St. Louis CITY SC": [[2023, 9999, "#EC1458", "#001544"]],   // red home shirt with navy
  "Tampa Bay Mutiny": [
    [1996, 1999, "#3CA4E0", "#000000"],   // light blue with black
    [2000, 2001, "#58C0E4", "#002058"]],   // light blue with navy
  "Toronto FC": [[2007, 9999, "#B81137", "#455560"]],   // red home shirt with gray
  "Vancouver Whitecaps": [[2011, 9999, "#00245E", "#9DC2EA"]],   // white home shirt with navy and light blue; navy leads
}, { confirmed: 2026 });
