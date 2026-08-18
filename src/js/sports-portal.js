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
})();
