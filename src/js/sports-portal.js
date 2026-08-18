(function () {
  var GH = "https://fakeronjan.github.io";
  var SQ = "https://fakeronjan.com";

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── Per-site badge functions - copied from each site's own finishBadge so
  // labels/emojis/tooltips match the source site exactly. ──────────────────

  function badgeDUNCAN(t) {
    var bits = [];
    if (t.finals_status === 2) bits.push('<span class="card-badge" title="NBA Champion">👑</span>');
    else if (t.finals_status === 1) bits.push('<span class="card-badge" title="NBA Runner-Up">🥈</span>');
    if (t.cup_status === 2) bits.push('<span class="card-badge card-badge-champion" title="NBA Cup Champion">Cup 🏆</span>');
    else if (t.cup_status === 1) bits.push('<span class="card-badge card-badge-runner" title="NBA Cup Runner-Up">Cup 🥈</span>');
    return bits.join("");
  }
  function badgeLOBO(t) {
    var bits = [];
    if (t.finals_status === 2) bits.push('<span class="card-badge" title="WNBA Champion">👑</span>');
    else if (t.finals_status === 1) bits.push('<span class="card-badge" title="WNBA Runner-Up">🥈</span>');
    if (t.cup_status === 2) bits.push('<span class="card-badge card-badge-champion" title="Commissioner’s Cup Champion">Cup 🏆</span>');
    else if (t.cup_status === 1) bits.push('<span class="card-badge card-badge-runner" title="Commissioner’s Cup Runner-Up">Cup 🥈</span>');
    return bits.join("");
  }
  function badgeDILLON(t) {
    if (t.sb_status === 2) return '<span class="card-badge" title="Super Bowl Champion">👑</span>';
    if (t.sb_status === 1) return '<span class="card-badge" title="Super Bowl Runner-Up">🥈</span>';
    return "";
  }
  function badgeGRIFFEY(t) {
    if (t.finals_status === 2) return '<span class="card-badge" title="World Series Champion">👑</span>';
    if (t.finals_status === 1) return '<span class="card-badge" title="World Series Runner-Up">🥈</span>';
    return "";
  }
  function badgeSAKIC(t) {
    if (t.finals_status === 2) return '<span class="card-badge" title="Stanley Cup Champion">👑</span>';
    if (t.finals_status === 1) return '<span class="card-badge" title="Stanley Cup Runner-Up">🥈</span>';
    return "";
  }
  function badgeSALAAM(t) {
    if (t.cfp_status === 2) {
      var label = (t.selectors && t.selectors.length) ? t.selectors.join("+") : (t.era || "CFP");
      return '<span class="card-badge card-badge-champion" title="National Champion">' + label + " 👑</span>";
    }
    if (t.cfp_status === 1) return '<span class="card-badge card-badge-runner" title="CFP Runner-Up">' + (t.era || "CFP") + " 🥈</span>";
    if (t.cfp_appearance === 1) return '<span class="card-badge card-badge-appearance" title="CFP Appearance">CFP</span>';
    return "";
  }

  var ZIDANE_LEAGUE_FLAG = {
    EPL: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "La Liga": "🇪🇸",
    Bundesliga: "🇩🇪",
    "Serie A": "🇮🇹",
    "Ligue 1": "🇫🇷",
  };
  function badgeZIDANE(t) {
    var bits = [];
    if (t.cl_finish === "Champion") bits.push('<span class="card-badge card-badge-champion">CL 🏆</span>');
    if (t.cl_finish === "Runner-Up") bits.push('<span class="card-badge card-badge-runner">CL 🥈</span>');
    if (t.domestic_finish === "Champion") {
      var flag = ZIDANE_LEAGUE_FLAG[t.league] || "";
      bits.push('<span class="card-badge card-badge-champion">' + flag + " 🏆</span>");
    }
    return bits.join("");
  }
  function badgeCOBI(t) {
    var cup = t.mls_cup_finish, shield = t.supporters_shield_finish;
    var bits = [];
    if (cup === "Champion" && shield === "Champion") bits.push('<span class="card-badge card-badge-double">DOUBLE 👑</span>');
    if (cup === "Champion") bits.push('<span class="card-badge card-badge-champion">MLS Cup 🏆</span>');
    else if (cup === "Runner-Up") bits.push('<span class="card-badge card-badge-runner">MLS Cup 🥈</span>');
    if (shield === "Champion") bits.push('<span class="card-badge card-badge-shield">Shield 🛡️</span>');
    else if (shield === "Runner-Up") bits.push('<span class="card-badge card-badge-runner">Shield 🥈</span>');
    return bits.join("");
  }
  function tournamentBadges(t, crownTournament) {
    var fs = t.tournament_finishes;
    if (!fs || !fs.length) return "";
    return fs.map(function (x) {
      var cls = x.finish === 1 ? "card-badge-champion" : x.finish === 2 ? "card-badge-runner" : "card-badge-bronze";
      var medal = x.finish === 1
        ? (x.tournament === crownTournament ? "👑" : "🏆")
        : x.finish === 2 ? "🥈" : "🥉";
      return '<span class="card-badge ' + cls + '">' + x.tournament + " " + medal + "</span>";
    }).join("");
  }
  function badgeMESSI(t) { return tournamentBadges(t, "WC"); }
  function badgeCARMELO(t) { return tournamentBadges(t, "Oly"); }
  function badgeICHIRO(t) { return tournamentBadges(t, "WBC"); }
  function badgeFORSBERG(t) { return tournamentBadges(t, "Oly"); }

  // ── Loaders. Each returns {columns, rows: [{rank, cells}], updated, seasonName?, seasonComplete?} ──

  var PLAYOFF_SPORTS = { duncan: 1, lobo: 1, dillon: 1, salaam: 1, griffey: 1, sakic: 1 };
  var SOCCER_SPORTS = { zidane: 1, messi: 1, cobi: 1 };
  var HOCKEY_SPORTS = { sakic: 1 };

  var SEASON_FMT = {
    duncan: function (s) { return (s - 1) + "-" + String(s).slice(-2) + " season"; },
    lobo: function (s) { return s + " season"; },
    dillon: function (s) { return s + " season"; },
    salaam: function (s) { return s + " season"; },
    zidane: function (s) { return s + " season"; },
    cobi: function (s) { return s + " season"; },
    griffey: function (s) { return s + " season"; },
    sakic: function (s) { return (s - 1) + "-" + String(s).slice(-2) + " season"; },
  };

  function hasGames(rec) {
    if (!rec) return false;
    var m = String(rec).match(/^\s*(\d+)\s*-\s*(\d+)/);
    if (!m) return false;
    return parseInt(m[1], 10) + parseInt(m[2], 10) > 0;
  }
  function fmtLast(raw) {
    if (!raw) return "";
    return String(raw).replace(/\s*\([^)]*\)\s*$/, "").replace(/\bvs\.\s*/, "vs ");
  }

  function loadWLS(repo, badgeFn, opts) {
    opts = opts || {};
    var idxPromise = fetchJson(GH + "/" + repo + "/data/seasons_index.json").catch(function () { return null; });

    function withTeams(teams, updated, latestSeason, seasonComplete) {
      var seasonName = (SEASON_FMT[repo] && latestSeason != null) ? SEASON_FMT[repo](latestSeason) : null;
      var top5 = teams.slice().sort(function (a, b) { return a.rank - b.rank; }).slice(0, 5);

      var isSoccer = !!SOCCER_SPORTS[repo];
      var isHockey = !!HOCKEY_SPORTS[repo];
      var showPlayoffs = !isSoccer && top5.some(function (t) { return hasGames(t.playoff_record); });
      var showRecord = !opts.hideRecord && top5.some(function (t) { return t.regular_record || t.record; });
      var showLast = !!opts.showLast;
      var titleOdds = function (t) { return t.title_odds != null ? t.title_odds : (t.sb_odds != null ? t.sb_odds : null); };
      var showTitleOdds = !showPlayoffs && top5.some(function (t) { return titleOdds(t) != null; });
      var recordLabel = isSoccer ? "W-D-L" : (isHockey ? "W-L-OTL" : "W-L");
      var recordWidth = (isSoccer || isHockey) ? 60 : null;

      var columns = [{ label: "Team", cls: "name" }];
      if (showRecord) columns.push({ label: recordLabel, cls: "record", width: recordWidth });
      if (isSoccer && showRecord) columns.push({ label: "Pts", cls: "num" });
      if (showPlayoffs) columns.push({ label: "Playoffs", cls: "record" });
      else if (showTitleOdds) columns.push({ label: "Title %", cls: "record" });
      if (showLast) columns.push({ label: "Last", cls: "last" });
      columns.push({ label: "Rating", cls: "rating" });

      var rows = top5.map(function (t) {
        var baseName = escapeHtml(t.display_name || t.team);
        var flag = t.flag ? t.flag + " " : "";
        var name = flag + baseName;
        var badges = badgeFn(t);
        var cells = ['<span class="top5-name-inner"><span class="top5-name-text">' + name + "</span>" + (badges ? '<span class="top5-name-badges">' + badges + "</span>" : "") + "</span>"];
        if (showRecord) {
          var reg = t.regular_record || t.record || "";
          cells.push(escapeHtml(String(reg).replace(/\s*-\s*/g, "-")));
        }
        if (isSoccer && showRecord) {
          var reg2 = t.regular_record || t.record || "";
          var m = String(reg2).match(/^\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
          cells.push(m ? String(parseInt(m[1], 10) * 3 + parseInt(m[2], 10)) : "-");
        }
        if (showPlayoffs) {
          cells.push(hasGames(t.playoff_record) ? escapeHtml(t.playoff_record) : "-");
        } else if (showTitleOdds) {
          var odds = titleOdds(t);
          if (odds == null) cells.push("-");
          else {
            var pct = (odds * 100).toFixed(1);
            cells.push(pct === "0.0" ? "-" : pct + "%");
          }
        }
        if (showLast) cells.push(escapeHtml(fmtLast(t.last_match)));
        cells.push(t.rating.toFixed(2));
        return { rank: t.rank, cells: cells };
      });

      return {
        columns: columns,
        rows: rows,
        updated: updated ? "Last " + (isSoccer ? "matches" : "games") + " added: " + updated : "",
        seasonName: seasonName,
        seasonComplete: seasonComplete,
      };
    }

    if (PLAYOFF_SPORTS[repo]) {
      return idxPromise.then(function (idx) {
        var latestSeason = idx && idx.seasons ? idx.seasons[0] : null;
        return fetchJson(GH + "/" + repo + "/data/seasons/" + latestSeason + ".json").then(function (detail) {
          var snap = detail.snapshots[detail.snapshots.length - 1];
          var updated = (snap.date || "").slice(0, 10);
          var seasonComplete = (snap.label || "").indexOf("End of playoffs") !== -1;
          return withTeams(snap.teams, updated, latestSeason, seasonComplete);
        });
      });
    }
    return Promise.all([fetchJson(GH + "/" + repo + "/data/current_standings.json"), idxPromise]).then(function (results) {
      var d = results[0], idx = results[1];
      var latestSeason = idx && idx.seasons ? idx.seasons[0] : null;
      var seasonComplete = false;
      if (repo === "cobi") seasonComplete = (d.teams || []).some(function (t) { return t.mls_cup_finish === "Champion"; });
      else if (repo === "zidane") seasonComplete = (d.teams || []).some(function (t) { return t.cl_finish === "Champion"; });
      return withTeams(d.teams, d.updated, latestSeason, seasonComplete);
    });
  }

  var TENNIS_SLAM_FLAG = { AO: "🇦🇺", FO: "🇫🇷", Wim: "🇬🇧", US: "🇺🇸" };
  var TENNIS_SLAM_NAME = { AO: "Australian Open", FO: "Roland Garros", Wim: "Wimbledon", US: "US Open" };

  function fmtFullDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00Z");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  var TENNIS_COLS = [
    { label: "Player", cls: "name" },
    { label: "Titles", cls: "num", width: 50 },
    { label: "Slams", cls: "num", width: 90 },
    { label: "Rating", cls: "rating" },
  ];

  function loadTennisCurrent(gender) {
    var slug = gender === "M" ? "atp" : "wta";
    return fetchJson(GH + "/tennis/data/power_rankings_history_" + slug + ".json").then(function (data) {
      var snaps = (data && data.snapshots) || null;
      var snap = null;
      if (snaps) {
        var keys = Object.keys(snaps);
        snap = snaps["Today"] || (keys.length ? snaps[keys[keys.length - 1]] : null);
      }
      if (!snap) return { columns: TENNIS_COLS, rows: [], updated: "" };
      var rows = snap.players.slice(0, 5).map(function (p) {
        var flag = p.country ? p.country + " " : "";
        var slams = (p.slams_won || []).map(function (c) { return TENNIS_SLAM_FLAG[c] || ""; }).filter(Boolean).join(" ") || "-";
        return { rank: p.rank, cells: [flag + escapeHtml(p.player), p.titles || 0, slams, p.base.toFixed(2)] };
      });
      var seasonName;
      if (snap.type === "slam") seasonName = "Through " + (TENNIS_SLAM_NAME[snap.code] || (snap.label || "").replace(/^After\s+/, "")) + " " + snap.year;
      else if (snap.type === "eoy") seasonName = "End of " + snap.year;
      else seasonName = "Through " + fmtFullDate(snap.window_end);
      return { columns: TENNIS_COLS, rows: rows, seasonName: seasonName, updated: "Last matches added: " + (snap.date || "").slice(0, 10) };
    });
  }

  var LAVIN_COLS = [
    { label: "Player", cls: "name" },
    { label: "Sn", cls: "num", width: 28 },
    { label: "Finals", cls: "num", width: 50 },
    { label: "Champs", cls: "num", width: 66 },
    { label: "Rating", cls: "rating" },
  ];
  function loadLAVINGoat(gender) {
    return fetchJson(GH + "/lavin/data/goat_players.json").then(function (d) {
      return {
        columns: LAVIN_COLS,
        rows: d[gender].slice(0, 5).map(function (p) {
          return { rank: p.rank, cells: [escapeHtml(p.player), p.n_seasons, p.finals_reached, p.championships > 0 ? p.championships + " 🥇" : (p.championships || 0), p.era_rating.toFixed(1)] };
        }),
        updated: "Last updated: S41 2025-12",
      };
    });
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  var CADENCE_BY_SLUG = {
    nba: "daily", wnba: "daily", nfl: "daily", ncaafb: "daily",
    eurosoccer: "daily", mls: "daily", intlsoccer: "daily",
    mlb: "daily", nhl: "daily",
    intlbasketball: "daily", intlbaseball: "daily", intlhockey: "daily",
    tennis: "daily", thechallenge: "manual",
  };

  var SECTIONS = [
    {
      label: "Basketball",
      cards: [
        { slug: "nba", title: "NBA: DUNCAN ♂️🏀", sectionLabel: "Current Top 5", load: function () { return loadWLS("duncan", badgeDUNCAN); } },
        { slug: "wnba", title: "WNBA: LOBO ♀️🏀", sectionLabel: "Current Top 5", load: function () { return loadWLS("lobo", badgeLOBO); } },
        { slug: "intlbasketball", title: "Men Intl: CARMELO 🌍🏀", stage: "Alpha", sectionLabel: "Current Top 5", load: function () { return loadWLS("carmelo", badgeCARMELO, { showLast: true, hideRecord: true }); } },
      ],
    },
    {
      label: "Football",
      cards: [
        { slug: "nfl", title: "NFL: DILLON 🏈", sectionLabel: "Current Top 5", load: function () { return loadWLS("dillon", badgeDILLON); } },
        { slug: "ncaafb", title: "NCAA: SALAAM 🎓🏈", sectionLabel: "Current Top 5", load: function () { return loadWLS("salaam", badgeSALAAM); } },
      ],
    },
    {
      label: "Soccer",
      cards: [
        { slug: "eurosoccer", title: "Euro: ZIDANE 🇪🇺⚽", stage: "Beta", sectionLabel: "Current Top 5", load: function () { return loadWLS("zidane", badgeZIDANE); } },
        { slug: "mls", title: "MLS: COBI 🇺🇸⚽", stage: "Beta", sectionLabel: "Current Top 5", load: function () { return loadWLS("cobi", badgeCOBI); } },
        { slug: "intlsoccer", title: "Men Intl: MESSI 🌍⚽", stage: "Beta", sectionLabel: "Current Top 5", load: function () { return loadWLS("messi", badgeMESSI, { showLast: true }); } },
      ],
    },
    {
      label: "Baseball",
      cards: [
        { slug: "mlb", title: "MLB: GRIFFEY ⚾", sectionLabel: "Current Top 5", load: function () { return loadWLS("griffey", badgeGRIFFEY); } },
        { slug: "intlbaseball", title: "Men Intl: ICHIRO 🌍⚾", stage: "Alpha", sectionLabel: "Current Top 5", load: function () { return loadWLS("ichiro", badgeICHIRO, { showLast: true, hideRecord: true }); } },
      ],
    },
    {
      label: "Hockey",
      cards: [
        { slug: "nhl", title: "NHL: SAKIC 🥅🏒", sectionLabel: "Current Top 5", load: function () { return loadWLS("sakic", badgeSAKIC); } },
        { slug: "intlhockey", title: "Men Intl: FORSBERG 🌍🏒", stage: "Alpha", sectionLabel: "Current Top 5", load: function () { return loadWLS("forsberg", badgeFORSBERG, { showLast: true, hideRecord: true }); } },
      ],
    },
    {
      label: "Tennis",
      cards: [
        { slug: "tennis", title: "Men's Tennis: CHANG ♂️🎾", stage: "Beta", sectionLabel: "Current Top 5", load: function () { return loadTennisCurrent("M"); } },
        { slug: "tennis", title: "Women's Tennis: CAPRIATI ♀️🎾", stage: "Beta", sectionLabel: "Current Top 5", load: function () { return loadTennisCurrent("W"); } },
      ],
    },
    {
      label: "The Challenge",
      cards: [
        { slug: "thechallenge", title: "Men's Challenge: LAVIN 💪🤫🍷", stage: "Beta", sectionLabel: "GOAT Top 5", load: function () { return loadLAVINGoat("M"); } },
        { slug: "thechallenge", title: "Women's Challenge: LAVIN 💪🤫🍷", stage: "Beta", sectionLabel: "GOAT Top 5", load: function () { return loadLAVINGoat("F"); } },
      ],
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  function renderCard(card, payload, error) {
    var body;
    if (error) {
      body = '<div class="card-error">Data unavailable</div>';
    } else if (payload) {
      var headers = "<thead><tr><th class=\"col-rank\"></th>" +
        payload.columns.map(function (c) {
          var style = c.width ? ' style="width:' + c.width + 'px"' : "";
          return '<th class="col-' + c.cls + '"' + style + ">" + escapeHtml(c.label) + "</th>";
        }).join("") + "</tr></thead>";
      var rows = payload.rows.map(function (r) {
        return "<tr><td class=\"rank\">" + r.rank + "</td>" +
          r.cells.map(function (cell, i) { return '<td class="' + payload.columns[i].cls + '">' + cell + "</td>"; }).join("") +
          "</tr>";
      }).join("");
      var sectionLabel = payload.seasonComplete ? card.sectionLabel.replace(/^Current\b/, "Final") : card.sectionLabel;
      var label = payload.seasonName ? sectionLabel + ": " + payload.seasonName : sectionLabel;
      body = '<div class="card-section-label">' + escapeHtml(label) + '</div><table class="top5">' + headers + "<tbody>" + rows + "</tbody></table>";
    } else {
      body = '<div class="card-loading">Loading…</div>';
    }
    var cadenceLabel = { daily: "🔄 Updated daily", weekly: "🔄 Updated weekly", manual: "🛠️ Updated manually" }[CADENCE_BY_SLUG[card.slug]] || "";
    var cadenceHtml = cadenceLabel ? '<span class="card-cadence">' + cadenceLabel + "</span>" : "";
    var updatedHtml = payload && !error && payload.updated ? "<span>" + escapeHtml(payload.updated) + "</span>" : "<span></span>";
    var foot = (payload && !error) || cadenceHtml ? '<div class="card-foot">' + cadenceHtml + updatedHtml + "</div>" : "";
    return (
      '<a class="card" href="' + SQ + "/" + card.slug + '/">' +
      '<div class="card-head"><span class="card-title">' + card.title + (card.stage ? ' <span class="card-stage">· ' + card.stage + "</span>" : "") + '</span><span class="card-arrow">→</span></div>' +
      '<div class="card-body">' + body + "</div>" +
      foot +
      "</a>"
    );
  }

  var currentSummaryView = document.getElementById("currentSummaryView");
  currentSummaryView.innerHTML = SECTIONS.map(function (sec) {
    return '<section class="sport-row"><h2>' + escapeHtml(sec.label) + '</h2><div class="card-grid">' +
      sec.cards.map(function (c) { return renderCard(c); }).join("") +
      "</div></section>";
  }).join("");

  SECTIONS.forEach(function (sec, si) {
    sec.cards.forEach(function (card, ci) {
      var sectionEl = currentSummaryView.querySelectorAll("section.sport-row")[si];
      var cards = sectionEl.querySelectorAll(".card");
      card.load().then(function (payload) {
        cards[ci].outerHTML = renderCard(card, payload);
      }).catch(function (e) {
        cards[ci].outerHTML = renderCard(card, null, e);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2: Sports City Index (Cross-Sport Rankings / City History /
  // GOAT Table / City Droughts)
  // ═══════════════════════════════════════════════════════════════════════

  function activateTab(tabName) {
    document.querySelectorAll(".sport-tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".sport-view").forEach(function (v) { v.hidden = true; v.classList.remove("active"); });
    var btn = document.querySelector('.sport-tab[data-tab="' + tabName + '"]');
    var view = document.getElementById(tabName);
    if (btn) btn.classList.add("active");
    if (view) { view.hidden = false; view.classList.add("active"); }
  }

  var CITY_TABS = { "cross-sport-rankings": 1, "city-history": 1, "goat-table": 1, "city-droughts": 1 };
  var cityRendered = {};
  document.getElementById("portalTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    var target = btn.dataset.tab;
    activateTab(target);
    document.getElementById("leagueFilter").hidden = !CITY_TABS[target];
    if (cityRenderers[target] && !cityRendered[target]) {
      cityRendered[target] = true;
      cityRenderers[target]();
    }
  });

  function renderActiveCityTab() {
    var activeBtn = document.querySelector("#portalTabs .sport-tab.active");
    var target = activeBtn && activeBtn.dataset.tab;
    if (!CITY_TABS[target]) return;
    cityRenderers[target]();
  }

  // ── Team -> Nielsen DMA market map. Every team assigned to its Nielsen
  // Designated Market Area - the TV/advertising market the league itself
  // uses to think about fan catchment. Slash labels are used wherever
  // multiple cities meaningfully share teams, matching the official DMA
  // name so the label is honest about what's combined. ──────────────────
  var TEAM_TO_METRO = {
    // NBA
    "Atlanta Hawks": "Atlanta", "Boston Celtics": "Boston", "Brooklyn Nets": "New York / New Jersey",
    "Charlotte Hornets": "Charlotte", "Chicago Bulls": "Chicago", "Cleveland Cavaliers": "Cleveland",
    "Dallas Mavericks": "Dallas / Fort Worth", "Denver Nuggets": "Denver", "Detroit Pistons": "Detroit",
    "Golden State Warriors": "San Francisco / Oakland / San Jose", "Houston Rockets": "Houston",
    "Indiana Pacers": "Indianapolis", "Los Angeles Clippers": "Los Angeles / Anaheim",
    "Los Angeles Lakers": "Los Angeles / Anaheim", "Memphis Grizzlies": "Memphis",
    "Miami Heat": "Miami / Fort Lauderdale", "Milwaukee Bucks": "Milwaukee",
    "Minnesota Timberwolves": "Minneapolis / St. Paul", "New Orleans Pelicans": "New Orleans",
    "New York Knicks": "New York / New Jersey", "Oklahoma City Thunder": "Oklahoma City",
    "Orlando Magic": "Orlando", "Philadelphia 76ers": "Philadelphia", "Phoenix Suns": "Phoenix",
    "Portland Trail Blazers": "Portland", "Sacramento Kings": "Sacramento", "San Antonio Spurs": "San Antonio",
    "Toronto Raptors": "Toronto", "Utah Jazz": "Salt Lake City", "Washington Wizards": "Washington",
    // WNBA
    "Atlanta Dream": "Atlanta", "Chicago Sky": "Chicago", "Connecticut Sun": "Hartford / New Haven",
    "Dallas Wings": "Dallas / Fort Worth", "Golden State Valkyries": "San Francisco / Oakland / San Jose",
    "Indiana Fever": "Indianapolis", "Las Vegas Aces": "Las Vegas", "Los Angeles Sparks": "Los Angeles / Anaheim",
    "Minnesota Lynx": "Minneapolis / St. Paul", "New York Liberty": "New York / New Jersey",
    "Phoenix Mercury": "Phoenix", "Portland Fire": "Portland", "Seattle Storm": "Seattle",
    "Toronto Tempo": "Toronto", "Washington Mystics": "Washington",
    // NFL
    "Arizona Cardinals": "Phoenix", "Atlanta Falcons": "Atlanta", "Baltimore Ravens": "Baltimore",
    "Buffalo Bills": "Buffalo", "Carolina Panthers": "Charlotte", "Chicago Bears": "Chicago",
    "Cincinnati Bengals": "Cincinnati", "Cleveland Browns": "Cleveland", "Dallas Cowboys": "Dallas / Fort Worth",
    "Denver Broncos": "Denver", "Detroit Lions": "Detroit", "Green Bay Packers": "Green Bay",
    "Houston Texans": "Houston", "Indianapolis Colts": "Indianapolis", "Jacksonville Jaguars": "Jacksonville",
    "Kansas City Chiefs": "Kansas City", "Las Vegas Raiders": "Las Vegas", "Los Angeles Chargers": "Los Angeles / Anaheim",
    "Los Angeles Rams": "Los Angeles / Anaheim", "Miami Dolphins": "Miami / Fort Lauderdale",
    "Minnesota Vikings": "Minneapolis / St. Paul", "New England Patriots": "Boston", "New Orleans Saints": "New Orleans",
    "New York Giants": "New York / New Jersey", "New York Jets": "New York / New Jersey",
    "Philadelphia Eagles": "Philadelphia", "Pittsburgh Steelers": "Pittsburgh",
    "San Francisco 49ers": "San Francisco / Oakland / San Jose", "Seattle Seahawks": "Seattle",
    "Tampa Bay Buccaneers": "Tampa / St. Petersburg", "Tennessee Titans": "Nashville", "Washington Commanders": "Washington",
    // MLB
    "Arizona Diamondbacks": "Phoenix", "Atlanta Braves": "Atlanta", "Baltimore Orioles": "Baltimore",
    "Boston Red Sox": "Boston", "Chicago Cubs": "Chicago", "Chicago White Sox": "Chicago",
    "Cincinnati Reds": "Cincinnati", "Cleveland Guardians": "Cleveland", "Colorado Rockies": "Denver",
    "Detroit Tigers": "Detroit", "Houston Astros": "Houston", "Kansas City Royals": "Kansas City",
    "Las Vegas Athletics": "Las Vegas", "Athletics": "Sacramento", "Los Angeles Angels": "Los Angeles / Anaheim",
    "Los Angeles Dodgers": "Los Angeles / Anaheim", "Miami Marlins": "Miami / Fort Lauderdale",
    "Milwaukee Brewers": "Milwaukee", "Minnesota Twins": "Minneapolis / St. Paul", "New York Mets": "New York / New Jersey",
    "New York Yankees": "New York / New Jersey", "Oakland Athletics": "San Francisco / Oakland / San Jose",
    "Philadelphia Phillies": "Philadelphia", "Pittsburgh Pirates": "Pittsburgh", "San Diego Padres": "San Diego",
    "San Francisco Giants": "San Francisco / Oakland / San Jose", "Seattle Mariners": "Seattle",
    "St. Louis Cardinals": "St. Louis", "Tampa Bay Rays": "Tampa / St. Petersburg", "Texas Rangers": "Dallas / Fort Worth",
    "Toronto Blue Jays": "Toronto", "Washington Nationals": "Washington",
    // NHL
    "Anaheim Ducks": "Los Angeles / Anaheim", "Boston Bruins": "Boston", "Buffalo Sabres": "Buffalo",
    "Calgary Flames": "Calgary", "Carolina Hurricanes": "Raleigh", "Chicago Blackhawks": "Chicago",
    "Chicago Black Hawks": "Chicago", "Colorado Avalanche": "Denver", "Columbus Blue Jackets": "Columbus",
    "Dallas Stars": "Dallas / Fort Worth", "Detroit Red Wings": "Detroit", "Edmonton Oilers": "Edmonton",
    "Florida Panthers": "Miami / Fort Lauderdale", "Los Angeles Kings": "Los Angeles / Anaheim",
    "Minnesota Wild": "Minneapolis / St. Paul", "Montreal Canadiens": "Montreal", "Nashville Predators": "Nashville",
    "New Jersey Devils": "New York / New Jersey", "New York Islanders": "New York / New Jersey",
    "New York Rangers": "New York / New Jersey", "Ottawa Senators": "Ottawa", "Philadelphia Flyers": "Philadelphia",
    "Pittsburgh Penguins": "Pittsburgh", "San Jose Sharks": "San Francisco / Oakland / San Jose",
    "Seattle Kraken": "Seattle", "St. Louis Blues": "St. Louis", "Tampa Bay Lightning": "Tampa / St. Petersburg",
    "Toronto Maple Leafs": "Toronto", "Utah Mammoth": "Salt Lake City", "Utah Hockey Club": "Salt Lake City",
    "Vancouver Canucks": "Vancouver", "Vegas Golden Knights": "Las Vegas", "Washington Capitals": "Washington",
    "Winnipeg Jets": "Winnipeg",
    // MLS
    "Atlanta United FC": "Atlanta", "Austin FC": "Austin", "CF Montréal": "Montreal", "Charlotte FC": "Charlotte",
    "Chicago Fire FC": "Chicago", "Colorado Rapids": "Denver", "Columbus Crew": "Columbus",
    "D.C. United": "Washington", "FC Cincinnati": "Cincinnati", "FC Dallas": "Dallas / Fort Worth",
    "Houston Dynamo FC": "Houston", "Inter Miami CF": "Miami / Fort Lauderdale", "LA Galaxy": "Los Angeles / Anaheim",
    "LAFC": "Los Angeles / Anaheim", "Minnesota United FC": "Minneapolis / St. Paul", "Nashville SC": "Nashville",
    "New England Revolution": "Boston", "New York City FC": "New York / New Jersey",
    "New York Red Bulls": "New York / New Jersey", "Red Bull New York": "New York / New Jersey",
    "Orlando City SC": "Orlando", "Philadelphia Union": "Philadelphia", "Portland Timbers": "Portland",
    "Real Salt Lake": "Salt Lake City", "San Diego FC": "San Diego", "San Jose Earthquakes": "San Francisco / Oakland / San Jose",
    "Seattle Sounders FC": "Seattle", "Sporting Kansas City": "Kansas City", "St. Louis CITY SC": "St. Louis",
    "Toronto FC": "Toronto", "Vancouver Whitecaps FC": "Vancouver", "Vancouver Whitecaps": "Vancouver",
    // Era-aware / defunct names in historical snapshots
    "Cleveland Indians": "Cleveland", "Florida Marlins": "Miami / Fort Lauderdale", "Montreal Expos": "Montreal",
    "Tampa Bay Devil Rays": "Tampa / St. Petersburg",
    "Chicago Fire": "Chicago", "Chivas USA": "Los Angeles / Anaheim", "Columbus Crew SC": "Columbus",
    "Dallas Burn": "Dallas / Fort Worth", "Houston Dynamo": "Houston", "Kansas City Wizards": "Kansas City",
    "MetroStars": "New York / New Jersey", "Miami Fusion": "Miami / Fort Lauderdale", "Montreal Impact": "Montreal",
    "NY/NJ MetroStars": "New York / New Jersey", "San Jose Clash": "San Francisco / Oakland / San Jose",
    "Tampa Bay Mutiny": "Tampa / St. Petersburg",
    "Charlotte Bobcats": "Charlotte", "NO/OKC Hornets": "New Orleans", "New Jersey Nets": "New York / New Jersey",
    "New Orleans Hornets": "New Orleans", "Seattle SuperSonics": "Seattle", "Vancouver Grizzlies": "Vancouver",
    "Oakland Raiders": "San Francisco / Oakland / San Jose", "San Diego Chargers": "San Diego",
    "St. Louis Rams": "St. Louis", "Tennessee Oilers": "Nashville", "Washington Football Team": "Washington",
    "Washington Redskins": "Washington",
    "Arizona Coyotes": "Phoenix", "Atlanta Thrashers": "Atlanta", "Mighty Ducks of Anaheim": "Los Angeles / Anaheim",
    "Phoenix Coyotes": "Phoenix",
    "Charlotte Sting": "Charlotte", "Cleveland Rockers": "Cleveland", "Detroit Shock": "Detroit",
    "Houston Comets": "Houston", "Miami Sol": "Miami / Fort Lauderdale", "Orlando Miracle": "Orlando",
    "Sacramento Monarchs": "Sacramento", "San Antonio Silver Stars": "San Antonio", "Tulsa Shock": "Tulsa",
    "Utah Starzz": "Salt Lake City",
    "Washington Bullets": "Washington", "Phoenix Cardinals": "Phoenix", "Kansas City Wiz": "Kansas City",
    "Kansas City Kings": "Kansas City", "San Diego Clippers": "San Diego", "Baltimore Colts": "Baltimore",
    "Houston Oilers": "Houston", "Los Angeles Raiders": "Los Angeles / Anaheim", "Atlanta Flames": "Atlanta",
    "Hartford Whalers": "Hartford / New Haven", "Minnesota North Stars": "Minneapolis / St. Paul",
    "Quebec Nordiques": "Quebec City",
  };

  // City's most recent pre-1980 championship in that sport (year, era-correct
  // team name, optional note). Format key: "<DMA>__<sport>".
  var PRE_1980_LAST_TITLE = {
    "Buffalo__NFL": [1965, "Buffalo Bills", "AFL"],
    "Cleveland__NFL": [1964, "Cleveland Browns"],
    "Detroit__NFL": [1957, "Detroit Lions"],
    "Houston__NFL": [1961, "Houston Oilers", "AFL"],
    "San Diego__NFL": [1963, "San Diego Chargers", "AFL"],
    "New York / New Jersey__NBA": [1973, "New York Knicks"],
    "Portland__NBA": [1977, "Portland Trail Blazers"],
    "Washington__NBA": [1978, "Washington Bullets"],
    "Cleveland__MLB": [1948, "Cleveland Indians"],
    "Pittsburgh__MLB": [1979, "Pittsburgh Pirates"],
    "Milwaukee__MLB": [1957, "Milwaukee Braves"],
    "Toronto__NHL": [1967, "Toronto Maple Leafs"],
    "Philadelphia__NHL": [1975, "Philadelphia Flyers"],
  };

  // Market fielded a team in the sport pre-1980 but never won a title. Year =
  // when that market got its first team in that sport.
  var PRE_1980_MARKET_START = {
    "Cincinnati__NFL": 1968, "Atlanta__NFL": 1966, "Minneapolis / St. Paul__NFL": 1961,
    "Atlanta__NBA": 1968, "Phoenix__NBA": 1968, "Indianapolis__NBA": 1976,
    "San Diego__MLB": 1969, "Buffalo__NHL": 1970, "Vancouver__NHL": 1970, "Winnipeg__NHL": 1980,
  };

  // Year a franchise began play IN ITS CURRENT MARKET, for teams founded
  // before the 1980 data floor. Extends tenure back so team-years is
  // accurate when a city's drought also started pre-1980.
  var TEAM_MARKET_ENTRY = {
    "Buffalo Bills": 1960, "San Diego Chargers": 1961,
    "Buffalo Sabres": 1970, "Vancouver Canucks": 1970,
    "San Diego Padres": 1969,
  };

  var FRANCHISE_RENAMES = {
    "Washington Bullets": "Washington Wizards", "Charlotte Bobcats": "Charlotte Hornets",
    "Cleveland Indians": "Cleveland Guardians", "Florida Marlins": "Miami Marlins",
    "Tampa Bay Devil Rays": "Tampa Bay Rays",
    "Chicago Black Hawks": "Chicago Blackhawks", "Mighty Ducks of Anaheim": "Anaheim Ducks",
    "Phoenix Coyotes": "Arizona Coyotes",
    "Washington Redskins": "Washington Commanders", "Washington Football Team": "Washington Commanders",
    "Phoenix Cardinals": "Arizona Cardinals", "Tennessee Oilers": "Tennessee Titans",
  };
  function franchiseName(name) { return FRANCHISE_RENAMES[name] || name; }

  // Pre-1980 championships keyed by `${sport}__${current-franchise name}`.
  // Current-market only (relocated franchises' old-city titles are NOT
  // here); renames-in-place DO carry (Bullets->Wizards, etc).
  var TEAM_PRE1980_TITLES = {
    "NBA__Boston Celtics": [1957,1959,1960,1961,1962,1963,1964,1965,1966,1968,1969,1974,1976],
    "NBA__New York Knicks": [1970,1973], "NBA__Milwaukee Bucks": [1971], "NBA__Los Angeles Lakers": [1972],
    "NBA__Golden State Warriors": [1975], "NBA__Portland Trail Blazers": [1977], "NBA__Washington Wizards": [1978],
    "NBA__Philadelphia 76ers": [1967],
    "MLB__New York Yankees": [1923,1927,1928,1932,1936,1937,1938,1939,1941,1943,1947,1949,1950,1951,1952,1953,1956,1958,1961,1962,1977,1978],
    "MLB__Boston Red Sox": [1903,1912,1915,1916,1918], "MLB__Chicago White Sox": [1906,1917],
    "MLB__Chicago Cubs": [1907,1908], "MLB__Pittsburgh Pirates": [1909,1925,1960,1971,1979],
    "MLB__St. Louis Cardinals": [1926,1931,1934,1942,1944,1946,1964,1967], "MLB__Detroit Tigers": [1935,1945,1968],
    "MLB__Cincinnati Reds": [1919,1940,1975,1976], "MLB__Cleveland Guardians": [1920,1948],
    "MLB__Los Angeles Dodgers": [1959,1963,1965], "MLB__Baltimore Orioles": [1966,1970], "MLB__New York Mets": [1969],
    "NHL__Montreal Canadiens": [1924,1930,1931,1944,1946,1953,1956,1957,1958,1959,1960,1965,1966,1968,1969,1971,1973,1976,1977,1978,1979],
    "NHL__Toronto Maple Leafs": [1918,1922,1932,1942,1945,1947,1948,1949,1951,1962,1963,1964,1967],
    "NHL__Boston Bruins": [1929,1939,1941,1970,1972], "NHL__New York Rangers": [1928,1933,1940],
    "NHL__Detroit Red Wings": [1936,1937,1943,1950,1952,1954,1955], "NHL__Chicago Blackhawks": [1934,1938,1961],
    "NHL__Philadelphia Flyers": [1974,1975],
    "NFL__Buffalo Bills": [1964,1965], "NFL__Green Bay Packers": [1929,1930,1931,1936,1939,1944,1961,1962,1965,1966,1967],
    "NFL__Chicago Bears": [1921,1932,1933,1940,1941,1943,1946,1963], "NFL__New York Giants": [1927,1934,1938,1956],
    "NFL__Detroit Lions": [1935,1952,1953,1957], "NFL__Washington Commanders": [1937,1942],
    "NFL__Philadelphia Eagles": [1948,1949,1960], "NFL__Cleveland Browns": [1950,1954,1955,1964],
    "NFL__Los Angeles Rams": [1951], "NFL__Kansas City Chiefs": [1969], "NFL__New York Jets": [1968],
    "NFL__Dallas Cowboys": [1971,1977], "NFL__Miami Dolphins": [1972,1973], "NFL__Pittsburgh Steelers": [1974,1975,1978,1979],
  };

  // Year a franchise began major-league play in its current market, for
  // teams founded/arrived before the 1980 data floor.
  var TEAM_FOUNDED = {
    "NBA__Cleveland Cavaliers": 1970, "NBA__Detroit Pistons": 1957, "NBA__Chicago Bulls": 1966,
    "NBA__Houston Rockets": 1971, "NBA__Denver Nuggets": 1967, "NBA__San Antonio Spurs": 1973,
    "MLB__Philadelphia Phillies": 1883, "MLB__Kansas City Royals": 1969, "MLB__Los Angeles Angels": 1961,
    "MLB__Houston Astros": 1962, "MLB__Texas Rangers": 1972, "MLB__Toronto Blue Jays": 1977,
    "MLB__Atlanta Braves": 1966, "MLB__Minnesota Twins": 1961, "MLB__San Francisco Giants": 1958,
    "NHL__New York Islanders": 1972, "NHL__Edmonton Oilers": 1972, "NHL__Calgary Flames": 1980,
    "NHL__Pittsburgh Penguins": 1967, "NHL__Los Angeles Kings": 1967, "NHL__St. Louis Blues": 1967,
    "NHL__Washington Capitals": 1974,
    "NFL__San Francisco 49ers": 1946, "NFL__New England Patriots": 1960, "NFL__Denver Broncos": 1960,
    "NFL__New Orleans Saints": 1967, "NFL__Seattle Seahawks": 1976, "NFL__Tampa Bay Buccaneers": 1976,
    "NBA__Phoenix Suns": 1968, "NBA__Indiana Pacers": 1967, "NBA__Atlanta Hawks": 1968, "NBA__Utah Jazz": 1979,
    "MLB__San Diego Padres": 1969, "MLB__Milwaukee Brewers": 1970, "MLB__Seattle Mariners": 1977,
    "NHL__Buffalo Sabres": 1970, "NHL__Vancouver Canucks": 1970,
    "NFL__Minnesota Vikings": 1961, "NFL__Atlanta Falcons": 1966, "NFL__Cincinnati Bengals": 1968,
  };

  // Short team names for chip display: the city is already established by
  // the row, so chips show just the nickname.
  var TEAM_SHORT_NAME = {
    "Atlanta Hawks": "Hawks", "Boston Celtics": "Celtics", "Brooklyn Nets": "Nets", "Charlotte Hornets": "Hornets",
    "Chicago Bulls": "Bulls", "Cleveland Cavaliers": "Cavaliers", "Dallas Mavericks": "Mavericks",
    "Denver Nuggets": "Nuggets", "Detroit Pistons": "Pistons", "Golden State Warriors": "Warriors",
    "Houston Rockets": "Rockets", "Indiana Pacers": "Pacers", "Los Angeles Clippers": "Clippers",
    "Los Angeles Lakers": "Lakers", "Memphis Grizzlies": "Grizzlies", "Miami Heat": "Heat",
    "Milwaukee Bucks": "Bucks", "Minnesota Timberwolves": "Timberwolves", "New Orleans Pelicans": "Pelicans",
    "New York Knicks": "Knicks", "Oklahoma City Thunder": "Thunder", "Orlando Magic": "Magic",
    "Philadelphia 76ers": "76ers", "Phoenix Suns": "Suns", "Portland Trail Blazers": "Trail Blazers",
    "Sacramento Kings": "Kings", "San Antonio Spurs": "Spurs", "Toronto Raptors": "Raptors",
    "Utah Jazz": "Jazz", "Washington Wizards": "Wizards", "Washington Bullets": "Bullets",
    "Charlotte Bobcats": "Bobcats", "NO/OKC Hornets": "Hornets", "New Jersey Nets": "Nets",
    "New Orleans Hornets": "Hornets", "Seattle SuperSonics": "SuperSonics", "Vancouver Grizzlies": "Grizzlies",
    "Atlanta Dream": "Dream", "Chicago Sky": "Sky", "Connecticut Sun": "Sun", "Dallas Wings": "Wings",
    "Golden State Valkyries": "Valkyries", "Indiana Fever": "Fever", "Las Vegas Aces": "Aces",
    "Los Angeles Sparks": "Sparks", "Minnesota Lynx": "Lynx", "New York Liberty": "Liberty",
    "Phoenix Mercury": "Mercury", "Portland Fire": "Fire", "Seattle Storm": "Storm", "Toronto Tempo": "Tempo",
    "Washington Mystics": "Mystics", "Charlotte Sting": "Sting", "Cleveland Rockers": "Rockers",
    "Detroit Shock": "Shock", "Houston Comets": "Comets", "Miami Sol": "Sol", "Orlando Miracle": "Miracle",
    "Sacramento Monarchs": "Monarchs", "San Antonio Silver Stars": "Silver Stars", "Tulsa Shock": "Shock",
    "Utah Starzz": "Starzz",
    "Arizona Cardinals": "Cardinals", "Phoenix Cardinals": "Cardinals", "Atlanta Falcons": "Falcons",
    "Baltimore Ravens": "Ravens", "Buffalo Bills": "Bills", "Carolina Panthers": "Panthers",
    "Chicago Bears": "Bears", "Cincinnati Bengals": "Bengals", "Cleveland Browns": "Browns",
    "Dallas Cowboys": "Cowboys", "Denver Broncos": "Broncos", "Detroit Lions": "Lions",
    "Green Bay Packers": "Packers", "Houston Texans": "Texans", "Indianapolis Colts": "Colts",
    "Jacksonville Jaguars": "Jaguars", "Kansas City Chiefs": "Chiefs", "Las Vegas Raiders": "Raiders",
    "Los Angeles Chargers": "Chargers", "Los Angeles Rams": "Rams", "Miami Dolphins": "Dolphins",
    "Minnesota Vikings": "Vikings", "New England Patriots": "Patriots", "New Orleans Saints": "Saints",
    "New York Giants": "Giants", "New York Jets": "Jets", "Philadelphia Eagles": "Eagles",
    "Pittsburgh Steelers": "Steelers", "San Francisco 49ers": "49ers", "Seattle Seahawks": "Seahawks",
    "Tampa Bay Buccaneers": "Buccaneers", "Tennessee Titans": "Titans", "Washington Commanders": "Commanders",
    "Oakland Raiders": "Raiders", "San Diego Chargers": "Chargers", "St. Louis Rams": "Rams",
    "Tennessee Oilers": "Oilers", "Washington Football Team": "Football Team", "Washington Redskins": "Redskins",
    "Arizona Diamondbacks": "Diamondbacks", "Atlanta Braves": "Braves", "Baltimore Orioles": "Orioles",
    "Boston Red Sox": "Red Sox", "Chicago Cubs": "Cubs", "Chicago White Sox": "White Sox",
    "Cincinnati Reds": "Reds", "Cleveland Guardians": "Guardians", "Colorado Rockies": "Rockies",
    "Detroit Tigers": "Tigers", "Houston Astros": "Astros", "Kansas City Royals": "Royals",
    "Las Vegas Athletics": "Athletics", "Athletics": "Athletics", "Los Angeles Angels": "Angels",
    "Los Angeles Dodgers": "Dodgers", "Miami Marlins": "Marlins", "Milwaukee Brewers": "Brewers",
    "Minnesota Twins": "Twins", "New York Mets": "Mets", "New York Yankees": "Yankees",
    "Oakland Athletics": "Athletics", "Philadelphia Phillies": "Phillies", "Pittsburgh Pirates": "Pirates",
    "San Diego Padres": "Padres", "San Francisco Giants": "Giants", "Seattle Mariners": "Mariners",
    "St. Louis Cardinals": "Cardinals", "Tampa Bay Rays": "Rays", "Texas Rangers": "Rangers",
    "Toronto Blue Jays": "Blue Jays", "Washington Nationals": "Nationals", "Cleveland Indians": "Indians",
    "Florida Marlins": "Marlins", "Montreal Expos": "Expos", "Tampa Bay Devil Rays": "Devil Rays",
    "Anaheim Ducks": "Ducks", "Boston Bruins": "Bruins", "Buffalo Sabres": "Sabres", "Calgary Flames": "Flames",
    "Carolina Hurricanes": "Hurricanes", "Chicago Blackhawks": "Blackhawks", "Chicago Black Hawks": "Black Hawks",
    "Colorado Avalanche": "Avalanche", "Columbus Blue Jackets": "Blue Jackets", "Dallas Stars": "Stars",
    "Detroit Red Wings": "Red Wings", "Edmonton Oilers": "Oilers", "Florida Panthers": "Panthers",
    "Los Angeles Kings": "Kings", "Minnesota Wild": "Wild", "Montreal Canadiens": "Canadiens",
    "Nashville Predators": "Predators", "New Jersey Devils": "Devils", "New York Islanders": "Islanders",
    "New York Rangers": "Rangers", "Ottawa Senators": "Senators", "Philadelphia Flyers": "Flyers",
    "Pittsburgh Penguins": "Penguins", "San Jose Sharks": "Sharks", "Seattle Kraken": "Kraken",
    "St. Louis Blues": "Blues", "Tampa Bay Lightning": "Lightning", "Toronto Maple Leafs": "Maple Leafs",
    "Utah Mammoth": "Mammoth", "Utah Hockey Club": "Hockey Club", "Vancouver Canucks": "Canucks",
    "Vegas Golden Knights": "Golden Knights", "Washington Capitals": "Capitals", "Winnipeg Jets": "Jets",
    "Arizona Coyotes": "Coyotes", "Atlanta Thrashers": "Thrashers", "Mighty Ducks of Anaheim": "Mighty Ducks",
    "Phoenix Coyotes": "Coyotes",
    "Atlanta United FC": "United", "Austin FC": "Austin FC", "CF Montréal": "CF Montréal",
    "Charlotte FC": "Charlotte FC", "Chicago Fire FC": "Fire", "Colorado Rapids": "Rapids",
    "Columbus Crew": "Crew", "D.C. United": "D.C. United", "FC Cincinnati": "FC Cincinnati",
    "FC Dallas": "FC Dallas", "Houston Dynamo FC": "Dynamo", "Inter Miami CF": "Inter Miami",
    "LA Galaxy": "Galaxy", "LAFC": "LAFC", "Minnesota United FC": "United", "Nashville SC": "Nashville SC",
    "New England Revolution": "Revolution", "New York City FC": "NYCFC", "New York Red Bulls": "Red Bulls",
    "Red Bull New York": "Red Bulls", "Orlando City SC": "Orlando City", "Philadelphia Union": "Union",
    "Portland Timbers": "Timbers", "Real Salt Lake": "Real Salt Lake", "San Diego FC": "San Diego FC",
    "San Jose Earthquakes": "Earthquakes", "Seattle Sounders FC": "Sounders", "Sporting Kansas City": "Sporting KC",
    "St. Louis CITY SC": "St. Louis CITY", "Toronto FC": "Toronto FC", "Vancouver Whitecaps FC": "Whitecaps",
    "Vancouver Whitecaps": "Whitecaps", "Chicago Fire": "Fire", "Chivas USA": "Chivas USA",
    "Columbus Crew SC": "Crew", "Dallas Burn": "Burn", "Houston Dynamo": "Dynamo", "Kansas City Wizards": "Wizards",
    "MetroStars": "MetroStars", "Miami Fusion": "Fusion", "Montreal Impact": "Impact",
    "NY/NJ MetroStars": "MetroStars", "San Jose Clash": "Clash", "Tampa Bay Mutiny": "Mutiny",
  };

  function seasonYearFor(sport, dateStr) {
    if (!dateStr) return null;
    var yr = parseInt(dateStr.slice(0, 4), 10);
    if (isNaN(yr)) return null;
    return sport === "NFL" ? yr - 1 : yr;
  }

  var CITY_SPORTS = [
    { repo: "duncan", label: "NBA" }, { repo: "lobo", label: "WNBA" }, { repo: "dillon", label: "NFL" },
    { repo: "griffey", label: "MLB" }, { repo: "sakic", label: "NHL" }, { repo: "cobi", label: "MLS" },
  ];

  function vibeRankCompare(a, b) {
    if (b.vibeZ !== a.vibeZ) return b.vibeZ - a.vibeZ;
    if (a.nTeams !== b.nTeams) return a.nTeams - b.nTeams;
    return b.sumNegZ - a.sumNegZ;
  }

  function aggregateMetros(sportPayloads) {
    for (var i = 0; i < sportPayloads.length; i++) {
      var s = sportPayloads[i];
      var ratings = s.teams.map(function (t) { return t.rating; }).filter(function (r) { return r != null; });
      if (ratings.length < 2) continue;
      var mean, std;
      if (sportStats && sportStats[s.label]) {
        mean = sportStats[s.label].mean;
        std = sportStats[s.label].std;
      } else {
        mean = ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length;
        std = Math.sqrt(ratings.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / ratings.length);
      }
      if (std === 0) continue;
      var zScale = (sportZScale && sportZScale[s.label]) || 1;
      s.teams.forEach(function (t) {
        if (t.rating != null) t.zScore = ((t.rating - mean) / std) * zScale;
      });
    }

    var metros = {};
    sportPayloads.forEach(function (s) {
      s.teams.forEach(function (t) {
        if (t.zScore == null) return;
        var teamName = t.display_name || t.team || t.name;
        var metro = TEAM_TO_METRO[teamName];
        if (!metro) return;
        var fs = t.finalsStatus != null ? t.finalsStatus : (t.finals_status != null ? t.finals_status : 0);
        if (!metros[metro]) metros[metro] = { name: metro, teams: [] };
        metros[metro].teams.push({
          sport: s.label, team: teamName, rating: t.rating, zScore: t.zScore,
          finalsStatus: fs, seasonYear: t.seasonYear,
        });
      });
    });
    return Object.keys(metros).map(function (k) { return finalizeMetro(metros[k]); });
  }

  function finalizeMetro(m) {
    m.nTeams = m.teams.length;
    m.nSports = new Set(m.teams.map(function (t) { return t.sport; })).size;
    var raw = 0;
    var contributors = [];
    m.teams.forEach(function (t) {
      if (t.zScore <= 0) return;
      if (t.finalsStatus === 2) { raw += t.zScore; contributors.push(t); }
      else if (t.finalsStatus === 1) { raw += 0.5 * t.zScore; contributors.push(t); }
      else raw += 0.2 * t.zScore;
    });
    m.vibeZ = m.nTeams > 0 ? raw / Math.pow(m.nTeams, 0.3) : raw;
    m.vibeContributors = contributors.sort(function (a, b) { return b.zScore - a.zScore; });
    m.nPositive = m.teams.filter(function (t) { return t.zScore > 0; }).length;
    m.sumNegZ = m.teams.filter(function (t) { return t.zScore < 0; }).reduce(function (s, t) { return s + t.zScore; }, 0);
    m.teams.sort(function (a, b) { return b.zScore - a.zScore; });
    return m;
  }

  var cityData = null;
  var csrSelected = null;
  var chSelectedCity = "";
  var sportStats = null;
  var sportZScale = null;

  function buildSportStats(history) {
    var uniq = {};
    (history.snapshots || []).forEach(function (snap) {
      snap.teams.forEach(function (t) {
        uniq[t.sport + "__" + t.team + "__" + snap.year] = t.rating;
      });
    });
    var bySport = {};
    Object.keys(uniq).forEach(function (k) {
      var sport = k.slice(0, k.indexOf("__"));
      (bySport[sport] = bySport[sport] || []).push(uniq[k]);
    });
    var stats = {};
    Object.keys(bySport).forEach(function (sport) {
      var ratings = bySport[sport];
      if (ratings.length < 2) return;
      var mean = ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length;
      var std = Math.sqrt(ratings.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / ratings.length);
      stats[sport] = { mean: mean, std: std };
    });
    return stats;
  }

  var CHAMP_KIND_SPORTS = {
    NBA: ["NBA"], NHL: ["NHL"], "nba+nhl": ["NBA", "NHL"],
    NFL: ["NFL"], MLB: ["MLB"], WNBA: ["WNBA"], MLS: ["MLS"],
  };

  function buildSportZScale(history, stats) {
    var champZ = {};
    var seen = {};
    (history.snapshots || []).forEach(function (snap) {
      var crown = CHAMP_KIND_SPORTS[snap.kind];
      if (!crown) return;
      crown.forEach(function (sp) {
        var st = stats[sp];
        if (!st || !st.std) return;
        seen[sp] = seen[sp] || new Set();
        snap.teams.forEach(function (c) {
          if (c.sport !== sp || c.finalsStatus !== 2) return;
          var key = c.team + "__" + snap.year;
          if (seen[sp].has(key)) return;
          seen[sp].add(key);
          (champZ[sp] = champZ[sp] || []).push((c.rating - st.mean) / st.std);
        });
      });
    });
    var sportChampMean = {};
    Object.keys(champZ).forEach(function (sp) {
      sportChampMean[sp] = champZ[sp].reduce(function (a, b) { return a + b; }, 0) / champZ[sp].length;
    });
    var TARGET_CHAMP_Z = 5.0;
    var scale = {};
    Object.keys(sportChampMean).forEach(function (sp) {
      scale[sp] = sportChampMean[sp] > 0 ? TARGET_CHAMP_Z / sportChampMean[sp] : 1;
    });
    return scale;
  }

  function ensureCityData() {
    if (cityData) return Promise.resolve(cityData);
    var fetches = CITY_SPORTS.map(function (s) {
      return fetchJson(GH + "/" + s.repo + "/data/current_standings.json").then(function (d) {
        return { repo: s.repo, label: s.label, teams: d.teams };
      });
    });
    fetches.push(fetchJson(GH + "/sports-ratings/data/city_index_history.json").then(function (d) { return { __history: d }; }));
    return Promise.all(fetches).then(function (results) {
      var sportPayloads = results.filter(function (r) { return !r.__history; });
      var history = results.filter(function (r) { return r.__history; })[0].__history;

      sportStats = buildSportStats(history);
      sportZScale = buildSportZScale(history, sportStats);

      var currentMetros = aggregateMetros(sportPayloads);
      currentMetros.sort(vibeRankCompare);

      var snapshotMetros = (history.snapshots || []).map(function (snap) {
        var grouped = {};
        snap.teams.forEach(function (t) {
          if (!grouped[t.sport]) grouped[t.sport] = { label: t.sport, teams: [] };
          grouped[t.sport].teams.push({
            rating: t.rating, team: t.team, finalsStatus: t.finalsStatus,
            seasonYear: seasonYearFor(t.sport, snap.snapshots_used[t.sport]),
          });
        });
        var metros = aggregateMetros(Object.keys(grouped).map(function (k) { return grouped[k]; }));
        metros.sort(vibeRankCompare);
        return {
          date: snap.date, label: snap.label, year: snap.year, kind: snap.kind,
          snapshots_used: snap.snapshots_used, metros: metros,
        };
      });

      cityData = { current: currentMetros, snapshotMetros: snapshotMetros };
      return cityData;
    }).catch(function (e) {
      cityData = { error: e.message };
      return cityData;
    });
  }

  var LEAGUE_PRESETS = {
    big4: { label: "Historical Big 4", sports: ["NBA", "NFL", "MLB", "NHL"] },
    big4mls: { label: "Big 4 + MLS", sports: ["NBA", "NFL", "MLB", "NHL", "MLS"] },
    all: { label: "Big 4 + MLS + WNBA", sports: ["NBA", "NFL", "MLB", "NHL", "MLS", "WNBA"] },
  };
  var leaguePreset = "all";
  function currentSports() { return new Set(LEAGUE_PRESETS[leaguePreset].sports); }

  function filterCityData(data) {
    if (!data || data.error) return data;
    var sports = currentSports();
    if (sports.size >= 6) return data;
    function filterMetros(metros) {
      return (metros || []).map(function (m) {
        var teams = m.teams.filter(function (t) { return sports.has(t.sport); });
        if (teams.length === 0) return null;
        return finalizeMetro({ name: m.name, teams: teams.map(function (t) { return Object.assign({}, t); }) });
      }).filter(Boolean).sort(vibeRankCompare);
    }
    return {
      current: filterMetros(data.current),
      snapshotMetros: (data.snapshotMetros || []).map(function (s) { return Object.assign({}, s, { metros: filterMetros(s.metros) }); }),
    };
  }
  function viewCityData() { return ensureCityData().then(filterCityData); }

  document.querySelectorAll("#leagueFilter [data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (leaguePreset === btn.dataset.preset) return;
      leaguePreset = btn.dataset.preset;
      document.querySelectorAll("#leagueFilter [data-preset]").forEach(function (b) { b.classList.toggle("active", b === btn); });
      cityRendered = {};
      renderActiveCityTab();
    });
  });

  var CHART_COLORS = ["#1a6b8a", "#e76f51", "#2a9d8f", "#9d4edd", "#f4a261", "#264653", "#e63946", "#06a77d", "#f72585", "#7209b7", "#3a86ff", "#ff7b00"];

  // One chip per team contributing to a metro's roster: nickname + 2-digit
  // season year, championship state layered on via .win/.runner.
  function teamChipHtml(t) {
    var classes = ["team-chip"];
    var extra = "";
    if (t.finalsStatus === 2) { classes.push("win"); extra = " 👑"; }
    else if (t.finalsStatus === 1) { classes.push("runner"); extra = " 🥈"; }
    var z = t.zScore.toFixed(2);
    var shortName = TEAM_SHORT_NAME[t.team] || t.team;
    var yr = t.seasonYear != null ? '<span class="yr">' + ("'" + String(t.seasonYear).slice(-2)) + "</span> " : "";
    return '<span class="' + classes.join(" ") + '"><span class="sport-tag">' + t.sport + "</span>" + yr + shortName + extra + '<span class="z">' + z + "</span></span>";
  }

  function fmtScore(v) { return v == null ? "-" : v.toFixed(2); }

  function metroParticipatesIn(metro, snapKind) {
    var targets = snapKind === "nba+nhl" ? { NBA: 1, NHL: 1 } : {};
    if (snapKind !== "nba+nhl") targets[snapKind] = 1;
    return metro.teams.some(function (t) { return targets[t.sport]; });
  }

  function buildRankingsTable(metros) {
    var rows = metros.map(function (m, i) {
      var chips = m.teams.map(teamChipHtml).join("");
      var meta = m.nSports === 1 ? ' <span class="single-sport-tag">1 sport</span>' : "";
      return (
        "<tr><td class=\"col-rank\">" + (i + 1) + "</td>" +
        '<td class="team-cell linked" data-city-link="' + escapeHtml(m.name) + '">' + escapeHtml(m.name) + meta + "</td>" +
        '<td class="vibe-cell">' + fmtScore(m.vibeZ) + "</td>" +
        '<td class="team-chips-cell">' + chips + "</td></tr>"
      );
    }).join("");
    return (
      '<div class="sport-table-wrap"><table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Rank</th><th>City</th><th>Vibe</th><th>Teams</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>"
    );
  }

  function attachCityLinks() {
    document.querySelectorAll("[data-city-link]").forEach(function (el) {
      if (el.dataset.linkBound) return;
      el.dataset.linkBound = "1";
      el.addEventListener("click", function () { navigateToCity(el.dataset.cityLink); });
    });
    document.querySelectorAll("[data-year-link]").forEach(function (el) {
      if (el.dataset.linkBound) return;
      el.dataset.linkBound = "1";
      el.addEventListener("click", function () { navigateToYear(parseInt(el.dataset.yearLink, 10)); });
    });
  }

  function navigateToCity(cityName) {
    document.querySelector('#portalTabs .sport-tab[data-tab="city-history"]').click();
    setTimeout(function () {
      var sel = document.getElementById("ch-city");
      if (!sel) return;
      sel.value = cityName;
      sel.dispatchEvent(new Event("change"));
    }, 50);
  }
  function navigateToYear(year) {
    document.querySelector('#portalTabs .sport-tab[data-tab="cross-sport-rankings"]').click();
    setTimeout(function () {
      var sel = document.getElementById("csr-date");
      if (!sel) return;
      var match = null;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].textContent.indexOf(year + "-") === 0) { match = sel.options[i]; break; }
      }
      if (match) {
        sel.value = match.value;
        sel.dispatchEvent(new Event("change"));
      }
    }, 50);
  }

  // ── Cross-Sport Rankings ────────────────────────────────────────────────
  function renderCrossSportRankings() {
    var el = document.getElementById("crossSportRankingsContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var opts = data.snapshotMetros.map(function (s, i) {
        return { value: String(i), text: s.date + " | " + s.label, date: s.date };
      }).sort(function (a, b) { return b.date.localeCompare(a.date); });

      el.innerHTML =
        '<div class="sport-controls"><select id="csr-date" class="sport-select">' +
        opts.map(function (o) { return '<option value="' + o.value + '">' + escapeHtml(o.text) + "</option>"; }).join("") +
        '</select><span class="sport-count" id="csr-meta"></span></div><div id="csr-table"></div>';

      var sel = el.querySelector("#csr-date");
      var tbl = el.querySelector("#csr-table");
      var meta = el.querySelector("#csr-meta");
      var sports = currentSports();
      function update() {
        csrSelected = sel.value;
        var snap = data.snapshotMetros[parseInt(sel.value, 10)];
        tbl.innerHTML = buildRankingsTable(snap.metros);
        var used = Object.keys(snap.snapshots_used || {})
          .filter(function (k) { return sports.has(k); })
          .sort(function (a, b) { return snap.snapshots_used[b].localeCompare(snap.snapshots_used[a]); })
          .map(function (k) { return k + " " + snap.snapshots_used[k]; }).join(" · ");
        meta.textContent = used ? "Sport rating windows: " + used : "";
        attachCityLinks();
      }
      if (csrSelected != null && opts.some(function (o) { return o.value === csrSelected; })) sel.value = csrSelected;
      sel.addEventListener("change", update);
      update();
    });
  }

  // ── City History ────────────────────────────────────────────────────────
  function renderCityHistory() {
    var el = document.getElementById("cityHistoryContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var cityNames = new Set();
      data.snapshotMetros.forEach(function (s) { s.metros.forEach(function (m) { cityNames.add(m.name); }); });
      data.current.forEach(function (m) { cityNames.add(m.name); });
      var allCities = Array.from(cityNames).sort();

      el.innerHTML =
        '<div class="sport-controls"><select id="ch-city" class="sport-select"><option value="">- Pick a city -</option>' +
        allCities.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + "</option>"; }).join("") +
        '</select></div>' +
        '<div id="city-history-chart-wrap" class="sport-chart-wrap city-history-chart-wrap" hidden><svg id="city-history-chart" class="sport-city-chart"></svg></div>' +
        '<div id="ch-table"><p class="sport-loading">Pick a city above to see its history</p></div>';

      var sel = el.querySelector("#ch-city");
      function update() {
        chSelectedCity = sel.value;
        if (sel.value) {
          renderSingleCityChart(sel.value, data);
        } else {
          document.getElementById("city-history-chart-wrap").hidden = true;
          document.getElementById("ch-table").innerHTML = '<p class="sport-loading">Pick a city above to see its history</p>';
        }
      }
      if (chSelectedCity && allCities.indexOf(chSelectedCity) !== -1) sel.value = chSelectedCity;
      sel.addEventListener("change", update);
      update();
    });
  }

  function renderSingleCityChart(cityName, data) {
    var wrap = document.getElementById("city-history-chart-wrap");
    var svg = document.getElementById("city-history-chart");
    var tableEl = document.getElementById("ch-table");

    var points = [];
    data.snapshotMetros.forEach(function (s) {
      var m = s.metros.filter(function (x) { return x.name === cityName; })[0];
      if (!m) return;
      if (!metroParticipatesIn(m, s.kind)) return;
      var trophySports = s.kind === "nba+nhl" ? { NBA: 1, NHL: 1 } : {};
      if (s.kind !== "nba+nhl") trophySports[s.kind] = 1;
      var hasChamp = m.teams.some(function (t) { return t.finalsStatus === 2 && trophySports[t.sport]; });
      var hasRu = m.teams.some(function (t) { return t.finalsStatus === 1 && trophySports[t.sport]; });
      var field = s.metros.filter(function (x) { return x.vibeZ != null; });
      var rank = 1 + field.filter(function (x) { return x.vibeZ > m.vibeZ; }).length;
      points.push({ date: s.date, label: s.label, year: s.year, vibeZ: m.vibeZ, rank: rank, teams: m.teams, kind: s.kind, hasChamp: hasChamp, hasRu: hasRu });
    });

    if (points.length === 0) {
      wrap.hidden = true;
      tableEl.innerHTML = '<p class="sport-loading">' + escapeHtml(cityName) + " has no ratings in the range</p>";
      return;
    }
    wrap.hidden = false;

    var W = svg.parentElement.clientWidth - 32;
    var H = 220;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var CTOP = 16, CBOT = 184;
    var maxVibe = 0;
    points.forEach(function (p) { if (p.vibeZ > maxVibe) maxVibe = p.vibeZ; });
    var CHART_MAX = Math.max(2, Math.ceil(maxVibe * 1.15));
    function px(i) { return (i / (points.length - 1)) * (W - 20) + 10; }
    function py(v) { return CBOT - (v / CHART_MAX) * (CBOT - CTOP); }
    var zeroY = py(0);
    var polyPoints = points.map(function (p, i) { return px(i).toFixed(1) + "," + py(p.vibeZ).toFixed(1); }).join(" ");

    var yearMin = points[0].year, yearMax = points[points.length - 1].year;
    var span = yearMax - yearMin;
    var yearStep = span > 20 ? 4 : (span > 10 ? 2 : 1);
    var xLabels = [];
    var seen = {};
    points.forEach(function (p, i) {
      if (seen[p.year]) return;
      if ((p.year - yearMin) % yearStep !== 0 && p.year !== yearMax) return;
      seen[p.year] = true;
      var x = px(i);
      xLabels.push('<text class="chart-ticklabel" x="' + x.toFixed(1) + '" y="' + (CBOT + 16) + '" font-size="10" text-anchor="middle">' + p.year + "</text>");
    });

    var trophies = [];
    points.forEach(function (p, i) {
      if (!p.hasChamp && !p.hasRu) return;
      var emoji = p.hasChamp ? "👑" : "🥈";
      var wins = p.teams.filter(function (t) { return t.finalsStatus === (p.hasChamp ? 2 : 1); });
      var tip = wins.map(function (t) { return t.sport + " " + t.team + " " + (p.hasChamp ? "champion" : "runner-up") + " (" + p.year + ")"; }).join(" / ");
      var x = px(i);
      var y = Math.max(14, py(p.vibeZ) - 12);
      trophies.push(
        '<g style="cursor:help"><title>' + escapeHtml(tip) + '</title>' +
        '<rect x="' + (x - 9).toFixed(1) + '" y="' + (y - 12).toFixed(1) + '" width="18" height="18" fill="transparent"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="14" text-anchor="middle" pointer-events="none">' + emoji + "</text></g>"
      );
    });

    svg.innerHTML =
      '<line class="chart-zero" x1="10" y1="' + zeroY.toFixed(1) + '" x2="' + (W - 10).toFixed(1) + '" y2="' + zeroY.toFixed(1) + '" stroke-width="1" stroke-dasharray="4,3"/>' +
      '<line class="chart-axis" x1="10" y1="' + (CBOT + 2).toFixed(1) + '" x2="' + (W - 10).toFixed(1) + '" y2="' + (CBOT + 2).toFixed(1) + '" stroke-width="1"/>' +
      xLabels.join("") +
      '<polyline points="' + polyPoints + '" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>' +
      trophies.join("");

    var rows = points.slice().reverse().map(function (p) {
      var chips = p.teams.map(teamChipHtml).join("");
      return (
        '<tr><td class="col-od">' + p.date + "</td>" +
        '<td class="season-cell linked" data-year-link="' + p.year + '">' + escapeHtml(p.label) + "</td>" +
        '<td class="col-rank">' + p.rank + "</td>" +
        '<td class="vibe-cell">' + fmtScore(p.vibeZ) + "</td>" +
        '<td class="team-chips-cell">' + chips + "</td></tr>"
      );
    }).join("");
    tableEl.innerHTML =
      '<div class="sport-table-wrap"><table class="sport-table"><thead><tr>' +
      "<th>Date</th><th>Rating Window</th><th>Rank</th><th>Vibe</th><th>Teams</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
    attachCityLinks();
  }

  // ── Cross-Sport GOAT Years ──────────────────────────────────────────────
  function renderGoatYears() {
    var el = document.getElementById("goatTableContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var yearly = new Map();
      data.snapshotMetros.forEach(function (s) {
        s.metros.forEach(function (m) {
          if (m.vibeZ == null || m.vibeZ === 0) return;
          if (!metroParticipatesIn(m, s.kind)) return;
          var yk = m.name + "__" + s.year;
          var prev = yearly.get(yk);
          if (!prev || m.vibeZ > prev.vibeZ) {
            var sig = m.vibeContributors.map(function (t) { return t.sport + ":" + t.team + ":" + t.seasonYear; });
            var nChamps = m.vibeContributors.filter(function (t) { return t.finalsStatus === 2; }).length;
            yearly.set(yk, {
              city: m.name, year: s.year, vibeZ: m.vibeZ, sig: sig, nChamps: nChamps,
              nTeams: m.nTeams, sumNegZ: m.sumNegZ, label: s.label, date: s.date,
              teams: m.teams, nSports: m.nSports,
            });
          }
        });
      });

      var DUP_JACCARD = 0.5;
      var byKeepPriority = Array.from(yearly.values()).sort(function (a, b) {
        return (b.nChamps - a.nChamps) || (b.vibeZ - a.vibeZ) || (a.year - b.year);
      });
      var keptByCity = new Map();
      var peaks = [];
      byKeepPriority.forEach(function (e) {
        var eSet = new Set(e.sig);
        var prior = keptByCity.get(e.city) || [];
        var isDup = false;
        for (var i = 0; i < prior.length; i++) {
          var k = prior[i];
          if (!eSet.size || !k.sig.length) continue;
          var inter = 0;
          for (var j = 0; j < k.sig.length; j++) if (eSet.has(k.sig[j])) inter++;
          var union = eSet.size + k.sig.length - inter;
          if (union > 0 && inter / union >= DUP_JACCARD) { isDup = true; break; }
        }
        if (!isDup) { peaks.push(e); prior.push(e); keptByCity.set(e.city, prior); }
      });

      var top = peaks.sort(vibeRankCompare).slice(0, 50);
      var rows = top.map(function (p, i) {
        var chips = p.teams.map(teamChipHtml).join("");
        var meta = p.nSports === 1 ? ' <span class="single-sport-tag">1 sport</span>' : "";
        return (
          '<tr><td class="col-rank">' + (i + 1) + "</td>" +
          '<td class="team-cell linked" data-city-link="' + escapeHtml(p.city) + '">' + escapeHtml(p.city) + meta + "</td>" +
          '<td class="season-cell linked" data-year-link="' + p.year + '">' + p.year + "</td>" +
          '<td class="vibe-cell">' + fmtScore(p.vibeZ) + "</td>" +
          '<td class="finish-sub" style="white-space:nowrap">' + escapeHtml(p.label) + "</td>" +
          '<td class="team-chips-cell">' + chips + "</td></tr>"
        );
      }).join("");

      el.innerHTML =
        '<div class="sport-table-wrap"><table class="sport-table"><thead><tr>' +
        '<th class="col-rank">Rank</th><th>City</th><th>Year</th><th>Vibe</th><th>Top Window</th><th>Teams</th>' +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>";
      attachCityLinks();
    });
  }

  // ── City Droughts ───────────────────────────────────────────────────────
  // Sport calendar order within a season-year - the chronological sequence
  // each sport's playoffs wrap. NBA/NHL Finals (June) tie at 1, WNBA
  // Finals (October) 2, MLB World Series (Oct-Nov) 3, MLS Cup (Dec) 4,
  // NFL Super Bowl (Feb next year, latest) 5.
  var SPORT_CALENDAR_ORDER = { NBA: 1, NHL: 1, WNBA: 2, MLB: 3, MLS: 4, NFL: 5 };

  var droughtScope = "city";
  var droughtMode = "active";
  var droughtSort = "years";
  var DROUGHT_NOTES = {
    "active-city": '<p class="sport-note">Years counts the time since the city\'s previous championship in any sport &middot; Season-Years counts the number of seasons across all teams in the market during the drought</p>',
    "active-team": '<p class="sport-note">Years counts the time since the team\'s previous championship, or for a team that has never won, since it began in its current market &middot; Current-market only, so a relocated team\'s previous-city championships don\'t carry</p>',
    "broken-city": '<p class="sport-note">Years counts the time since the city\'s previous championship in any sport &middot; Season-Years counts the number of seasons across all teams in the market during the drought</p>',
    "broken-team": '<p class="sport-note">Years counts the time since the team\'s previous championship, or for a first-ever championship since it began in its current market &middot; Current-market only, so a relocated team\'s previous-city championships don\'t carry</p>',
  };
  function renderDroughtsView() {
    var notes = document.getElementById("droughtNotes");
    if (notes) notes.innerHTML = DROUGHT_NOTES[droughtMode + "-" + droughtScope] || "";
    var sortToggle = document.getElementById("droughtSortPills");
    if (sortToggle) sortToggle.style.display = droughtScope === "city" ? "flex" : "none";
    if (droughtMode === "active") {
      return droughtScope === "team" ? renderTeamActiveDroughts() : renderCityDroughts();
    }
    return droughtScope === "team" ? renderTeamDroughtBreakers() : renderDroughtBreakers();
  }
  document.getElementById("droughtModePills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    droughtMode = btn.dataset.dmode;
    document.querySelectorAll("#droughtModePills .pill").forEach(function (b) { b.classList.toggle("active", b === btn); });
    renderDroughtsView();
  });
  document.getElementById("droughtScopePills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    droughtScope = btn.dataset.dscope;
    document.querySelectorAll("#droughtScopePills .pill").forEach(function (b) { b.classList.toggle("active", b === btn); });
    renderDroughtsView();
  });
  document.getElementById("droughtSortPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    droughtSort = btn.dataset.dsort;
    document.querySelectorAll("#droughtSortPills .pill").forEach(function (b) { b.classList.toggle("active", b === btn); });
    renderDroughtsView();
  });

  // Sub-view: Active Droughts, By City. For each city, the most recent
  // championship across ALL sports it currently fields. Drought = years
  // since that moment (or since market start, if it's never won). Team-Years
  // counts each team's ACTUAL tenure inside the drought period.
  function renderCityDroughts() {
    var el = document.getElementById("cityDroughtsContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var currentMetroByCity = {};
      data.current.forEach(function (m) { currentMetroByCity[m.name] = m; });

      var tenuresByCity = {};
      var lastTitle = {};
      var latestSeason = {};
      var cityChamps = {};
      var reigningChamps = {};
      var reigningRUs = {};
      data.snapshotMetros.forEach(function (snap) {
        snap.metros.forEach(function (m) {
          m.teams.forEach(function (t) {
            var city = m.name, sport = t.sport, team = t.team, sy = t.seasonYear;
            if (sy == null) return;
            if (latestSeason[sport] == null || sy > latestSeason[sport]) latestSeason[sport] = sy;
            if (!tenuresByCity[city]) tenuresByCity[city] = {};
            if (!tenuresByCity[city][sport]) tenuresByCity[city][sport] = {};
            var cur = tenuresByCity[city][sport][team];
            if (!cur) tenuresByCity[city][sport][team] = { first: sy, last: sy, years: new Set([sy]) };
            else { if (sy < cur.first) cur.first = sy; if (sy > cur.last) cur.last = sy; cur.years.add(sy); }
            if (t.finalsStatus === 2) {
              var key = city + "__" + sport;
              if (lastTitle[key] == null || sy > lastTitle[key].year) lastTitle[key] = { year: sy, team: team };
              if (!cityChamps[city]) cityChamps[city] = [];
              cityChamps[city].push({ year: sy, team: team, sport: sport });
              if (!reigningChamps[sport] || sy > reigningChamps[sport].year) reigningChamps[sport] = { year: sy, team: team };
            }
            if (t.finalsStatus === 1) {
              if (!reigningRUs[sport] || sy > reigningRUs[sport].year) reigningRUs[sport] = { year: sy, team: team };
            }
          });
        });
      });
      for (var key in PRE_1980_LAST_TITLE) {
        var sepIdx = key.lastIndexOf("__");
        var titleCity = key.slice(0, sepIdx);
        var titleSport = key.slice(sepIdx + 2);
        var tup = PRE_1980_LAST_TITLE[key];
        if (!cityChamps[titleCity]) cityChamps[titleCity] = [];
        cityChamps[titleCity].push({ year: tup[0], team: tup[1], sport: titleSport, note: tup[2] });
      }

      var records = [];
      for (var city in currentMetroByCity) {
        var currentTeams = currentMetroByCity[city].teams;
        if (currentTeams.length === 0) continue;
        var cityTenures = tenuresByCity[city] || {};
        var currentSportsSet = new Set(currentTeams.map(function (t) { return t.sport; }));
        var currentTeamKeys = new Set(currentTeams.map(function (t) { return t.sport + "__" + t.team; }));

        var bestTitleYear = -Infinity, bestTitleTeam = null, bestTitleSport = null, bestTitleNote = null;
        var bestTitleKey = -Infinity;
        var sportsEverInCity = new Set(Object.keys(cityTenures).concat(Array.from(currentSportsSet)));
        sportsEverInCity.forEach(function (sport) {
          var k = city + "__" + sport;
          var lt = lastTitle[k];
          var titleYear = null, titleTeam = null, titleNote = null;
          if (lt) { titleYear = lt.year; titleTeam = lt.team; }
          else if (PRE_1980_LAST_TITLE[k] != null) {
            titleYear = PRE_1980_LAST_TITLE[k][0]; titleTeam = PRE_1980_LAST_TITLE[k][1]; titleNote = PRE_1980_LAST_TITLE[k][2] || null;
          }
          if (titleYear != null) {
            var titleOrd = SPORT_CALENDAR_ORDER[sport] || 99;
            var titleKey = titleYear * 100 + titleOrd;
            if (titleKey > bestTitleKey) {
              bestTitleKey = titleKey; bestTitleYear = titleYear; bestTitleTeam = titleTeam;
              bestTitleSport = sport; bestTitleNote = titleNote;
            }
          }
        });

        var earliestMarket = Infinity;
        sportsEverInCity.forEach(function (sport) {
          var k = city + "__" + sport;
          var overrideStart = PRE_1980_MARKET_START[k];
          var sportTeams = cityTenures[sport] || {};
          var sportFirstYear = Infinity;
          for (var team in sportTeams) {
            var teamFirst = sportTeams[team].first;
            if (TEAM_MARKET_ENTRY[team] != null && TEAM_MARKET_ENTRY[team] < teamFirst) teamFirst = TEAM_MARKET_ENTRY[team];
            if (teamFirst < sportFirstYear) sportFirstYear = teamFirst;
          }
          var sportStart = (overrideStart != null && overrideStart < sportFirstYear) ? overrideStart : sportFirstYear;
          if (sportStart < earliestMarket) earliestMarket = sportStart;
        });

        var cityLatestSeason = 0;
        sportsEverInCity.forEach(function (sport) {
          if (latestSeason[sport] != null && latestSeason[sport] > cityLatestSeason) cityLatestSeason = latestSeason[sport];
        });
        if (cityLatestSeason === 0) continue;

        var everWon = bestTitleYear > -Infinity;
        var droughtStart = everWon ? bestTitleYear : earliestMarket;

        var cityActiveYears = new Set();
        for (var sport2 in cityTenures) {
          for (var team2 in cityTenures[sport2]) {
            var ten = cityTenures[sport2][team2];
            ten.years.forEach(function (y) { cityActiveYears.add(y); });
            if (TEAM_MARKET_ENTRY[team2] != null) {
              for (var y2 = TEAM_MARKET_ENTRY[team2]; y2 < ten.first; y2++) cityActiveYears.add(y2);
            }
          }
        }
        var drought = 0;
        var droughtRangeLow = everWon ? droughtStart + 1 : droughtStart;
        cityActiveYears.forEach(function (y) { if (y >= droughtRangeLow && y <= cityLatestSeason) drought++; });
        var calendarYears = cityLatestSeason - droughtRangeLow + 1;
        var deadYears = Math.max(0, calendarYears - drought);

        var computeDroughtRange = (function (cityTenures, everWon, droughtStart, bestTitleTeam, bestTitleSport, cityLatestSeason) {
          return function (teamRaw, teamSport) {
            var ten = cityTenures[teamSport] && cityTenures[teamSport][teamRaw];
            if (!ten) return null;
            var teamStart = ten.first;
            var playedYears = new Set(ten.years);
            if (TEAM_MARKET_ENTRY[teamRaw] != null && TEAM_MARKET_ENTRY[teamRaw] < teamStart) {
              for (var y = TEAM_MARKET_ENTRY[teamRaw]; y < teamStart; y++) playedYears.add(y);
              teamStart = TEAM_MARKET_ENTRY[teamRaw];
            }
            var teamEnd = ten.last;
            var isTitleTeam = (teamRaw === bestTitleTeam && teamSport === bestTitleSport);
            var titleOrd = SPORT_CALENDAR_ORDER[bestTitleSport] || 99;
            var teamOrd = SPORT_CALENDAR_ORDER[teamSport] || 99;

            var droughtFirstYear;
            if (!everWon) droughtFirstYear = droughtStart;
            else if (isTitleTeam) droughtFirstYear = droughtStart + 1;
            else if (teamOrd > titleOrd) droughtFirstYear = droughtStart;
            else droughtFirstYear = droughtStart + 1;

            var inDrought = [];
            playedYears.forEach(function (y) { if (y >= droughtFirstYear && y <= cityLatestSeason) inDrought.push(y); });
            inDrought.sort(function (a, b) { return a - b; });

            var ranges = [];
            if (inDrought.length > 0) {
              var start = inDrought[0], prev = inDrought[0];
              for (var i = 1; i < inDrought.length; i++) {
                if (inDrought[i] - prev > 2) { ranges.push({ first: start, last: prev }); start = inDrought[i]; }
                prev = inDrought[i];
              }
              ranges.push({ first: start, last: prev });
            }

            var count = inDrought.length;
            var refYear = isTitleTeam ? droughtStart : Math.min(teamEnd, cityLatestSeason);
            var displayFirst = ranges.length > 0 ? ranges[0].first : refYear;
            var displayLast = ranges.length > 0 ? ranges[ranges.length - 1].last : refYear;
            return { ranges: ranges, displayFirst: displayFirst, displayLast: displayLast, count: count, refYear: refYear, isTitleTeam: isTitleTeam, teamStart: teamStart, teamEnd: teamEnd };
          };
        })(cityTenures, everWon, droughtStart, bestTitleTeam, bestTitleSport, cityLatestSeason);

        var teamYears = 0;
        var departedTeams = [];
        for (var sport3 in cityTenures) {
          for (var team3 in cityTenures[sport3]) {
            var dr = computeDroughtRange(team3, sport3);
            if (!dr) continue;
            teamYears += dr.count;
            var sportTeamKey = sport3 + "__" + team3;
            if (!currentTeamKeys.has(sportTeamKey) && dr.count > 0) {
              departedTeams.push({ team: team3, sport: sport3, ranges: dr.ranges, displayFirst: dr.displayFirst, displayLast: dr.displayLast, count: dr.count, refYear: dr.refYear, isTitleTeam: dr.isTitleTeam });
            }
          }
        }
        departedTeams.sort(function (a, b) { return b.count - a.count; });

        var annotatedCurrentTeams = currentTeams.map(function (t) {
          var dr = computeDroughtRange(t.team, t.sport);
          if (!dr) return Object.assign({}, t, { ranges: [], displayFirst: cityLatestSeason, displayLast: cityLatestSeason, count: 0, refYear: cityLatestSeason });
          return Object.assign({}, t, { ranges: dr.ranges, displayFirst: dr.displayFirst, displayLast: dr.displayLast, count: dr.count, refYear: dr.refYear, isTitleTeam: dr.isTitleTeam });
        });

        var seenChamp = {};
        var allChamps = [];
        (cityChamps[city] || []).forEach(function (c) {
          var k = c.year + "__" + c.team + "__" + c.sport;
          if (seenChamp[k]) return;
          seenChamp[k] = true;
          allChamps.push(c);
        });
        allChamps.sort(function (a, b) { return b.year - a.year; });
        var topChamps = allChamps.slice(0, 3);

        records.push({
          city: city, drought: drought, teamYears: teamYears, everWon: everWon, droughtStart: droughtStart, deadYears: deadYears,
          bestTitleTeam: bestTitleTeam, bestTitleSport: bestTitleSport, bestTitleNote: bestTitleNote,
          sportsCount: currentSportsSet.size, teams: annotatedCurrentTeams, departedTeams: departedTeams, topChamps: topChamps,
        });
      }

      records.sort(droughtSort === "seasonYears"
        ? function (a, b) { return (b.teamYears - a.teamYears) || (b.drought - a.drought); }
        : function (a, b) { return (b.drought - a.drought) || (b.teamYears - a.teamYears); });

      var yy = function (n) { return "'" + String(n).slice(-2); };
      var rows = records.map(function (r, i) {
        var sportsTag = r.sportsCount === 1 ? ' <span class="single-sport-tag">1 sport</span>' : "";
        var lastCell;
        if (r.everWon) {
          var champLines = r.topChamps.map(function (c) {
            var shortTeam = TEAM_SHORT_NAME[c.team] || c.team;
            var sportTag = '<span class="last-champ-sport">' + c.sport + "</span>";
            var note = c.note ? ' <span class="champ-note">(' + c.note + ")</span>" : "";
            return '<div class="champ-line">' + sportTag + c.year + " " + escapeHtml(shortTeam) + note + "</div>";
          }).join("");
          lastCell = '<td style="white-space:nowrap;vertical-align:top">' + champLines + "</td>";
        } else {
          lastCell = '<td class="finish-sub" style="white-space:nowrap;vertical-align:top">Never (since ' + r.droughtStart + ")</td>";
        }

        function renderDroughtChip(t, isDeparted) {
          var shortName = TEAM_SHORT_NAME[t.team] || t.team;
          var rangeStr;
          if (t.count === 0 || !t.ranges || t.ranges.length === 0) {
            rangeStr = yy(t.refYear);
          } else {
            rangeStr = t.ranges.map(function (rg) { return rg.first === rg.last ? yy(rg.first) : yy(rg.first) + "-" + yy(rg.last); }).join(" / ");
          }
          var classes = ["team-chip"];
          var extra = "";
          var suppressCount = false;
          var reignC = reigningChamps[t.sport];
          var reignR = reigningRUs[t.sport];
          var isReigningChamp = reignC && reignC.team === t.team;
          var isReigningRU = reignR && reignR.team === t.team;
          if (isDeparted) classes.push("departed");
          else if (isReigningChamp) { classes.push("win"); extra = " 👑"; suppressCount = true; }
          else if (isReigningRU) { classes.push("runner"); extra = " 🥈"; }
          var yearsHtml = suppressCount ? "" : ':<span class="z">' + t.count + "</span>";
          return '<span class="' + classes.join(" ") + '"><span class="sport-tag">' + t.sport + '</span><span class="yr">' + rangeStr + "</span> " + escapeHtml(shortName) + extra + yearsHtml + "</span>";
        }
        var allChips = r.teams.map(function (t) { return Object.assign({}, t, { _isDeparted: false }); })
          .concat(r.departedTeams.map(function (d) { return Object.assign({}, d, { _isDeparted: true }); }));
        allChips.sort(function (a, b) { return b.count - a.count; });
        var chipsHtml = allChips.map(function (t) { return renderDroughtChip(t, t._isDeparted); }).join("");
        return (
          '<tr><td class="col-rank">' + (i + 1) + "</td>" +
          '<td class="team-cell linked" data-city-link="' + escapeHtml(r.city) + '">' + escapeHtml(r.city) + sportsTag + "</td>" +
          lastCell +
          '<td class="team-chips-cell">' + chipsHtml + "</td>" +
          '<td class="total-drought-cell">' + r.drought + (r.deadYears > 0 ? ' <span class="champ-note" title="' + r.deadYears + ' years with no team in any sport">(+' + r.deadYears + " gap)</span>" : "") + "</td>" +
          '<td class="team-years-cell">' + r.teamYears + "</td></tr>"
        );
      }).join("");

      el.innerHTML =
        '<div class="sport-table-wrap"><table class="sport-table droughts-table"><thead><tr>' +
        '<th class="col-rank">Rank</th><th>City</th><th>Previous Championship</th>' +
        '<th>Teams <span class="th-sub">(seasons of futility in the drought)</span></th>' +
        '<th class="drought-stack' + (droughtSort === "years" ? " sort-active" : "") + '">Years' + (droughtSort === "years" ? ' <span class="sort-arrow">&darr;</span>' : "") + "</th>" +
        '<th class="drought-stack' + (droughtSort === "seasonYears" ? " sort-active" : "") + '">Season-Years' + (droughtSort === "seasonYears" ? ' <span class="sort-arrow">&darr;</span>' : "") + "</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>";
      attachCityLinks();
    });
  }

  // Sub-view: Drought Breakers (the flip side). For each city, walk its
  // championship timeline and, for every title, measure the drought it
  // ENDED: the gap back to the city's previous championship in any sport
  // (or market start, for a first-ever title). Ranked by Season-Years -
  // cumulative seasons of futility across ALL the city's teams.
  function renderDroughtBreakers() {
    var el = document.getElementById("cityDroughtsContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var tenuresByCity = {};
      var cityTitles = {};
      var seenTitle = {};
      var latestSeasonBySport = {};
      data.snapshotMetros.forEach(function (snap) {
        snap.metros.forEach(function (m) {
          m.teams.forEach(function (t) {
            var city = m.name, sport = t.sport, team = t.team, sy = t.seasonYear;
            if (sy == null) return;
            if (!latestSeasonBySport[sport] || sy > latestSeasonBySport[sport]) latestSeasonBySport[sport] = sy;
            if (!tenuresByCity[city]) tenuresByCity[city] = {};
            if (!tenuresByCity[city][sport]) tenuresByCity[city][sport] = {};
            var cur = tenuresByCity[city][sport][team];
            if (!cur) tenuresByCity[city][sport][team] = { first: sy, last: sy, years: new Set([sy]) };
            else { if (sy < cur.first) cur.first = sy; if (sy > cur.last) cur.last = sy; cur.years.add(sy); }
            if (t.finalsStatus === 2) {
              var k = city + "__" + sport + "__" + team + "__" + sy;
              if (!seenTitle[k]) { seenTitle[k] = true; (cityTitles[city] = cityTitles[city] || []).push({ year: sy, team: team, sport: sport }); }
            }
          });
        });
      });
      var seenPre = {};
      function addPre(city, sport, year, team, note) {
        var k = city + "__" + sport + "__" + year;
        if (seenPre[k]) return;
        seenPre[k] = true;
        (cityTitles[city] = cityTitles[city] || []).push({ year: year, team: team, sport: sport, note: note });
      }
      for (var key in PRE_1980_LAST_TITLE) {
        var sepIdx = key.lastIndexOf("__");
        var tup = PRE_1980_LAST_TITLE[key];
        addPre(key.slice(0, sepIdx), key.slice(sepIdx + 2), tup[0], tup[1], tup[2]);
      }
      for (var key2 in TEAM_PRE1980_TITLES) {
        var sepIdx2 = key2.indexOf("__");
        var sport2 = key2.slice(0, sepIdx2), name2 = key2.slice(sepIdx2 + 2);
        var market = TEAM_TO_METRO[name2];
        if (!market) continue;
        TEAM_PRE1980_TITLES[key2].forEach(function (yr) { addPre(market, sport2, yr, name2, null); });
      }

      var marketStartByCity = {};
      for (var city2 in tenuresByCity) {
        var earliest = Infinity;
        for (var sport3 in tenuresByCity[city2]) {
          var override = PRE_1980_MARKET_START[city2 + "__" + sport3];
          for (var team3 in tenuresByCity[city2][sport3]) {
            var f = tenuresByCity[city2][sport3][team3].first;
            if (TEAM_MARKET_ENTRY[team3] != null && TEAM_MARKET_ENTRY[team3] < f) f = TEAM_MARKET_ENTRY[team3];
            if (f < earliest) earliest = f;
          }
          if (override != null && override < earliest) earliest = override;
        }
        marketStartByCity[city2] = earliest;
      }

      function calKey(y, sport) { return y * 100 + (SPORT_CALENDAR_ORDER[sport] || 99); }

      function cityDroughtTeams(city, droughtStart, isFirstTitle, priorSport, endTitle) {
        var cityTen = tenuresByCity[city] || {};
        var endOrd = SPORT_CALENDAR_ORDER[endTitle.sport] || 99;
        var priorOrd = SPORT_CALENDAR_ORDER[priorSport] || 99;
        var out = [];
        for (var sport in cityTen) {
          var teamOrd = SPORT_CALENDAR_ORDER[sport] || 99;
          for (var team in cityTen[sport]) {
            var ten = cityTen[sport][team];
            var played = new Set(ten.years);
            var fk = sport + "__" + franchiseName(team);
            var entry = TEAM_MARKET_ENTRY[team];
            if (TEAM_FOUNDED[fk] != null && (entry == null || TEAM_FOUNDED[fk] < entry)) entry = TEAM_FOUNDED[fk];
            var preT = TEAM_PRE1980_TITLES[fk];
            if (preT && preT.length) { var mn = Math.min.apply(null, preT); if (entry == null || mn < entry) entry = mn; }
            if (entry != null && entry < ten.first) { for (var y = entry; y < ten.first; y++) played.add(y); }
            var isBreaker = (team === endTitle.team && sport === endTitle.sport);
            var lo = isFirstTitle ? droughtStart : (teamOrd > priorOrd ? droughtStart : droughtStart + 1);
            var inDrought = [];
            played.forEach(function (yy) {
              if (yy < lo || yy > endTitle.year) return;
              if (isBreaker && yy === endTitle.year) return;
              if (yy === endTitle.year && teamOrd > endOrd) return;
              inDrought.push(yy);
            });
            if (inDrought.length === 0) continue;
            inDrought.sort(function (a, b) { return a - b; });
            var ranges = [];
            var s = inDrought[0], p = inDrought[0];
            for (var i = 1; i < inDrought.length; i++) {
              if (inDrought[i] - p > 2) { ranges.push({ first: s, last: p }); s = inDrought[i]; }
              p = inDrought[i];
            }
            ranges.push({ first: s, last: p });
            var departed = ten.last < endTitle.year && ten.last < latestSeasonBySport[sport];
            out.push({ team: team, sport: sport, ranges: ranges, count: inDrought.length, isBreaker: isBreaker, departed: departed });
          }
        }
        out.sort(function (a, b) { return b.count - a.count; });
        return out;
      }

      var DATA_FLOOR = 1980;
      var records = [];
      for (var city3 in cityTitles) {
        var titles = cityTitles[city3].slice().sort(function (a, b) { return calKey(a.year, a.sport) - calKey(b.year, b.sport); });
        var marketStart = marketStartByCity[city3];
        for (var i2 = 0; i2 < titles.length; i2++) {
          var cur = titles[i2];
          if (cur.year < DATA_FLOOR) continue;
          var prior = i2 > 0 ? titles[i2 - 1] : null;
          var isFirst = !prior;
          if (isFirst && !(marketStart != null && marketStart > DATA_FLOOR)) continue;
          var droughtStart = isFirst ? marketStart : prior.year;
          if (droughtStart == null || droughtStart === Infinity) continue;
          var calendarYears = cur.year - droughtStart;
          if (calendarYears <= 0) continue;
          var teams = cityDroughtTeams(city3, droughtStart, isFirst, prior ? prior.sport : null, cur);
          var seasonYears = teams.reduce(function (sum, t) { return sum + t.count; }, 0);
          records.push({ city: city3, breaker: cur, prior: prior, isFirst: isFirst, droughtStart: droughtStart, calendarYears: calendarYears, seasonYears: seasonYears, teams: teams });
        }
      }
      records.sort(droughtSort === "seasonYears"
        ? function (a, b) { return (b.seasonYears - a.seasonYears) || (b.calendarYears - a.calendarYears); }
        : function (a, b) { return (b.calendarYears - a.calendarYears) || (b.seasonYears - a.seasonYears); });
      var TOP_N = 50;
      var top = records.slice(0, TOP_N);

      var yy2 = function (n) { return "'" + String(n).slice(-2); };
      function rangeStr(ranges) { return ranges.map(function (rg) { return rg.first === rg.last ? yy2(rg.first) : yy2(rg.first) + "-" + yy2(rg.last); }).join(" / "); }
      function teamChip(t, departed) {
        var short = TEAM_SHORT_NAME[t.team] || t.team;
        var classes = ["team-chip"];
        if (t.isBreaker) classes.push("breaker");
        else if (departed) classes.push("departed");
        return '<span class="' + classes.join(" ") + '"><span class="sport-tag">' + t.sport + '</span><span class="yr">' + rangeStr(t.ranges) + "</span> " + escapeHtml(short) + ':<span class="z">' + t.count + "</span></span>";
      }
      var rows = top.map(function (r, i) {
        var b = r.breaker;
        var bShort = TEAM_SHORT_NAME[b.team] || b.team;
        var titleLine = '<div class="champ-line"><span class="last-champ-sport">' + b.sport + "</span>" + b.year + " " + escapeHtml(bShort) + " 👑</div>";
        var sinceLine;
        if (r.isFirst) {
          sinceLine = '<div class="champ-line">(first championship &middot; since ' + r.droughtStart + ")</div>";
        } else {
          var pShort = TEAM_SHORT_NAME[r.prior.team] || r.prior.team;
          var note = r.prior.note ? ", " + r.prior.note : "";
          sinceLine = '<div class="champ-line">(<span class="last-champ-sport">' + r.prior.sport + "</span>" + r.prior.year + " " + escapeHtml(pShort) + note + ")</div>";
        }
        var teamsCell = r.teams.map(function (t) { return teamChip(t, !t.isBreaker && t.departed); }).join("");
        return (
          '<tr><td class="col-rank">' + (i + 1) + "</td>" +
          '<td class="team-cell linked" data-city-link="' + escapeHtml(r.city) + '">' + escapeHtml(r.city) + "</td>" +
          '<td style="white-space:nowrap;vertical-align:top">' + titleLine + sinceLine + "</td>" +
          '<td class="team-chips-cell" style="vertical-align:middle">' + teamsCell + "</td>" +
          '<td class="total-drought-cell">' + r.calendarYears + "</td>" +
          '<td class="team-years-cell">' + r.seasonYears + "</td></tr>"
        );
      }).join("");

      el.innerHTML =
        '<div class="sport-table-wrap"><table class="sport-table droughts-table"><thead><tr>' +
        '<th class="col-rank">Rank</th><th>City</th>' +
        '<th>Drought-Ending Championship<br><span class="th-sub" style="margin-left:0">(previous championship in parens)</span></th>' +
        '<th>Teams <span class="th-sub">(seasons of futility in the drought)</span></th>' +
        '<th class="drought-stack' + (droughtSort === "years" ? " sort-active" : "") + '">Years' + (droughtSort === "years" ? ' <span class="sort-arrow">&darr;</span>' : "") + "</th>" +
        '<th class="drought-stack' + (droughtSort === "seasonYears" ? " sort-active" : "") + '">Season-Years' + (droughtSort === "seasonYears" ? ' <span class="sort-arrow">&darr;</span>' : "") + "</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="sport-note" style="margin-top:0.5rem">Showing the ' + TOP_N + " longest championship droughts ended, ranked by years</p>";
      attachCityLinks();
    });
  }

  // Sub-view: Drought Breakers, By Team. Per-franchise: for each observed
  // title, the drought it ended = years since that franchise's previous
  // title (or since it began in its current market, for a first title).
  function renderTeamDroughtBreakers() {
    var el = document.getElementById("cityDroughtsContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var DATA_FLOOR = 1980;
      var titles = {}, played = {}, firstSeen = {}, meta = {}, leagueActiveYears = {}, rawByYear = {};
      data.snapshotMetros.forEach(function (snap) {
        snap.metros.forEach(function (m) {
          m.teams.forEach(function (t) {
            if (t.seasonYear == null) return;
            var name = franchiseName(t.team);
            var key = t.sport + "__" + name;
            if (!meta[key]) meta[key] = { sport: t.sport, name: name, market: m.name };
            if (firstSeen[key] == null || t.seasonYear < firstSeen[key]) firstSeen[key] = t.seasonYear;
            (played[key] = played[key] || new Set()).add(t.seasonYear);
            (rawByYear[key] = rawByYear[key] || {})[t.seasonYear] = t.team;
            (leagueActiveYears[t.sport] = leagueActiveYears[t.sport] || new Set()).add(t.seasonYear);
            if (t.finalsStatus === 2) (titles[key] = titles[key] || new Set()).add(t.seasonYear);
          });
        });
      });
      for (var key in TEAM_PRE1980_TITLES) {
        var set = (titles[key] = titles[key] || new Set());
        TEAM_PRE1980_TITLES[key].forEach(function (y) { set.add(y); });
        if (!meta[key]) {
          var sep = key.indexOf("__");
          var nm = key.slice(sep + 2);
          meta[key] = { sport: key.slice(0, sep), name: nm, market: TEAM_TO_METRO[nm] || null };
        }
      }

      var NO_PLAY = { NHL: new Set([2005]) };
      function isActive(sport, y, ps) {
        if (y <= 1979) return true;
        if (ps.has(y)) return true;
        if (NO_PLAY[sport] && NO_PLAY[sport].has(y)) return false;
        if (leagueActiveYears[sport] && leagueActiveYears[sport].has(y)) return false;
        return true;
      }
      function eraNameAt(key, year) {
        var byYear = rawByYear[key] || {};
        if (byYear[year]) return byYear[year];
        var yrs = Object.keys(byYear).map(Number).sort(function (a, b) { return a - b; });
        if (!yrs.length) return key.slice(key.indexOf("__") + 2);
        var best = byYear[yrs[0]];
        yrs.forEach(function (y) { if (y <= year) best = byYear[y]; });
        return best;
      }
      function eraChips(key, F) {
        var byRaw = new Map();
        F.forEach(function (y) {
          var raw = eraNameAt(key, y);
          if (!byRaw.has(raw)) byRaw.set(raw, []);
          byRaw.get(raw).push(y);
        });
        var chips = [];
        byRaw.forEach(function (years, raw) {
          years.sort(function (a, b) { return a - b; });
          var ranges = [];
          var s = years[0], p = years[0];
          for (var i = 1; i < years.length; i++) { if (years[i] - p > 2) { ranges.push({ first: s, last: p }); s = years[i]; } p = years[i]; }
          ranges.push({ first: s, last: p });
          chips.push({ raw: raw, ranges: ranges, count: years.length, lastYear: years[years.length - 1] });
        });
        chips.sort(function (a, b) { return b.lastYear - a.lastYear; });
        return chips;
      }
      function detailFor(key, since, year) {
        var ps = played[key] || new Set();
        var sport = meta[key].sport;
        var F = [];
        for (var y = since + 1; y <= year - 1; y++) if (isActive(sport, y, ps)) F.push(y);
        var years = F.length + 1;
        var gap = (year - since) - years;
        return { years: years, gap: gap, F: F };
      }

      var records = [];
      for (var key2 in titles) {
        var yrs = Array.from(titles[key2]).sort(function (a, b) { return a - b; });
        for (var i2 = 0; i2 < yrs.length; i2++) {
          var y2 = yrs[i2];
          if (y2 < DATA_FLOOR) continue;
          var since, isFirst;
          if (i2 > 0) { since = yrs[i2 - 1]; isFirst = false; }
          else {
            var founded = null;
            if (TEAM_FOUNDED[key2] != null) founded = TEAM_FOUNDED[key2];
            else if (firstSeen[key2] != null && firstSeen[key2] > DATA_FLOOR) founded = firstSeen[key2];
            if (founded == null) continue;
            since = founded; isFirst = true;
          }
          var d = detailFor(key2, since, y2);
          var titleEra = eraNameAt(key2, y2);
          var chips = eraChips(key2, d.F).map(function (c) { return Object.assign({}, c, { isBreaker: c.raw === titleEra }); });
          records.push(Object.assign({}, meta[key2], { year: y2, since: since, isFirst: isFirst, drought: d.years, gap: d.gap, chips: chips, titleEra: titleEra, priorEra: isFirst ? null : eraNameAt(key2, since) }));
        }
      }
      records.sort(function (a, b) { return (b.drought - a.drought) || (b.year - a.year); });
      var TOP_N = 50;
      var top = records.slice(0, TOP_N);

      function rangeStr(ranges) { return ranges.map(function (rg) { return rg.first === rg.last ? String(rg.first) : rg.first + "-" + rg.last; }).join(" / "); }
      var rows = top.map(function (r, i) {
        var titleShort = TEAM_SHORT_NAME[r.titleEra] || r.titleEra;
        var titleLine = '<span class="last-champ-sport">' + r.sport + "</span>" + r.year + " " + escapeHtml(titleShort) + " 👑";
        var sinceLine = r.isFirst
          ? "(first championship &middot; since " + r.since + ")"
          : '(<span class="last-champ-sport">' + r.sport + "</span>" + r.since + " " + escapeHtml(TEAM_SHORT_NAME[r.priorEra] || r.priorEra) + ")";
        var detail = r.chips.map(function (c) {
          var segShort = TEAM_SHORT_NAME[c.raw] || c.raw;
          var cls = c.isBreaker ? "team-chip breaker" : "team-chip departed";
          return '<span class="' + cls + '"><span class="sport-tag">' + r.sport + '</span><span class="yr">' + rangeStr(c.ranges) + "</span> " + escapeHtml(segShort) + ':<span class="z">' + c.count + "</span></span>";
        }).join("");
        var gapNote = r.gap > 0 ? ' <span class="champ-note" title="' + r.gap + ' years the franchise was in another market or no season was played">(+' + r.gap + " gap)</span>" : "";
        var cityCell = r.market
          ? '<td class="team-cell linked" data-city-link="' + escapeHtml(r.market) + '" style="white-space:nowrap">' + escapeHtml(r.market) + "</td>"
          : '<td style="white-space:nowrap">-</td>';
        return (
          '<tr><td class="col-rank">' + (i + 1) + "</td>" + cityCell +
          '<td style="white-space:nowrap;vertical-align:top"><div class="champ-line">' + titleLine + '</div><div class="champ-line">' + sinceLine + "</div></td>" +
          '<td class="team-chips-cell" style="vertical-align:middle">' + detail + "</td>" +
          '<td class="total-drought-cell">' + r.drought + gapNote + "</td></tr>"
        );
      }).join("");

      el.innerHTML =
        '<div class="sport-table-wrap"><table class="sport-table droughts-table"><thead><tr>' +
        '<th class="col-rank">Rank</th><th>City</th>' +
        '<th>Drought-Ending Championship<br><span class="th-sub" style="margin-left:0">(previous championship in parens)</span></th>' +
        "<th>Drought Detail</th><th class=\"drought-stack\">Years</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="sport-note" style="margin-top:0.5rem">Showing the ' + TOP_N + " longest championship droughts ended, ranked by years. Drought-start is the team's previous championship, or for a first-ever championship the year it began in its current market (counting AFL / ABA / WHA / AAFC predecessor leagues).</p>";
      attachCityLinks();
    });
  }

  // Sub-view: Active Droughts, By Team. Each current team's ongoing title
  // drought to the latest season - the team analog of the active By City
  // view, gap-aware + current-market only.
  function renderTeamActiveDroughts() {
    var el = document.getElementById("cityDroughtsContent");
    el.innerHTML = '<p class="sport-loading">Loading...</p>';
    return viewCityData().then(function (data) {
      if (data.error) { el.innerHTML = '<p class="sport-error">Could not load: ' + escapeHtml(data.error) + "</p>"; return; }

      var titles = {}, played = {}, firstSeen = {}, meta = {}, leagueActiveYears = {}, latestSeason = {}, rawByYear = {};
      data.snapshotMetros.forEach(function (snap) {
        snap.metros.forEach(function (m) {
          m.teams.forEach(function (t) {
            if (t.seasonYear == null) return;
            var name = franchiseName(t.team);
            var key = t.sport + "__" + name;
            if (!meta[key]) meta[key] = { sport: t.sport, name: name, market: m.name };
            if (firstSeen[key] == null || t.seasonYear < firstSeen[key]) firstSeen[key] = t.seasonYear;
            (played[key] = played[key] || new Set()).add(t.seasonYear);
            (rawByYear[key] = rawByYear[key] || {})[t.seasonYear] = t.team;
            (leagueActiveYears[t.sport] = leagueActiveYears[t.sport] || new Set()).add(t.seasonYear);
            if (latestSeason[t.sport] == null || t.seasonYear > latestSeason[t.sport]) latestSeason[t.sport] = t.seasonYear;
            if (t.finalsStatus === 2) (titles[key] = titles[key] || new Set()).add(t.seasonYear);
          });
        });
      });
      for (var key in TEAM_PRE1980_TITLES) {
        var set = (titles[key] = titles[key] || new Set());
        TEAM_PRE1980_TITLES[key].forEach(function (y) { set.add(y); });
      }

      var NO_PLAY = { NHL: new Set([2005]) };
      function isActive(sport, y, ps) {
        if (y <= 1979) return true;
        if (ps.has(y)) return true;
        if (NO_PLAY[sport] && NO_PLAY[sport].has(y)) return false;
        if (leagueActiveYears[sport] && leagueActiveYears[sport].has(y)) return false;
        return true;
      }
      function eraNameAt(key, year) {
        var byYear = rawByYear[key] || {};
        if (byYear[year]) return byYear[year];
        var yrs = Object.keys(byYear).map(Number).sort(function (a, b) { return a - b; });
        if (!yrs.length) return key.slice(key.indexOf("__") + 2);
        var best = byYear[yrs[0]];
        yrs.forEach(function (y) { if (y <= year) best = byYear[y]; });
        return best;
      }
      function eraChips(key, F) {
        var byRaw = new Map();
        F.forEach(function (y) {
          var raw = eraNameAt(key, y);
          if (!byRaw.has(raw)) byRaw.set(raw, []);
          byRaw.get(raw).push(y);
        });
        var chips = [];
        byRaw.forEach(function (years, raw) {
          years.sort(function (a, b) { return a - b; });
          var ranges = [];
          var s = years[0], p = years[0];
          for (var i = 1; i < years.length; i++) { if (years[i] - p > 2) { ranges.push({ first: s, last: p }); s = years[i]; } p = years[i]; }
          ranges.push({ first: s, last: p });
          chips.push({ raw: raw, ranges: ranges, count: years.length, lastYear: years[years.length - 1] });
        });
        chips.sort(function (a, b) { return b.lastYear - a.lastYear; });
        return chips;
      }

      var currentKeys = new Map();
      data.current.forEach(function (m) {
        m.teams.forEach(function (t) {
          var key = t.sport + "__" + franchiseName(t.team);
          if (!currentKeys.has(key)) currentKeys.set(key, m.name);
        });
      });

      var records = [];
      currentKeys.forEach(function (market, key) {
        var sport = key.slice(0, key.indexOf("__"));
        var name = key.slice(key.indexOf("__") + 2);
        var present = latestSeason[sport];
        if (present == null) return;
        var tset = titles[key];
        var lastTitleYr = (tset && tset.size) ? Math.max.apply(null, Array.from(tset)) : null;
        var everWon = lastTitleYr != null;
        var since;
        if (everWon) since = lastTitleYr;
        else since = (TEAM_FOUNDED[key] != null) ? TEAM_FOUNDED[key] : firstSeen[key];
        if (since == null) return;
        var lo = everWon ? since + 1 : since;
        var ps = played[key] || new Set();
        var F = [];
        for (var y = lo; y <= present; y++) if (isActive(sport, y, ps)) F.push(y);
        if (F.length === 0) return;
        var calendar = present - lo + 1;
        var titleEra = everWon ? eraNameAt(key, lastTitleYr) : null;
        var chips = eraChips(key, F).map(function (c) { return Object.assign({}, c, { defunct: c.lastYear < present }); });
        records.push({ sport: sport, name: name, market: market, everWon: everWon, lastTitle: lastTitleYr, titleEra: titleEra, since: since, drought: F.length, gap: calendar - F.length, chips: chips });
      });
      records.sort(function (a, b) { return (b.drought - a.drought) || (b.gap - a.gap); });
      var TOP_N = 50;
      var top = records.slice(0, TOP_N);

      function rangeStr(ranges) { return ranges.map(function (rg) { return rg.first === rg.last ? String(rg.first) : rg.first + "-" + rg.last; }).join(" / "); }
      var rows = top.map(function (r, i) {
        var lastShort = r.everWon ? (TEAM_SHORT_NAME[r.titleEra] || r.titleEra) : null;
        var lastChampLine = r.everWon
          ? '<div class="champ-line"><span class="last-champ-sport">' + r.sport + "</span>" + r.lastTitle + " " + escapeHtml(lastShort) + "</div>"
          : '<div class="champ-line finish-sub">Never won &middot; since ' + r.since + "</div>";
        var detail = r.chips.map(function (c) {
          var segShort = TEAM_SHORT_NAME[c.raw] || c.raw;
          var cls = c.defunct ? "team-chip departed" : "team-chip";
          return '<span class="' + cls + '"><span class="sport-tag">' + r.sport + '</span><span class="yr">' + rangeStr(c.ranges) + "</span> " + escapeHtml(segShort) + ':<span class="z">' + c.count + "</span></span>";
        }).join("");
        var gapNote = r.gap > 0 ? ' <span class="champ-note" title="' + r.gap + ' years the franchise was in another market or no season was played">(+' + r.gap + " gap)</span>" : "";
        var cityCell = r.market
          ? '<td class="team-cell linked" data-city-link="' + escapeHtml(r.market) + '" style="white-space:nowrap">' + escapeHtml(r.market) + "</td>"
          : '<td style="white-space:nowrap">-</td>';
        return (
          '<tr><td class="col-rank">' + (i + 1) + "</td>" + cityCell +
          '<td style="vertical-align:top">' + lastChampLine + "</td>" +
          '<td class="team-chips-cell" style="vertical-align:middle">' + detail + "</td>" +
          '<td class="total-drought-cell">' + r.drought + gapNote + "</td></tr>"
        );
      }).join("");

      el.innerHTML =
        '<div class="sport-table-wrap"><table class="sport-table droughts-table"><thead><tr>' +
        '<th class="col-rank">Rank</th><th>City</th><th>Previous Championship</th>' +
        "<th>Drought Detail</th><th class=\"drought-stack\">Years</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="sport-note" style="margin-top:0.5rem">Showing the ' + TOP_N + ' longest active championship droughts. Years counts the seasons the team has played in its current market since its previous championship (or since it began there, if it has never won), excluding seasons away in another market and cancelled seasons.</p>';
      attachCityLinks();
    });
  }

  var cityRenderers = {
    "cross-sport-rankings": renderCrossSportRankings,
    "city-history": renderCityHistory,
    "goat-table": renderGoatYears,
    "city-droughts": renderDroughtsView,
  };
})();
