// College football team colors by era, keyed by the school names SALAAM uses
// (see team-colors.js). [first season, last season (9999 = ongoing), primary,
// secondary]. Seasons are SALAAM's keys (the year a season starts).
//
// Source: Wikipedia's school color data (Module:College color/data, cited to
// each school's brand guide), plus team uniform histories where colors
// changed. Primary is the main home jersey's color, black included; a school
// that lists only white besides its main color gets white. School colors
// rarely change, so most schools have one era. Reviewed with Ronjan
// 2026-10-22 (https://claude.ai/artifact/AGg7k1FQRTJt6evFLQJa6L).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new teams. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current team has no colors.
TeamColors.register("CFB", {
  "Air Force": [[1983, 9999, "#003594", "#B2B4B2"]],   // blue / silver
  "Akron": [[1987, 9999, "#041E42", "#A89968"]],   // blue / gold
  "Alabama": [[1983, 9999, "#B30838", "#FFFFFF"]],   // crimson / white
  "App State": [[2014, 9999, "#222222", "#FFCC00"]],   // black / gold
  "Arizona": [[1983, 9999, "#AB0520", "#0C234B"]],   // cardinal / navy
  "Arizona State": [[1983, 9999, "#7D2248", "#FFC72C"]],   // maroon / gold
  "Arkansas": [[1983, 9999, "#A41F35", "#FFFFFF"]],   // cardinal / white
  "Arkansas State": [[1990, 9999, "#CC092F", "#000000"]],   // scarlet / black
  "Army": [[1983, 9999, "#2C2A29", "#D3BC8D"]],   // black / gold / gray
  "Auburn": [[1983, 9999, "#03244D", "#F26522"]],   // navy blue / burnt orange
  "Ball State": [[1983, 9999, "#BA0C2F", "#FFFFFF"]],   // cardinal / white
  "Baylor": [[1983, 9999, "#154734", "#FFB81C"]],   // green / gold
  "Boise State": [[1996, 9999, "#0033A0", "#D64309"]],   // blue / orange
  "Boston College": [[1983, 9999, "#8C2232", "#DBCCA6"]],   // maroon / gold
  "Bowling Green": [[1983, 9999, "#4F2C1D", "#FF7300"]],   // brown / orange
  "Buffalo": [[1999, 9999, "#005BBB", "#FFFFFF"]],   // royal blue / white
  "BYU": [[1983, 9999, "#003DA5", "#FFFFFF"]],   // blue / white
  "Cal State Fullerton": [[1983, 1992, "#00244E", "#FF7900"]],   // navy blue / white / orange
  "California": [[1983, 9999, "#041E42", "#FFC72C"]],   // blue / gold
  "Central Michigan": [[1983, 9999, "#6A0032", "#FFC82E"]],   // maroon / gold
  "Charlotte": [[2015, 9999, "#005035", "#FFFFFF"]],   // green / white
  "Cincinnati": [[1983, 9999, "#E00122", "#000000"]],   // red / black
  "Clemson": [[1983, 9999, "#F56600", "#522D80"]],   // orange / regalia
  "Coastal Carolina": [[2017, 9999, "#006F71", "#A27752"]],   // teal / bronze / black
  "Colorado": [[1983, 9999, "#000000", "#CFB87C"]],   // black / gold / silver
  "Colorado State": [[1983, 9999, "#1E4D2B", "#C8C372"]],   // green / gold
  "Delaware": [[2025, 9999, "#00539F", "#FFD200"]],   // royal blue / gold
  "Drake": [[1983, 1985, "#1B4677", "#FFFFFF"]],   // blue / white
  "Duke": [[1983, 9999, "#013088", "#FFFFFF"]],   // Duke blue / white
  "East Carolina": [[1983, 9999, "#582C83", "#FFC72C"]],   // purple / gold
  "Eastern Michigan": [[1983, 9999, "#046A38", "#FFFFFF"]],   // green / white
  "Florida": [[1983, 9999, "#003087", "#FA4616"]],   // blue / orange
  "Florida A&M": [[2004, 2005, "#008344", "#F4811F"]],   // green / orange
  "Florida Atlantic": [[2005, 9999, "#003366", "#CC0000"]],   // blue / red
  "Florida International": [[2005, 9999, "#081E3F", "#B6862C"]],   // blue / gold
  "Florida State": [[1983, 9999, "#782F40", "#CEB888"]],   // garnet / gold
  "Fresno State": [[1983, 9999, "#C41230", "#13284C"]],   // cardinal red / blue
  "Georgia": [[1983, 9999, "#BA0C2F", "#000000"]],   // red / black
  "Georgia Southern": [[2014, 9999, "#041E42", "#FFFFFF"]],   // blue / white
  "Georgia State": [[2013, 9999, "#0039A6", "#FFFFFF"]],   // blue / white
  "Georgia Tech": [[1983, 9999, "#B39051", "#003057"]],   // gold / white, navy accent
  "Hawai'i": [
    [1983, 1999, "#005838", "#FFFFFF"],   // Rainbows era: green and white
    [2000, 9999, "#005838", "#231F20"]],   // 2000 rebrand to Warriors added black and silver; black stayed after the Rainbow Warriors name returned in 2013 (green, white, black, silver)
  "Houston": [[1983, 9999, "#C92A39", "#FFFFFF"]],   // scarlet / white
  "Idaho": [[1996, 2018, "#EAAB00", "#808080"]],   // Vandal gold / silver
  "Illinois": [[1983, 9999, "#13294B", "#FF5F05"]],   // blue / orange
  "Illinois State": [[1983, 1986, "#CE142B", "#FFFFFF"]],   // red / white
  "Indiana": [[1983, 9999, "#990000", "#EDEBEB"]],   // crimson / cream
  "Indiana State": [[1983, 1986, "#224E92", "#FFFFFF"]],   // royal blue / white
  "Iowa": [[1983, 9999, "#000000", "#FCD116"]],   // black / gold
  "Iowa State": [[1983, 9999, "#C8102E", "#F1BE48"]],   // cardinal / gold
  "Jacksonville State": [[2023, 9999, "#CA2026", "#FFFFFF"]],   // red / white
  "James Madison": [[2022, 9999, "#450084", "#B3A369"]],   // purple / gold
  "Kansas": [[1983, 9999, "#0051BA", "#E8000D"]],   // blue / crimson
  "Kansas State": [[1983, 9999, "#330A57", "#FFFFFF"]],   // royal purple / white
  "Kennesaw State": [[2024, 9999, "#0B1315", "#FDBB30"]],   // black / gold
  "Kent State": [[1983, 9999, "#002664", "#EFAB00"]],   // navy blue / gold
  "Kentucky": [[1983, 9999, "#0033A0", "#FFFFFF"]],   // blue / white
  "Liberty": [[2018, 9999, "#0A254E", "#B72025"]],   // blue / white / red
  "Long Beach State": [[1983, 1991, "#000000", "#ECAA00"]],   // black / gold
  "Louisiana": [[1983, 9999, "#CE181E", "#FFFFFF"]],   // vermilion / white
  "Louisiana Tech": [[1988, 9999, "#003087", "#CB333B"]],   // blue / red
  "Louisville": [[1983, 9999, "#C9001F", "#000000"]],   // red / black
  "LSU": [[1983, 9999, "#461D7C", "#FDD023"]],   // purple / gold
  "Marshall": [[1997, 9999, "#00B140", "#FFFFFF"]],   // Kelly green / white
  "Maryland": [[1983, 9999, "#CE1126", "#000000"]],   // red / white / black / gold
  "Massachusetts": [[2012, 9999, "#881C1C", "#FFFFFF"]],   // maroon / white
  "Memphis": [[1983, 9999, "#004991", "#8E908F"]],   // blue / gray
  "Miami": [[1983, 9999, "#005030", "#F05A00"]],   // green / white / orange
  "Miami (OH)": [[1983, 9999, "#B61E2E", "#FFFFFF"]],   // red / white (Redskins through 1996, RedHawks since)
  "Michigan": [[1983, 9999, "#00274C", "#FFCB05"]],   // blue / maize
  "Michigan State": [[1983, 9999, "#173F35", "#FFFFFF"]],   // green / white
  "Middle Tennessee": [[1999, 9999, "#0066CC", "#FFFFFF"]],   // royal blue / white
  "Minnesota": [[1983, 9999, "#5B0013", "#FFB71E"]],   // maroon / gold
  "Mississippi State": [[1983, 9999, "#5D1725", "#FFFFFF"]],   // maroon / white
  "Missouri": [[1983, 9999, "#000000", "#FDB719"]],   // black / gold
  "Missouri State": [[2025, 9999, "#5E0009", "#FFFFFF"]],   // maroon / white
  "Navy": [[1983, 9999, "#00225B", "#B5A67C"]],   // navy blue / gold
  "NC State": [[1983, 9999, "#CC0000", "#FFFFFF"]],   // red / white
  "Nebraska": [[1983, 9999, "#D00000", "#F5F1E7"]],   // scarlet / cream
  "Nevada": [[1992, 9999, "#041E42", "#74767B"]],   // navy blue / silver
  "New Mexico": [[1983, 9999, "#BA0C2F", "#A7A8AA"]],   // cherry / silver
  "New Mexico State": [[1983, 9999, "#7E141B", "#FFFFFF"]],   // crimson / white
  "North Carolina": [[1983, 9999, "#7BAFD4", "#FFFFFF"]],   // Carolina blue / white
  "North Dakota State": [[2026, 9999, "#005643", "#FFC82E"]],   // green / yellow
  "North Texas": [[1983, 9999, "#00853E", "#FFFFFF"]],   // green / white
  "Northern Illinois": [[1983, 9999, "#BA0C2F", "#27251F"]],   // cardinal / black
  "Northwestern": [[1983, 9999, "#582C83", "#FFFFFF"]],   // purple / white
  "Notre Dame": [[1983, 9999, "#0C2340", "#C99700"]],   // blue / gold
  "Ohio": [[1983, 9999, "#154734", "#FFFFFF"]],   // hunter green / white
  "Ohio State": [[1983, 9999, "#BA0C2F", "#A7B1B7"]],   // scarlet / gray
  "Oklahoma": [[1983, 9999, "#841617", "#F0EBC4"]],   // crimson / cream
  "Oklahoma State": [[1983, 9999, "#FE5C00", "#000000"]],   // orange / black
  "Old Dominion": [[2014, 9999, "#003767", "#95999C"]],   // slate blue / silver / light blue
  "Ole Miss": [[1983, 9999, "#CE1126", "#14213D"]],   // red home jerseys with navy; official colors kept over the powder blue home jersey used since 2020 (Ronjan's call)
  "Oregon": [[1983, 9999, "#007030", "#FEE11A"]],   // green / yellow
  "Oregon State": [[1983, 9999, "#D73F09", "#000000"]],   // orange / black
  "Pacific": [[1983, 1995, "#000000", "#F47920"]],   // black / orange
  "Penn State": [[1983, 9999, "#001E44", "#FFFFFF"]],   // Blue / white
  "Pittsburgh": [
    [1983, 1996, "#003594", "#FFB81C"],   // royal blue and gold
    [1997, 2018, "#1C2957", "#CDB87D"],   // 1997 rebrand: navy and Vegas gold
    [2019, 9999, "#003594", "#FFB81C"]],   // 2019: back to royal blue and gold; Wikipedia school colors
  "Purdue": [[1983, 9999, "#000000", "#CFB991"]],   // black / old gold
  "Rice": [[1983, 9999, "#00205B", "#C1C6C8"]],   // blue / gray
  "Richmond": [[1983, 1984, "#000066", "#990000"]],   // blue / red
  "Rutgers": [[1983, 9999, "#CC0033", "#FFFFFF"]],   // scarlet
  "Sacramento State": [[2026, 9999, "#043927", "#C4B581"]],   // green / gold
  "Sam Houston": [[2023, 9999, "#F56423", "#FFFFFF"]],   // orange / white
  "San Diego State": [[1983, 9999, "#C41230", "#000000"]],   // scarlet / black
  "San José State": [[1983, 9999, "#0038A8", "#FFB81A"]],   // blue / white / gold
  "SMU": [[1983, 9999, "#CC0035", "#354CA1"]],   // red / blue
  "South Alabama": [[2012, 9999, "#00205B", "#BF0D3E"]],   // blue / white / red
  "South Carolina": [[1983, 9999, "#73000A", "#000000"]],   // garnet / black
  "South Florida": [[2000, 9999, "#006747", "#CFC493"]],   // green / gold
  "Southern Illinois": [[1983, 1986, "#72253D", "#FFFFFF"]],   // maroon / white
  "Southern Miss": [[1983, 9999, "#000000", "#FFD046"]],   // black / gold
  "Stanford": [[1983, 9999, "#8C1515", "#FFFFFF"]],   // cardinal / white
  "Syracuse": [[1983, 9999, "#FF431B", "#000E54"]],   // orange, with navy as the second color
  "TCU": [[1983, 9999, "#4D1979", "#FFFFFF"]],   // purple / white
  "Temple": [[1983, 9999, "#990033", "#FFFFFF"]],   // cherry / white
  "Tennessee": [[1983, 9999, "#FF8200", "#FFFFFF"]],   // orange / white
  "Texas": [[1983, 9999, "#BF5700", "#FFFFFF"]],   // burnt orange / white
  "Texas A&M": [[1983, 9999, "#500000", "#FFFFFF"]],   // maroon / white
  "Texas State": [[2012, 9999, "#501214", "#6A5638"]],   // maroon / gold
  "Texas Tech": [[1983, 9999, "#C30020", "#000000"]],   // scarlet / black
  "Toledo": [[1983, 9999, "#0B2240", "#FFCD00"]],   // midnight blue / gold
  "Troy": [[2001, 9999, "#98002E", "#999999"]],   // cardinal / silver / black
  "Tulane": [[1983, 9999, "#006548", "#3A8DDE"]],   // olive green / sky blue
  "Tulsa": [[1983, 9999, "#003595", "#D0B787"]],   // royal blue / old gold / crimson
  "UAB": [[1996, 9999, "#1A5632", "#FDB913"]],   // UAB Green / UAB Gold
  "UCF": [[1996, 9999, "#000000", "#B7A369"]],   // black / gold
  "UCLA": [[1983, 9999, "#2774AE", "#F2A900"]],   // blue / gold
  "UConn": [[2000, 9999, "#000E2F", "#FFFFFF"]],   // national flag blue / white
  "UL Monroe": [[1994, 9999, "#840029", "#FDB913"]],   // maroon / gold
  "UNLV": [[1983, 9999, "#CF0A2C", "#CAC8C8"]],   // scarlet / gray
  "USC": [[1983, 9999, "#9D2235", "#FFC72C"]],   // cardinal / gold
  "Utah": [[1983, 9999, "#BE0000", "#FFFFFF"]],   // red / white
  "Utah State": [[1983, 9999, "#00263A", "#8A8D8F"]],   // navy blue / white / pewter gray
  "UTEP": [[1983, 9999, "#041E42", "#FF8200"]],   // dark blue / orange / silver accent
  "UTSA": [[2012, 9999, "#0B2240", "#E14504"]],   // navy blue / white / orange
  "Vanderbilt": [[1983, 9999, "#000000", "#CFAE70"]],   // black / gold
  "Virginia": [[1983, 9999, "#232D4B", "#F84C1E"]],   // blue / orange
  "Virginia Tech": [[1983, 9999, "#861F41", "#E87722"]],   // Chicago maroon / burnt orange
  "Wake Forest": [[1983, 9999, "#2C2A29", "#CEB888"]],   // black / old gold
  "Washington": [[1983, 9999, "#33006F", "#E8D3A2"]],   // purple / gold
  "Washington State": [[1983, 9999, "#981E32", "#53565A"]],   // crimson / gray
  "West Texas A&M": [[1983, 1985, "#581818", "#FFFFFF"]],   // maroon / white
  "West Virginia": [[1983, 9999, "#002855", "#EAAA00"]],   // blue / gold
  "Western Kentucky": [[2007, 9999, "#B01E24", "#FFFFFF"]],   // red / white
  "Western Michigan": [[1983, 9999, "#532E1F", "#F1C500"]],   // brown / gold
  "Wichita State": [[1983, 1986, "#27251F", "#FFCD00"]],   // black / yellow
  "William & Mary": [[1983, 1984, "#004E38", "#B79257"]],   // green / gold / silver
  "Wisconsin": [[1983, 9999, "#C5050C", "#FFFFFF"]],   // cardinal / white
  "Wyoming": [[1983, 9999, "#492F24", "#FFC425"]],   // brown / gold
}, { confirmed: 2026 });
