// European club colors (ZIDANE: Premier League, La Liga, Serie A, Bundesliga,
// Ligue 1), keyed by ZIDANE's club names (see team-colors.js).
// [first season, last season (9999 = ongoing), primary, secondary]
// Seasons are the year a ZIDANE season starts (2013 = 2013-14).
//
// Sources: each club's Wikipedia article (home kit and colours history).
// Primary is the home shirt (for striped shirts, the stripe the club is known
// for; clubs that play in white lead with white); secondary is the next most
// prominent color on the uniform. Only Parma and Cardiff changed colors
// within ZIDANE's seasons. Reviewed with Ronjan 2026-10-22
// (https://claude.ai/artifact/AztzLL4TVBKE4sswoiw19C).
//
// `confirmed` (at the bottom) is the last season these were checked for
// rebrands and new clubs. The droplet's daily health check DMs Ronjan once a
// newer season starts, and whenever a current club has no colors.
TeamColors.register("EURO", {
  // Premier League
  "AFC Bournemouth": [[1992, 9999, "#DA291C", "#000000"]],   // red-and-black striped shirt
  "Arsenal FC": [[1992, 9999, "#EF0107", "#FFFFFF"]],   // red shirt with white sleeves
  "Aston Villa FC": [[1992, 9999, "#670E36", "#95BFE5"]],   // claret and sky blue
  "Barnsley FC": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red home shirt, white shorts
  "Birmingham City FC": [[1992, 9999, "#1E3EA6", "#FFFFFF"]],   // blue home shirt, white shorts
  "Blackburn Rovers FC": [[1992, 9999, "#009EE0", "#FFFFFF"]],   // blue-and-white halved shirt
  "Blackpool FC": [[1992, 9999, "#F68712", "#FFFFFF"]],   // tangerine shirt, white shorts
  "Bolton Wanderers FC": [[1992, 9999, "#FFFFFF", "#263C7E"]],   // white home shirt, navy shorts
  "Bradford City AFC": [[1992, 9999, "#6D0D24", "#F9B000"]],   // claret and amber
  "Brentford FC": [[1992, 9999, "#E30613", "#FFFFFF"]],   // red-and-white striped shirt
  "Brighton & Hove Albion FC": [[1992, 9999, "#0057B8", "#FFFFFF"]],   // blue-and-white striped shirt
  "Burnley FC": [[1992, 9999, "#6C1D45", "#99D6EA"]],   // claret and sky blue
  "Cardiff City FC": [
    [2013, 2013, "#E31B23", "#000000"],   // Vincent Tan's red and black home kit (2012-13 to 2014-15)
    [2014, 9999, "#0070B5", "#FFFFFF"]],   // traditional blue and white (restored January 2015)
  "Charlton Athletic FC": [[1992, 9999, "#D4021D", "#FFFFFF"]],   // red home shirt, white shorts
  "Chelsea FC": [[1992, 9999, "#034694", "#FFFFFF"]],   // blue home shirt with white
  "Coventry City FC": [[1992, 9999, "#59CBE8", "#FFFFFF"]],   // sky blue and white
  "Crystal Palace FC": [[1992, 9999, "#1B458F", "#C4122E"]],   // red-and-blue striped shirt
  "Derby County FC": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt, black shorts
  "Everton FC": [[1992, 9999, "#003399", "#FFFFFF"]],   // royal blue shirt, white shorts
  "Fulham FC": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt, black shorts
  "Huddersfield": [[1992, 9999, "#0E63AD", "#FFFFFF"]],   // blue-and-white striped shirt
  "Hull City AFC": [[1992, 9999, "#F5A12D", "#000000"]],   // amber and black
  "Ipswich Town FC": [[1992, 9999, "#0033A0", "#FFFFFF"]],   // blue home shirt, white shorts
  "Leeds United FC": [[1992, 9999, "#FFFFFF", "#1D428A"]],   // all-white home kit with blue and yellow trim
  "Leicester City FC": [[1992, 9999, "#003090", "#FFFFFF"]],   // blue home shirt, white shorts
  "Liverpool FC": [[1992, 9999, "#C8102E", "#FFFFFF"]],   // all-red home kit with white trim
  "Luton Town FC": [[1992, 9999, "#F78F1E", "#002D62"]],   // orange home shirt with navy
  "Manchester City FC": [[1992, 9999, "#6CABDD", "#FFFFFF"]],   // sky blue shirt, white shorts
  "Manchester United FC": [[1992, 9999, "#DA291C", "#FFFFFF"]],   // red shirt, white shorts
  "Middlesbrough FC": [[1992, 9999, "#E11B22", "#FFFFFF"]],   // red home shirt with white
  "Newcastle United FC": [[1992, 9999, "#000000", "#FFFFFF"]],   // black-and-white striped shirt
  "Norwich City FC": [[1992, 9999, "#FFF200", "#00A650"]],   // yellow shirt, green shorts
  "Nottingham Forest FC": [[1992, 9999, "#DD0000", "#FFFFFF"]],   // red shirt, white shorts
  "Oldham Athletic AFC": [[1992, 9999, "#004A98", "#FFFFFF"]],   // blue and white
  "Portsmouth FC": [[1992, 9999, "#001489", "#FFFFFF"]],   // blue shirt, white shorts
  "Queens Park Rangers FC": [[1992, 9999, "#1D5BA4", "#FFFFFF"]],   // blue-and-white hooped shirt
  "Reading FC": [[1992, 9999, "#004494", "#FFFFFF"]],   // blue-and-white hooped shirt
  "Sheffield United FC": [[1992, 9999, "#EE2737", "#FFFFFF"]],   // red-and-white striped shirt
  "Sheffield Wednesday FC": [[1992, 9999, "#0066B2", "#FFFFFF"]],   // blue-and-white striped shirt
  "Southampton FC": [[1992, 9999, "#D71920", "#FFFFFF"]],   // red-and-white striped shirt
  "Stoke City FC": [[1992, 9999, "#E03A3E", "#FFFFFF"]],   // red-and-white striped shirt
  "Sunderland AFC": [[1992, 9999, "#EB172B", "#FFFFFF"]],   // red-and-white striped shirt
  "Swansea City AFC": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt with black
  "Swindon Town FC": [[1992, 9999, "#DA291C", "#FFFFFF"]],   // red shirt, white shorts
  "Tottenham Hotspur FC": [[1992, 9999, "#FFFFFF", "#132257"]],   // white shirt, navy shorts
  "Watford FC": [[1992, 9999, "#FBEE23", "#ED2127"]],   // yellow shirt with red
  "West Bromwich Albion FC": [[1992, 9999, "#122F67", "#FFFFFF"]],   // navy-and-white striped shirt
  "West Ham United FC": [[1992, 9999, "#7A263A", "#1BB1E7"]],   // claret and sky blue
  "Wigan Athletic FC": [[1992, 9999, "#1D59AF", "#FFFFFF"]],   // blue-and-white striped shirt
  "Wimbledon FC": [[1992, 9999, "#003399", "#FFE600"]],   // blue with yellow
  "Wolverhampton Wanderers FC": [[1992, 9999, "#FDB913", "#231F20"]],   // old gold shirt, black shorts
  // La Liga
  "Albacete": [[1992, 9999, "#FFFFFF", "#C8102E"]],   // white home shirt
  "Athletic Club de Bilbao": [[1992, 9999, "#EE2523", "#FFFFFF"]],   // red-and-white striped shirt
  "CA Osasuna": [[1992, 9999, "#D91A21", "#0A346F"]],   // red shirt, navy shorts
  "CD Leganés": [[1992, 9999, "#005BAA", "#FFFFFF"]],   // blue-and-white striped shirt
  "CD Logroñés": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red-and-white striped shirt
  "CD Numancia": [[1992, 9999, "#C8102E", "#003DA5"]],   // red shirt, blue shorts
  "CD Tenerife": [[1992, 9999, "#FFFFFF", "#0033A0"]],   // white shirt, blue shorts
  "CF Extremadura": [[1992, 9999, "#AA0000", "#0033A0"]],   // red shirt with blue
  "Club Atlético de Madrid": [[1992, 9999, "#CB3524", "#FFFFFF"]],   // red-and-white striped shirt
  "Cordoba": [[1992, 9999, "#008A3E", "#FFFFFF"]],   // green-and-white striped shirt
  "CP Mérida": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt, black shorts
  "Cádiz CF": [[1992, 9999, "#FFE500", "#0045A7"]],   // yellow shirt, blue shorts
  "Deportivo Alavés": [[1992, 9999, "#0761AF", "#FFFFFF"]],   // blue-and-white striped shirt
  "Deportivo de La Coruña": [[1992, 9999, "#0067B1", "#FFFFFF"]],   // blue-and-white striped shirt
  "Elche CF": [[1992, 9999, "#FFFFFF", "#05642C"]],   // white shirt with the green band
  "FC Barcelona": [[1992, 9999, "#004D98", "#A50044"]],   // blaugrana: blue and garnet
  "Getafe CF": [[1992, 9999, "#005999", "#FFFFFF"]],   // blue and white
  "Gimnàstic de Tarragona": [[1992, 9999, "#C8102E", "#FFFFFF"]],   // red shirt, white shorts
  "Girona FC": [[1992, 9999, "#CD2534", "#FFFFFF"]],   // red-and-white striped shirt
  "Granada CF": [[1992, 9999, "#C31632", "#FFFFFF"]],   // red-and-white hooped shirt
  "Huesca": [[1992, 9999, "#A31A33", "#003DA5"]],   // garnet and blue
  "Hércules CF": [[1992, 9999, "#005DAA", "#FFFFFF"]],   // blue-and-white striped shirt
  "Levante UD": [[1992, 9999, "#004D98", "#B4053F"]],   // blue and garnet
  "Málaga CF": [[1992, 9999, "#3E8ED0", "#FFFFFF"]],   // sky-blue-and-white striped shirt
  "Racing de Santander": [[1992, 9999, "#FFFFFF", "#008E3E"]],   // white shirt with green
  "Rayo Vallecano de Madrid": [[1992, 9999, "#FFFFFF", "#E53027"]],   // white shirt with the red sash
  "RC Celta de Vigo": [[1992, 9999, "#8AC3EE", "#FFFFFF"]],   // sky blue and white
  "RCD Espanyol de Barcelona": [[1992, 9999, "#007FC8", "#FFFFFF"]],   // blue-and-white striped shirt
  "RCD Mallorca": [[1992, 9999, "#E20613", "#000000"]],   // red shirt, black shorts
  "Real Betis Balompié": [[1992, 9999, "#0BB363", "#FFFFFF"]],   // green-and-white striped shirt
  "Real Burgos": [[1992, 9999, "#C8102E", "#FFFFFF"]],   // red and white
  "Real Madrid CF": [[1992, 9999, "#FFFFFF", "#00529F"]],   // all white (Los Blancos), with the crest's blue
  "Real Murcia": [[1992, 9999, "#C8102E", "#FFFFFF"]],   // red shirt, white shorts
  "Real Oviedo": [[1992, 9999, "#0047AB", "#FFFFFF"]],   // blue shirt, white shorts
  "Real Sociedad de Fútbol": [[1992, 9999, "#0067B1", "#FFFFFF"]],   // blue-and-white striped shirt
  "Real Valladolid CF": [[1992, 9999, "#921B88", "#FFFFFF"]],   // purple-and-white striped shirt
  "Real Zaragoza": [[1992, 9999, "#FFFFFF", "#0057B8"]],   // white shirt, blue shorts
  "Recreativo Huelva": [[1992, 9999, "#005BAC", "#FFFFFF"]],   // blue-and-white striped shirt
  "SD Compostela": [[1992, 9999, "#87CEEB", "#FFFFFF"]],   // sky blue and white
  "SD Eibar": [[1992, 9999, "#A6192E", "#003DA5"]],   // garnet and blue
  "Sevilla FC": [[1992, 9999, "#FFFFFF", "#D70D2B"]],   // white shirt with red
  "Sporting de Gijón": [[1992, 9999, "#E30613", "#FFFFFF"]],   // red-and-white striped shirt
  "UD Almería": [[1992, 9999, "#EE1119", "#FFFFFF"]],   // red-and-white striped shirt
  "UD Las Palmas": [[1992, 9999, "#FFE400", "#0055A4"]],   // yellow shirt, blue shorts
  "UD Salamanca": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt, black shorts
  "UE Lleida": [[1992, 9999, "#0033A0", "#FFFFFF"]],   // blue and white
  "Valencia CF": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt, black shorts
  "Villarreal CF": [[1992, 9999, "#FFE667", "#005187"]],   // yellow shirt with blue
  "Xerez CD": [[1992, 9999, "#0033A0", "#FFFFFF"]],   // blue-and-white striped shirt
  // Serie A
  "AC Cesena": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt with black
  "AC ChievoVerona": [[1992, 9999, "#FFE400", "#002F6C"]],   // yellow and blue
  "AC Milan": [[1992, 9999, "#FB090B", "#000000"]],   // rossoneri: red-and-black striped shirt
  "AC Monza": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "AC Perugia": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red shirt, white shorts
  "AC Reggiana": [[1992, 9999, "#8B1A2B", "#FFFFFF"]],   // granata and white
  "AC Siena": [[1992, 9999, "#000000", "#FFFFFF"]],   // black-and-white striped shirt
  "ACF Fiorentina": [[1992, 9999, "#4B2E83", "#FFFFFF"]],   // viola: purple and white
  "Ancona Calcio": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "AS Bari": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white shirt with red
  "AS Livorno Calcio": [[1992, 9999, "#8B1A2B", "#FFFFFF"]],   // amaranto and white
  "AS Roma": [[1992, 9999, "#8E1F2F", "#F0BC42"]],   // giallorossi: maroon and orange-gold
  "Ascoli Calcio": [[1992, 9999, "#000000", "#FFFFFF"]],   // black-and-white striped shirt
  "Atalanta BC": [[1992, 9999, "#1E71B8", "#000000"]],   // nerazzurri: blue-and-black striped shirt
  "Benevento": [[1992, 9999, "#FFDE00", "#E2001A"]],   // yellow-and-red striped shirt
  "Bologna FC 1909": [[1992, 9999, "#A21C26", "#1A2F48"]],   // rossoblù: red and blue
  "Brescia Calcio": [[1992, 9999, "#005CA9", "#FFFFFF"]],   // blue shirt with the white V
  "Cagliari Calcio": [[1992, 9999, "#B01028", "#002350"]],   // rossoblù: red and blue halves
  "Calcio Catania": [[1992, 9999, "#E2001A", "#0033A0"]],   // rossazzurri: red-and-blue striped shirt
  "Calcio Padova": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white shirt with red
  "Carpi": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white shirt with red
  "Como 1907": [[1992, 9999, "#215AAE", "#FFFFFF"]],   // blue and white
  "Crotone": [[1992, 9999, "#002350", "#C8102E"]],   // blue-and-red striped shirt
  "Delfino Pescara": [[1992, 9999, "#2C9AD6", "#FFFFFF"]],   // sky blue and white
  "Empoli FC": [[1992, 9999, "#00579C", "#FFFFFF"]],   // blue and white
  "FC Internazionale Milano": [[1992, 9999, "#0068A8", "#000000"]],   // nerazzurri: blue-and-black striped shirt
  "FC Messina": [[1992, 9999, "#FFD200", "#C8102E"]],   // giallorossi: yellow and red
  "Frosinone Calcio": [[1992, 9999, "#FFDD00", "#0055A5"]],   // yellow and blue
  "Genoa CFC": [[1992, 9999, "#A6192E", "#001A57"]],   // rossoblù: red and navy halves
  "Hellas Verona FC": [[1992, 9999, "#002F6C", "#FFD100"]],   // gialloblù: blue shirt with yellow
  "Juventus FC": [[1992, 9999, "#000000", "#FFFFFF"]],   // bianconeri: black-and-white striped shirt
  "Modena FC": [[1992, 9999, "#FFEC00", "#003B7E"]],   // yellow and blue
  "Novara Calcio": [[1992, 9999, "#1F77C1", "#FFFFFF"]],   // blue and white
  "Parma Calcio 1913": [
    [1992, 1997, "#FFFFFF", "#1E4A9E"],   // white shirt with yellow and blue (1983-98)
    [1998, 2003, "#FFD200", "#1E4A9E"],   // yellow-and-blue hooped home shirt (Parmalat era, 1998-2004)
    [2004, 9999, "#FFFFFF", "#000000"]],   // white shirt with the black cross (crociata) since 2004
  "Piacenza Calcio": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "Pisa": [[1992, 9999, "#000000", "#0055A5"]],   // nerazzurri: black-and-blue striped shirt
  "Reggina Calcio": [[1992, 9999, "#8B1A2B", "#FFFFFF"]],   // amaranto and white
  "SPAL": [[1992, 9999, "#0A94CD", "#FFFFFF"]],   // sky-blue-and-white striped shirt
  "Spezia": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt with black
  "SS Lazio": [[1992, 9999, "#87D8F7", "#FFFFFF"]],   // biancocelesti: sky blue and white
  "SSC Napoli": [[1992, 9999, "#12A0D7", "#FFFFFF"]],   // azzurri: sky blue and white
  "Torino FC": [[1992, 9999, "#7A1C27", "#FFFFFF"]],   // granata and white
  "Treviso FBC": [[1992, 9999, "#87CEFA", "#FFFFFF"]],   // sky blue and white
  "UC Sampdoria": [[1992, 9999, "#1B5497", "#FFFFFF"]],   // blue shirt with the white-red-black hoop
  "Udinese Calcio": [[1992, 9999, "#000000", "#FFFFFF"]],   // bianconeri: black-and-white striped shirt
  "US Città di Palermo": [[1992, 9999, "#F8C1D5", "#000000"]],   // rosanero: pink and black
  "US Cremonese": [[1992, 9999, "#C8102E", "#9EA2A2"]],   // grigiorossi: red and gray
  "US Foggia": [[1992, 9999, "#E2001A", "#000000"]],   // rossoneri: red-and-black striped shirt
  "US Lecce": [[1992, 9999, "#FFE600", "#E2001A"]],   // giallorossi: yellow-and-red striped shirt
  "US Salernitana 1919": [[1992, 9999, "#671912", "#FFFFFF"]],   // granata and white
  "US Sassuolo Calcio": [[1992, 9999, "#00A752", "#000000"]],   // neroverdi: green-and-black striped shirt
  "Venezia FC": [[1992, 9999, "#000000", "#F07D00"]],   // black shirt with orange and green
  "Vicenza Calcio": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red-and-white striped shirt
  // Bundesliga
  "1. FC Heidenheim 1846": [[1992, 9999, "#E2001A", "#003B79"]],   // red home shirt with navy
  "1. FC Kaiserslautern": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red home shirt with white
  "1. FC Köln": [[1992, 9999, "#FFFFFF", "#ED1C24"]],   // white home shirt with red ('home in white and red')
  "1. FC Nürnberg": [[1992, 9999, "#9A1C1F", "#000000"]],   // dark red home shirt, black shorts
  "1. FC Saarbrücken": [[1992, 9999, "#005CA9", "#000000"]],   // blue and black
  "1. FC Union Berlin": [[1992, 9999, "#EB1923", "#FFFFFF"]],   // red and white
  "1. FSV Mainz 05": [[1992, 9999, "#C3141E", "#FFFFFF"]],   // red home shirt with white
  "Alemannia Aachen": [[1992, 9999, "#FFDE00", "#000000"]],   // yellow and black
  "Arminia Bielefeld": [[1992, 9999, "#004E95", "#000000"]],   // blue home shirt, black shorts
  "Bayer 04 Leverkusen": [[1992, 9999, "#E32221", "#000000"]],   // red and black
  "Borussia Dortmund": [[1992, 9999, "#FDE100", "#000000"]],   // yellow home shirt, black shorts
  "Borussia Mönchengladbach": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt with black and green
  "Dynamo Dresden": [[1992, 9999, "#FFCC00", "#000000"]],   // yellow and black
  "Eintracht Braunschweig": [[1992, 9999, "#FFD700", "#003399"]],   // yellow home shirt, blue shorts
  "Eintracht Frankfurt": [[1992, 9999, "#000000", "#E1000F"]],   // black and red
  "Elversberg": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt with black
  "Energie Cottbus": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red home shirt, white shorts
  "FC Augsburg": [[1992, 9999, "#BA3733", "#46714D"]],   // red and green (with white)
  "FC Bayern München": [[1992, 9999, "#DC052D", "#FFFFFF"]],   // red home shirt with white
  "FC Schalke 04": [[1992, 9999, "#004D9D", "#FFFFFF"]],   // royal blue home shirt with white
  "FC St. Pauli": [[1992, 9999, "#624839", "#FFFFFF"]],   // brown and white
  "Fortuna Düsseldorf": [[1992, 9999, "#DA251D", "#FFFFFF"]],   // red and white
  "Greuther Furth": [[1992, 9999, "#009A44", "#FFFFFF"]],   // green and white
  "Hamburger SV": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white home shirt with red shorts ('die Rothosen')
  "Hannover 96": [[1992, 9999, "#C8102E", "#FFFFFF"]],   // red home shirt ('die Roten') with white
  "Hansa Rostock": [[1992, 9999, "#005DA8", "#FFFFFF"]],   // blue home shirt, white shorts
  "Hertha BSC": [[1992, 9999, "#005CA9", "#FFFFFF"]],   // blue and white
  "Holstein Kiel": [[1992, 9999, "#004B9B", "#FFFFFF"]],   // blue home shirt, white shorts
  "Ingolstadt": [[1992, 9999, "#C8102E", "#000000"]],   // red home shirt, black shorts
  "Karlsruher SC": [[1992, 9999, "#00349E", "#FFFFFF"]],   // blue and white
  "KFC Uerdingen 05": [[1992, 9999, "#E2001A", "#004B93"]],   // red home shirt, blue shorts
  "MSV Duisburg": [[1992, 9999, "#004B9B", "#FFFFFF"]],   // blue-and-white hooped shirt ('Zebras')
  "RB Leipzig": [[1992, 9999, "#FFFFFF", "#DD0741"]],   // white home shirt, red shorts
  "SC Freiburg": [[1992, 9999, "#E2001A", "#000000"]],   // red home shirt with black
  "SC Paderborn 07": [[1992, 9999, "#000000", "#005CA9"]],   // black and blue
  "SG Wattenscheid 09": [[1992, 9999, "#000000", "#FFFFFF"]],   // black and white
  "SpVgg Unterhaching": [[1992, 9999, "#E2001A", "#0055A5"]],   // red and blue
  "SSV Ulm 1846": [[1992, 9999, "#FFFFFF", "#000000"]],   // white home shirt with black
  "SV Darmstadt 98": [[1992, 9999, "#004E9E", "#FFFFFF"]],   // blue home shirt, white shorts
  "SV Werder Bremen": [[1992, 9999, "#1D9053", "#FFFFFF"]],   // green and white
  "TSG 1899 Hoffenheim": [[1992, 9999, "#1C63B7", "#FFFFFF"]],   // blue and white
  "TSV 1860 München": [[1992, 9999, "#6CACE4", "#FFFFFF"]],   // sky blue and white
  "VfB Leipzig": [[1992, 9999, "#FFD700", "#0044FF"]],   // yellow home shirt, blue shorts
  "VfB Stuttgart": [[1992, 9999, "#FFFFFF", "#E32219"]],   // white home shirt with the red chest band
  "VfL Bochum 1848": [[1992, 9999, "#005BA4", "#FFFFFF"]],   // blue and white
  "VfL Wolfsburg": [[1992, 9999, "#65B32E", "#FFFFFF"]],   // green and white
  // Ligue 1
  "AC Ajaccio": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white shirt with red
  "AC Arles-Avignon": [[1992, 9999, "#4F9FD8", "#003D7A"]],   // sky blue and navy
  "AJ Auxerre": [[1992, 9999, "#FFFFFF", "#00539F"]],   // white shirt with blue
  "Ajaccio GFCO": [[1992, 9999, "#C8102E", "#003DA5"]],   // red and blue (Gazélec, a different club from AC Ajaccio)
  "Amiens SC": [[1992, 9999, "#FFFFFF", "#000000"]],   // white shirt with black
  "Angers SCO": [[1992, 9999, "#000000", "#FFFFFF"]],   // black-and-white striped shirt
  "AS Cannes": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "AS Monaco FC": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red-and-white diagonal halves
  "AS Nancy-Lorraine": [[1992, 9999, "#FFFFFF", "#E2001A"]],   // white shirt with red
  "AS Saint-Étienne": [[1992, 9999, "#00843D", "#FFFFFF"]],   // green and white
  "Clermont Foot 63": [[1992, 9999, "#C50C35", "#003B7E"]],   // red and blue
  "CS Sedan": [[1992, 9999, "#008000", "#E2001A"]],   // green shirt, red shorts
  "Dijon FCO": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "En Avant de Guingamp": [[1992, 9999, "#E2001A", "#000000"]],   // red shirt, black shorts
  "ESTAC Troyes": [[1992, 9999, "#0057B8", "#FFFFFF"]],   // blue and white
  "Evian Thonon Gaillard FC": [[1992, 9999, "#002E5D", "#E6007E"]],   // navy with pink
  "FC Girondins de Bordeaux": [[1992, 9999, "#001C50", "#FFFFFF"]],   // navy shirt with the white scapular
  "FC Gueugnon": [[1992, 9999, "#F7DB4A", "#1B375F"]],   // yellow and blue
  "FC Istres": [[1992, 9999, "#550099", "#000000"]],   // purple and black
  "FC Lorient": [[1992, 9999, "#F58113", "#000000"]],   // orange and black
  "FC Martigues": [[1992, 9999, "#E2001A", "#000000"]],   // red shirt, black shorts
  "FC Metz": [[1992, 9999, "#8B1A2B", "#FFFFFF"]],   // maroon (grenat) and white
  "FC Nantes": [[1992, 9999, "#FCD405", "#00A04D"]],   // yellow and green
  "FC Sochaux-Montbéliard": [[1992, 9999, "#FFD800", "#0B1031"]],   // yellow shirt, navy shorts
  "Grenoble Foot 38": [[1992, 9999, "#005BA8", "#FFFFFF"]],   // blue and white
  "LB Chateauroux": [[1992, 9999, "#003DA5", "#C8102E"]],   // blue and red
  "Le Havre AC": [[1992, 9999, "#6CB4EE", "#0D2142"]],   // sky blue and navy
  "Le Mans FC": [[1992, 9999, "#E2001A", "#FFD100"]],   // red with yellow
  "Lille OSC": [[1992, 9999, "#E01E13", "#221F64"]],   // red shirt, navy shorts
  "Montpellier HSC": [[1992, 9999, "#00205B", "#F47A1F"]],   // navy and orange
  "Nîmes Olympique": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "OGC Nice": [[1992, 9999, "#E2001A", "#000000"]],   // red-and-black striped shirt
  "Olympique de Marseille": [[1992, 9999, "#FFFFFF", "#2FAEE0"]],   // white shirt with sky blue
  "Olympique Lyonnais": [[1992, 9999, "#FFFFFF", "#004494"]],   // white shirt with blue and red
  "Paris FC": [[1992, 9999, "#1B2A5A", "#FFFFFF"]],   // navy and white
  "Paris Saint-Germain FC": [[1992, 9999, "#004170", "#DA291C"]],   // navy shirt with the red stripe
  "Racing Club de Lens": [[1992, 9999, "#FFE600", "#E2001A"]],   // sang et or: yellow and red
  "RC Strasbourg Alsace": [[1992, 9999, "#009FE3", "#FFFFFF"]],   // blue and white
  "SC Bastia": [[1992, 9999, "#0033A0", "#FFFFFF"]],   // blue and white
  "Sporting Toulon Var": [[1992, 9999, "#FFD700", "#0026FF"]],   // yellow and blue
  "Stade Brestois 29": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
  "Stade de Reims": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red shirt with white sleeves
  "Stade Malherbe Caen": [[1992, 9999, "#1B5FA8", "#E2001A"]],   // blue shirt, red shorts
  "Stade Rennais FC 1901": [[1992, 9999, "#E13327", "#000000"]],   // red shirt, black shorts
  "Toulouse FC": [[1992, 9999, "#5B2D86", "#FFFFFF"]],   // purple and white
  "US Boulogne": [[1992, 9999, "#E2001A", "#000000"]],   // red and black
  "Valenciennes FC": [[1992, 9999, "#E2001A", "#FFFFFF"]],   // red and white
}, { confirmed: 2026 });
