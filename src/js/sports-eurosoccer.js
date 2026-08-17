(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 2, BAR_CAP = 5;

  var LEAGUE_OPTIONS = [
    { value: "EPL", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 EPL" },
    { value: "La Liga", label: "🇪🇸 La Liga" },
    { value: "Bundesliga", label: "🇩🇪 Bundesliga" },
    { value: "Serie A", label: "🇮🇹 Serie A" },
    { value: "Ligue 1", label: "🇫🇷 Ligue 1" },
  ];
  var UEFA_OPTIONS = [
    { value: "Champions League", label: "🏆 Champions League" },
    { value: "Europa League", label: "🏆 Europa League" },
  ];

  var state = {
    seasonsIndex: null,
    disruptedSeasons: {},
    seasonData: null,
    currentSnapshot: null,
    standingsLeague: "all",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsLeague: "",
    tsView: "cross",
    goatLeague: "all",
    goatMetric: "overall",
    goatCache: {},
    goatData: null,
    championsData: null,
    historyComp: "Champions League",
  };

  // ── formatting helpers, ported 1:1 from ZIDANE's docs/index.html ──────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  // W-D-L record with dimmed points in parens.
  function fmtRecord(rec) {
    if (!rec || rec === "-") return "0-0-0";
    var parts = rec.split("-");
    if (parts.length !== 3) return rec;
    var w = parseInt(parts[0], 10), d = parseInt(parts[1], 10), l = parseInt(parts[2], 10);
    if (w + d + l === 0) return rec;
    var pts = 3 * w + d;
    return rec + ' <span class="dim-pct">(' + pts + ")</span>";
  }

  // Abbreviates competition tags inside Last Match strings only
  // (Bundesliga->BL, Champions League->CL, Europa League->EL) - ZIDANE's own
  // site uses this (unlike MESSI, which has no abbrevComp at all).
  function abbrevComp(str) {
    if (!str) return str;
    return str
      .replace(/\bBundesliga\b/g, "BL")
      .replace(/\bChampions League\b/g, "CL")
      .replace(/\bEuropa League\b/g, "EL");
  }

  var LEAGUE_SHORT = { EPL: "EPL", "La Liga": "La Liga", Bundesliga: "BL", "Serie A": "Serie A", "Ligue 1": "Ligue 1" };
  // Map a team's domestic league to the short label of its national cup.
  var CUP_SHORT = { EPL: "FA Cup", "La Liga": "Copa del Rey", Bundesliga: "DFB-Pokal", "Serie A": "Coppa Italia" };
  var LEAGUE_BADGE_CLS = { EPL: "badge-EPL", "La Liga": "badge-LaLiga", Bundesliga: "badge-Bundesliga", "Serie A": "badge-SerieA", "Ligue 1": "badge-Ligue1" };
  var LEAGUE_BADGE_LABEL = { EPL: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 EPL", "La Liga": "🇪🇸 La Liga", Bundesliga: "🇩🇪 BL", "Serie A": "🇮🇹 Serie A", "Ligue 1": "🇫🇷 Ligue 1" };

  function leagueBadge(league, dom) {
    if (!league) return "";
    var lg = LEAGUE_SHORT[league] || league;
    if (dom === "Champion") return '<span class="finish-badge finish-champion">' + lg + " 🏆</span>";
    if (dom === "Runner-Up") return '<span class="finish-badge finish-runner">' + lg + " 🥈</span>";
    // In-progress leaders (dom === '1st'/'2nd') fall through to the default
    // colored pill - only confirmed end-of-season finishes earn a badge.
    var cls = LEAGUE_BADGE_CLS[league] || "badge-Other";
    var label = LEAGUE_BADGE_LABEL[league] || league;
    return '<span class="league-badge ' + cls + '">' + label + "</span>";
  }

  // Treble: domestic league + Champions League + domestic cup all won.
  function finishBadge(dom, cl, el, league, cup) {
    cup = cup || "";
    var bits = [];
    var cupLabel = CUP_SHORT[league] || "Cup";
    var isTreble = dom === "Champion" && cl === "Champion" && cup === "Champion";
    if (isTreble) bits.push('<span class="finish-badge finish-treble">TREBLE 👑</span>');
    if (cl === "Champion") bits.push('<span class="finish-badge finish-champion">CL 🏆</span>');
    if (cl === "Runner-Up") bits.push('<span class="finish-badge finish-runner">CL 🥈</span>');
    if (el === "Champion") bits.push('<span class="finish-badge finish-champion">EL 🏆</span>');
    if (el === "Runner-Up") bits.push('<span class="finish-badge finish-runner">EL 🥈</span>');
    if (cup === "Champion") bits.push('<span class="finish-badge finish-champion">' + cupLabel + " 🏆</span>");
    if (cup === "Runner-Up") bits.push('<span class="finish-badge finish-runner">' + cupLabel + " 🥈</span>");
    return bits.join(" ");
  }

  function resultClass(match, isStale) {
    if (!match) return "";
    var first = match[0];
    var suffix = isStale ? "-stale" : "";
    if (first === "W") return "result-W" + suffix;
    if (first === "L") return "result-L" + suffix;
    if (first === "D") return "result-D" + suffix;
    return "";
  }

  var PLACEHOLDER_LM = ["No match yet", "No competitive match yet", "No Game", "Bye / No Game"];
  function displayMatch(s) {
    return !s || PLACEHOLDER_LM.indexOf(s) !== -1 ? "" : s;
  }

  var LAST_MATCH_RE = /^([WLD])\s+(\d+\s*-\s*\d+)\s+(vs\.?(?:\s*\(N\))?|@)\s+(.+?)\s*(\([^)]+\))?\s*$/;

  // ZIDANE format: "W vs. AC Milan 2-0 (Serie A)" - opponent may be from any
  // of the 5 leagues or a UEFA opponent in CL/EL knockouts.
  function renderLastMatch(raw, season, isStale) {
    var display = displayMatch(raw);
    if (!display) return "-";
    var rc = resultClass(raw, isStale);
    var m = display.match(LAST_MATCH_RE);
    if (!m) return '<span class="' + rc + '">' + abbrevComp(display) + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4], comp = m[5];
    var slug = state.nameToSlug[opponent.trim()];
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + opponent + "</span>"
      : opponent;
    var compStr = comp ? " " + abbrevComp(comp) : "";
    return '<span class="' + rc + '">' + letter + " " + score + " " + venue + " " + oppHtml + compStr + "</span>";
  }

  function barScale(ratings) {
    var m = 0;
    ratings.forEach(function (r) { m = Math.max(m, Math.abs(r || 0)); });
    return Math.min(BAR_CAP, Math.max(BAR_D, m));
  }

  function ratingBar(rating, scaleMax) {
    var S = scaleMax || BAR_D;
    var clipped = Math.max(-S, Math.min(S, rating));
    var widthPct = (Math.abs(clipped) / (2 * S)) * 100;
    var leftPct = clipped >= 0 ? 50 : 50 - widthPct;
    return (
      '<div class="rating-bar-wrap"><span class="rating-cell">' + rating.toFixed(2) + '</span>' +
      '<div class="rating-bar-track"><div class="rating-bar-center-line"></div>' +
      '<div class="rating-bar-fill ' + (rating >= 0 ? "bar-pos" : "bar-neg") + '" style="left:' +
      leftPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%"></div></div></div>'
    );
  }

  function fmtOD(val, rank) {
    if (val == null) return "-";
    var v = val.toFixed(2);
    if (rank == null) return v;
    return '<div class="od-val">' + v + '</div><div class="od-rank">' + rank + "</div>";
  }

  // ── Disrupted-season helpers (established fleet pattern, ported from DILLON/GRIFFEY/etc) ──

  function seasonTag(season) {
    var info = state.disruptedSeasons[String(season)];
    if (!info) return "";
    var cat = info.category || "labor";
    return '<div class="season-tag-line"><span class="short-season-tag tag-' + cat + '" title="' +
      info.note + '">' + info.tag.toUpperCase() + "</span></div>";
  }

  function updateDisruptedNote(elId, seasons) {
    var el = document.getElementById(elId);
    if (!el) return;
    var seen = {};
    var items = [];
    seasons.forEach(function (s) {
      var key = String(s);
      if (seen[key]) return;
      var info = state.disruptedSeasons[key];
      if (!info) return;
      seen[key] = true;
      var cat = info.category || "labor";
      items.push('<li><span class="short-season-tag tag-' + cat + '">' + info.tag.toUpperCase() + "</span>" + info.note + "</li>");
    });
    if (!items.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.innerHTML = "<strong>Disrupted seasons in this view:</strong><ul>" + items.join("") + "</ul>";
  }

  function buildPillsFromOpts(containerId, opts, current, onSelect, clearSiblings) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (o.value === current ? " active" : "");
      b.innerHTML = o.label;
      b.dataset.value = o.value;
      b.addEventListener("click", function () {
        wrap.querySelectorAll(".pill").forEach(function (x) { x.classList.remove("active"); });
        (clearSiblings || []).forEach(function (sid) {
          document.querySelectorAll("#" + sid + " .pill").forEach(function (x) { x.classList.remove("active"); });
        });
        b.classList.add("active");
        onSelect(o.value);
      });
      wrap.appendChild(b);
    });
  }

  function buildLeaguePills(containerId, includeAll, current, onSelect) {
    var opts = includeAll
      ? [{ value: "all", label: "All Leagues" }].concat(LEAGUE_OPTIONS)
      : LEAGUE_OPTIONS;
    buildPillsFromOpts(containerId, opts, current, onSelect);
  }

  // ── tab switching ────────────────────────────────────────────────────────

  function activateTab(tabName) {
    document.querySelectorAll(".sport-tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".sport-view").forEach(function (v) { v.hidden = true; v.classList.remove("active"); });
    var btn = document.querySelector('.sport-tab[data-tab="' + tabName + '"]');
    var view = document.getElementById(tabName);
    if (btn) btn.classList.add("active");
    if (view) { view.hidden = false; view.classList.add("active"); }
  }

  document.getElementById("zdTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ── deep-link handlers ──────────────────────────────────────────────────

  // Valid Standings league filter values (the 5 domestic leagues). UEFA cups
  // (CL/EL) don't map - passing one through is a no-op.
  var STANDINGS_LEAGUES = {};
  LEAGUE_OPTIONS.forEach(function (o) { STANDINGS_LEAGUES[o.value] = true; });

  function seasonLinkClick(season, targetLeague) {
    if (!season) return;
    activateTab("standings");
    if (targetLeague && STANDINGS_LEAGUES[targetLeague]) {
      state.standingsLeague = targetLeague;
      buildLeaguePills("zdLeaguePills", true, state.standingsLeague, function (v) { state.standingsLeague = v; renderStandings(); });
    }
    seasonSelect.value = season;
    loadSeason(season);
  }

  // ZIDANE Team Summary pill has no "All" option - it must match the team's
  // own league or populateTeams returns an empty dropdown.
  function teamLinkClick(slug, season) {
    if (!slug) return;
    var t = state.teamsIndex && state.teamsIndex.filter(function (x) { return x.slug === slug; })[0];
    if (!t) return;
    activateTab("team-summary");
    state.tsLeague = t.league;
    buildLeaguePills("tsLeaguePills", false, state.tsLeague, function (v) {
      state.tsLeague = v;
      populateTeams(v);
      tsChartWrap.hidden = true;
      tsTableWrap.innerHTML = '<p class="sport-loading">Select a team above</p>';
      tsSeasonSelect.innerHTML = "";
    });
    populateTeams(state.tsLeague);
    tsTeamSelect.value = slug;
    var wantSingle = season != null && season !== "";
    state.tsView = wantSingle ? "single" : "cross";
    buildPillsFromOpts("tsViewPills", [
      { value: "cross", label: "All season summary" },
      { value: "single", label: "All matches within one season" },
    ], state.tsView, function (v) {
      state.tsView = v;
      tsSeasonSelect.hidden = v !== "single";
      tsDateTypeSelect.hidden = v !== "cross";
      renderTeamTable();
    });
    tsSeasonSelect.hidden = !wantSingle;
    tsDateTypeSelect.hidden = wantSingle;
    loadTeam(slug).then(function () {
      if (wantSingle) {
        var targetVal = String(season);
        var hasOpt = Array.prototype.some.call(tsSeasonSelect.options, function (o) { return o.value === targetVal; });
        if (hasOpt) tsSeasonSelect.value = targetVal;
      }
      renderTeamTable();
    });
  }

  function attachLinks(root) {
    root.querySelectorAll(".team-cell.linked, .team-link.linked").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        teamLinkClick(el.dataset.teamSlug, el.dataset.season);
      });
    });
    root.querySelectorAll("[data-season-link].linked").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        seasonLinkClick(el.dataset.seasonLink, el.dataset.targetLeague);
      });
    });
  }

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("zdSeason");
  var dateSelect = document.getElementById("zdDate");
  var countEl = document.getElementById("zdCount");
  var standingsTableWrap = document.getElementById("zdStandingsTable");
  var dateRangeEl = document.getElementById("zdDateRange");
  var refreshedEl = document.getElementById("zdRefreshed");

  function renderStandings() {
    if (!state.currentSnapshot) return;
    var league = state.standingsLeague;

    var lgRankMap = {};
    var lgCounter = {};
    state.currentSnapshot.teams.forEach(function (t) {
      lgCounter[t.league] = (lgCounter[t.league] || 0) + 1;
      lgRankMap[t.team] = lgCounter[t.league];
    });

    var teams = state.currentSnapshot.teams;
    if (league !== "all") teams = teams.filter(function (t) { return t.league === league; });

    var snaps = state.seasonData.snapshots;
    var idx = -1;
    snaps.forEach(function (s, i) { if (s.date === state.currentSnapshot.date) idx = i; });
    var prevDate = idx > 0 ? snaps[idx - 1].date : null;
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");
    updateDisruptedNote("zdDisrupted", [season]);

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams.map(function (t) {
      var lgRank = lgRankMap[t.team] || "-";
      var isStale = !!(prevDate && t.last_match_date && t.last_match_date <= prevDate);
      var slug = state.nameToSlug[t.team];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + t.team + "</td>"
        : '<td class="team-cell">' + t.team + "</td>";
      // Last Match + Date merged into one column - fleet-wide override;
      // ZIDANE's own source keeps them split.
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="col-rank col-hide-mobile">' + lgRank + "</td>" +
        teamTd +
        "<td>" + leagueBadge(t.league, t.domestic_finish) + "</td>" +
        '<td class="col-record">' + fmtRecord(t.record) + "</td>" +
        "<td>" + ratingBar(t.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating.">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating.">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(t.last_match, season, isStale) +
        (t.last_match_date ? '<div class="sub-line-italic">' + t.last_match_date + "</div>" : "") + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.domestic_finish, t.cl_finish, t.el_finish, t.league, t.domestic_cup_finish) + "</td>" +
        "</tr>"
      );
    }).join("");

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">LG #</th>' +
      "<th>Team</th><th>League</th>" +
      '<th class="col-record">League W-D-L (Pts)</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-last-match">Last Match</th>' +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  // ZIDANE's own dropdown is a simple reverse-chronological list of every
  // snapshot (a season has ~228 game-days across 5 leagues), with the label
  // appended inline on the handful that carry one (5 milestones/season) -
  // not the "prestige-sorted shortcuts + separator" pattern the international
  // sites use, which only makes sense with a sparse handful of tournament
  // dates. Ported faithfully; default is always the single latest snapshot.
  function populateDateSelect() {
    var snaps = state.seasonData.snapshots;
    dateSelect.innerHTML = snaps.slice().reverse().map(function (s) {
      var label = s.label ? s.date + " | " + s.label : s.date;
      return '<option value="' + s.date + '">' + label + "</option>";
    }).join("");
    selectSnapshot(snaps[snaps.length - 1].date);
  }

  function selectSnapshot(date) {
    state.currentSnapshot = state.seasonData.snapshots.filter(function (s) { return s.date === date; })[0];
    dateSelect.value = date;
    renderStandings();
  }

  function loadSeason(season) {
    return fetch(BASE + "/seasons/" + season + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.seasonData = data;
        populateDateSelect();
      })
      .catch(function () {
        standingsTableWrap.innerHTML = '<p class="sport-error">Could not load season data</p>';
      });
  }

  seasonSelect.addEventListener("change", function () {
    loadSeason(seasonSelect.value);
  });
  dateSelect.addEventListener("change", function () {
    selectSnapshot(dateSelect.value);
  });

  // ═══════════════════════════════ Team Summary ═══════════════════════════════

  var tsTeamSelect = document.getElementById("tsTeamSelect");
  var tsSeasonSelect = document.getElementById("tsSeasonSelect");
  var tsDateTypeSelect = document.getElementById("tsDateTypeSelect");
  var tsChartWrap = document.getElementById("tsChartWrap");
  var tsChart = document.getElementById("tsChart");
  var tsTableWrap = document.getElementById("tsTableWrap");

  function populateTeams(league) {
    tsTeamSelect.innerHTML = '<option value="">- Select a team -</option>';
    if (!league || !state.teamsIndex) { tsTeamSelect.disabled = true; return; }
    state.teamsIndex.filter(function (t) { return t.league === league; }).forEach(function (t) {
      tsTeamSelect.innerHTML += '<option value="' + t.slug + '">' + t.name + "</option>";
    });
    tsTeamSelect.disabled = false;
  }

  function loadTeamsIndex() {
    return fetch(BASE + "/teams_index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.teamsIndex = data;
        state.nameToSlug = {};
        data.forEach(function (t) { state.nameToSlug[t.name] = t.slug; });
      })
      .catch(function () {
        tsTeamSelect.innerHTML = "<option>Could not load teams</option>";
      });
  }

  function loadTeam(slug) {
    if (!slug) return Promise.resolve();
    if (state.teamCache[slug]) return finishLoadTeam(slug);
    tsTableWrap.innerHTML = '<p class="sport-loading">Loading team data...</p>';
    return fetch(BASE + "/teams/" + slug + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.teamCache[slug] = data;
        return finishLoadTeam(slug);
      })
      .catch(function () {
        tsTableWrap.innerHTML = '<p class="sport-error">Could not load team data</p>';
      });
  }

  function finishLoadTeam(slug) {
    var data = state.teamCache[slug];
    var seasons = Object.keys(data.seasons).sort().reverse();
    var prevValue = tsSeasonSelect.value;
    tsSeasonSelect.innerHTML = seasons.map(function (s) {
      return '<option value="' + s + '">' + s + "</option>";
    }).join("");
    tsSeasonSelect.value = (prevValue && seasons.indexOf(prevValue) !== -1) ? prevValue : (seasons[0] || "");
    renderTeamTable();
  }

  function renderTeamTable() {
    var slug = tsTeamSelect.value;
    if (!slug || !state.teamCache[slug]) return;
    var data = state.teamCache[slug];

    var rows = [];
    var seasons = Object.keys(data.seasons).sort();
    var seasonFilter;
    if (state.tsView === "single") {
      // One-season view: every snapshot in the selected season. Rows where
      // last_match hasn't changed since the prior snapshot are stale
      // (synthetic post-elimination snapshots carrying the last match forward).
      seasonFilter = tsSeasonSelect.value;
      seasons.forEach(function (s) {
        if (s !== seasonFilter) return;
        var prevLastMatch = null;
        data.seasons[s].forEach(function (g) {
          var stale = prevLastMatch != null && g.last_match === prevLastMatch;
          rows.push(Object.assign({}, g, { season: s, _isStale: stale }));
          prevLastMatch = g.last_match;
        });
      });
    } else {
      // Cross-season summary: one snapshot per season, per the selected anchor.
      //   'dom' -> team's last domestic-league game
      //   'cl'  -> Champions League Final day (only teams that played CL that season)
      seasonFilter = "all";
      var dateType = tsDateTypeSelect.value;
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (dateType === "dom" && g.is_domestic_final_day === 1) {
            rows.push(Object.assign({}, g, { season: s }));
          } else if (dateType === "cl" && g.is_cl_final_day === 1 && g.played_cl) {
            rows.push(Object.assign({}, g, { season: s }));
          }
        });
      });
    }

    drawChart(rows, seasonFilter);

    // Disrupted-season footnote: single-season -> top, cross-season -> bottom.
    var isSingle = state.tsView === "single";
    var seasonsList = isSingle ? [seasonFilter] : rows.map(function (g) { return g.season; });
    if (isSingle) {
      updateDisruptedNote("tsDisruptedTop", seasonsList);
      updateDisruptedNote("tsDisruptedBottom", []);
    } else {
      updateDisruptedNote("tsDisruptedBottom", seasonsList);
      updateDisruptedNote("tsDisruptedTop", []);
    }

    var barSc = barScale(rows.slice().reverse().filter(function (g) { return g.rank != null; }).map(function (g) { return g.rating; }));
    var tableRows = rows.slice().reverse().map(function (g) {
      var dateLabel = g.is_domestic_final_day === 1 && g.is_cl_final_day === 1 && g.played_cl
        ? "End of domestic season · End of Champions League"
        : g.is_cl_final_day === 1 && g.played_cl ? "End of Champions League"
        : g.is_domestic_final_day === 1 ? "End of domestic season" : "";
      var dateCell = dateLabel ? g.date + '<div class="sub-line-italic">' + dateLabel + "</div>" : g.date;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '" data-target-league="' + (data.league || "") + '" style="text-align:center">' + g.season + (state.tsView !== "single" ? seasonTag(g.season) : "") + "</td>" +
        '<td class="col-hide-mobile">' + dateCell + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>" +
        '<td class="col-record">' + fmtRecord(g.record) + "</td>" +
        '<td class="col-rank">' + (g.rank != null ? g.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (g.lg_rank != null ? g.lg_rank : "-") + "</td>" +
        "<td>" + (g.rank != null ? ratingBar(g.rating, barSc) : '<span style="color:var(--muted)">-</span>') + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="col-hide-mobile">' + leagueBadge(data.league, g.domestic_finish) + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(g.domestic_finish, g.cl_finish, g.el_finish, data.league, g.domestic_cup_finish) + "</td>" +
        "</tr>"
      );
    }).join("");

    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Season</th><th class="col-hide-mobile">Date</th>' +
      "<th>Last Match</th>" +
      '<th class="col-record">League W-D-L (Pts)</th>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">LG #</th>' +
      "<th>Rating</th>" +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-hide-mobile">League</th>' +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(tsTableWrap);
  }

  function drawChart(rows, seasonFilter) {
    if (rows.length < 2) { tsChartWrap.hidden = true; return; }
    tsChartWrap.hidden = false;

    var W = tsChart.parentElement.clientWidth - 32;
    var H = 180;
    tsChart.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 2, D_CAP = 5;
    var peak = 0;
    rows.forEach(function (r) { peak = Math.max(peak, Math.abs(r.rating || 0)); });
    var CHART_MAX = Math.min(D_CAP, Math.max(D_DEFAULT, peak * 1.12));
    var CHART_MIN = -CHART_MAX;
    var CTOP = 10, CBOT = 152;

    function px(i) { return (i / (rows.length - 1)) * (W - 20) + 10; }
    function clampR(r) { return Math.max(CHART_MIN, Math.min(CHART_MAX, r)); }
    function py(r) { return CBOT - ((clampR(r) - CHART_MIN) / (CHART_MAX - CHART_MIN)) * (CBOT - CTOP); }

    var zeroY = py(0);
    var points = rows.map(function (r, i) { return px(i).toFixed(1) + "," + py(r.rating).toFixed(1); }).join(" ");

    function ctxLine(v) {
      var y = py(v).toFixed(1);
      var col = v > 0 ? "var(--accent)" : "var(--accent-2)";
      return '<line x1="10" y1="' + y + '" x2="' + (W - 10).toFixed(1) + '" y2="' + y +
        '" stroke="' + col + '" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.55"/>' +
        '<text x="12" y="' + (py(v) - 3).toFixed(1) + '" font-size="9" fill="' + col + '">' + (v > 0 ? "+" : "") + v + "</text>";
    }
    var contextLines = ctxLine(D_DEFAULT) + ctxLine(-D_DEFAULT);

    var clipMarks = [];
    var _rs = -1, _rd = 0;
    function flushClip(end) {
      if (_rs < 0) return;
      var midI = Math.round((_rs + end) / 2);
      var tri = _rd > 0 ? "▲" : "▼";
      var ty = _rd > 0 ? CTOP + 8 : CBOT - 2;
      clipMarks.push('<text x="' + px(midI).toFixed(1) + '" y="' + ty + '" font-size="9" fill="var(--muted)" text-anchor="middle">' + tri + "</text>");
      _rs = -1; _rd = 0;
    }
    rows.forEach(function (r, i) {
      var d = r.rating > CHART_MAX ? 1 : (r.rating < CHART_MIN ? -1 : 0);
      if (d !== _rd) { flushClip(i - 1); if (d !== 0) { _rs = i; _rd = d; } }
    });
    flushClip(rows.length - 1);

    var isSingle = seasonFilter !== "all";
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var ticks = [], xlabels = [];
    var seen = {};
    var lastX = -99;
    rows.forEach(function (r, i) {
      var key = isSingle ? r.date.substring(0, 7) : r.date.substring(0, 4);
      var label = isSingle ? MONTHS[parseInt(r.date.substring(5, 7), 10) - 1] : r.date.substring(0, 4);
      if (!seen[key]) {
        seen[key] = true;
        var x = parseFloat(px(i).toFixed(1));
        if (x - lastX >= 24) {
          lastX = x;
          ticks.push('<line x1="' + x + '" y1="' + (CBOT + 2) + '" x2="' + x + '" y2="' + (CBOT + 6) + '" stroke="var(--muted)" stroke-width="1"/>');
          xlabels.push('<text x="' + x + '" y="' + (CBOT + 16) + '" font-size="9" fill="var(--muted)" text-anchor="middle">' + label + "</text>");
        }
      }
    });

    tsChart.innerHTML =
      '<defs><linearGradient id="lineGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
      '<stop offset="' + (zeroY / H - 0.0001).toFixed(4) + '" stop-color="var(--accent)"/>' +
      '<stop offset="' + (zeroY / H + 0.0001).toFixed(4) + '" stop-color="var(--accent-2)"/></linearGradient></defs>' +
      contextLines +
      '<line x1="10" y1="' + zeroY.toFixed(1) + '" x2="' + (W - 10).toFixed(1) + '" y2="' + zeroY.toFixed(1) + '" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4,3"/>' +
      '<line x1="10" y1="' + (CBOT + 2) + '" x2="' + (W - 10).toFixed(1) + '" y2="' + (CBOT + 2) + '" stroke="var(--muted)" stroke-width="1"/>' +
      ticks.join("") + xlabels.join("") +
      '<polyline points="' + points + '" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linejoin="round"/>' +
      clipMarks.join("");
  }

  tsTeamSelect.addEventListener("change", function () { loadTeam(tsTeamSelect.value); });
  tsSeasonSelect.addEventListener("change", renderTeamTable);
  tsDateTypeSelect.addEventListener("change", renderTeamTable);

  // ═══════════════════════════════ League Winners ═══════════════════════════════

  var historyTableWrap = document.getElementById("historyTableWrap");

  function loadChampions() {
    return fetch(BASE + "/champions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.championsData = data;
        renderLeagueHistory(state.historyComp);
      })
      .catch(function () {
        historyTableWrap.innerHTML = '<p class="sport-error">Could not load league history</p>';
      });
  }

  function renderLeagueHistory(league) {
    if (!state.championsData || !league) return;
    var entries = state.championsData[league] || [];
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No data for this competition</p>';
      return;
    }

    var isCup = league === "Champions League" || league === "Europa League";

    function honorBadges(t) {
      var bits = [];
      var lg = LEAGUE_SHORT[t.league] || "League";
      var cupLabel = CUP_SHORT[t.league] || "Cup";
      // Treble call-out only makes sense on the league pages (the team won
      // league + CL + cup) - the CL/EL pages already imply CL.
      var isTreble = t.domestic_finish === "Champion" && t.cl_finish === "Champion" && t.domestic_cup_finish === "Champion";
      if (isTreble && !isCup) bits.push('<span class="finish-badge finish-treble">TREBLE 👑</span>');
      if (isCup) {
        if (t.domestic_finish === "Champion") bits.push('<span class="finish-badge finish-champion">' + lg + " 🏆</span>");
        if (t.domestic_finish === "Runner-Up") bits.push('<span class="finish-badge finish-runner">' + lg + " 🥈</span>");
        if (t.domestic_cup_finish === "Champion") bits.push('<span class="finish-badge finish-champion">' + cupLabel + " 🏆</span>");
        if (t.domestic_cup_finish === "Runner-Up") bits.push('<span class="finish-badge finish-runner">' + cupLabel + " 🥈</span>");
      } else {
        if (t.cl_finish === "Champion") bits.push('<span class="finish-badge finish-champion">CL 🏆</span>');
        if (t.cl_finish === "Runner-Up") bits.push('<span class="finish-badge finish-runner">CL 🥈</span>');
        if (t.el_finish === "Champion") bits.push('<span class="finish-badge finish-champion">EL 🏆</span>');
        if (t.el_finish === "Runner-Up") bits.push('<span class="finish-badge finish-runner">EL 🥈</span>');
        if (t.domestic_cup_finish === "Champion") bits.push('<span class="finish-badge finish-champion">' + cupLabel + " 🏆</span>");
        if (t.domestic_cup_finish === "Runner-Up") bits.push('<span class="finish-badge finish-runner">' + cupLabel + " 🥈</span>");
      }
      return bits.join(" ");
    }

    function teamCell(t, bg, season) {
      if (!t) return '<td class="' + bg + '" colspan="5">-</td>';
      var honors = honorBadges(t);
      var rating = t.rating != null ? t.rating.toFixed(2) : "-";
      var ovrRank = t.rank != null ? String(t.rank) : "-";
      var lgRank = t.lg_rank != null ? String(t.lg_rank) : "-";
      var slug = state.nameToSlug[t.team];
      var cellInner = t.team + (honors ? " " + honors : "");
      var teamTd = slug
        ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '" style="white-space:nowrap">' + cellInner + "</td>"
        : '<td class="' + bg + ' team-cell" style="white-space:nowrap">' + cellInner + "</td>";
      return (
        teamTd +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + ovrRank + "</td>" +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + lgRank + "</td>" +
        '<td class="' + bg + ' rating-cell">' + rating + "</td>" +
        '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecord(t.record) + "</td>"
      );
    }

    // Carry through the source pill only when it's a domestic league. UEFA
    // cups don't map to a Standings filter.
    var targetLg = isCup ? "" : league;
    updateDisruptedNote("historyDisrupted", entries.map(function (e) { return e.season; }));
    var rows = entries.map(function (e) {
      var divCell = isCup && e.final_score
        ? '<td class="divider-col" style="width:3.4rem">' + e.final_score + "</td>"
        : '<td class="divider-col"></td>';
      return (
        "<tr>" +
        '<td class="season-cell linked" data-season-link="' + e.season + '" data-target-league="' + targetLg + '">' + e.season + seasonTag(e.season) + "</td>" +
        teamCell(e.champion, "col-champ", e.season) +
        divCell +
        teamCell(e.runner_up, "col-ru", e.season) +
        "</tr>"
      );
    }).join("");

    var dividerHeader = isCup
      ? '<th class="divider-col" style="width:3.4rem">Score</th>'
      : '<th class="divider-col"></th>';

    var note = league === "Europa League"
      ? '<p class="sport-note">Known as the UEFA Cup before the 2009-10 rebrand</p>'
      : "";

    historyTableWrap.innerHTML =
      note +
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Season</th>' +
      '<th class="col-champ">Champion</th>' +
      '<th class="col-champ col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-champ col-hide-mobile col-rank">LG #</th>' +
      '<th class="col-champ">Rating</th>' +
      '<th class="col-champ col-hide-mobile col-record">League W-D-L (Pts)</th>' +
      dividerHeader +
      '<th class="col-ru">Runner-Up</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">LG #</th>' +
      '<th class="col-ru">Rating</th>' +
      '<th class="col-ru col-hide-mobile col-record">League W-D-L (Pts)</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(historyTableWrap);
  }

  var onHistoryPick = function (v) { state.historyComp = v; renderLeagueHistory(v); };
  buildPillsFromOpts("historyDomesticPills", LEAGUE_OPTIONS, state.historyComp, onHistoryPick, ["historyUefaPills"]);
  buildPillsFromOpts("historyUefaPills", UEFA_OPTIONS, state.historyComp, onHistoryPick, ["historyDomesticPills"]);

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  var goatTableWrap = document.getElementById("goatTableWrap");
  var GOAT_METRIC_FILE = { overall: "goat_teams.json", offense: "goat_teams_o.json", defense: "goat_teams_d.json" };
  var GOAT_METRICS = [
    { field: "rating", label: "Rating", title: "" },
    { field: "rating_o", label: "OFF", title: "Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating." },
    { field: "rating_d", label: "DEF", title: "Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating." },
  ];
  var GOAT_FIELD = { overall: "rating", offense: "rating_o", defense: "rating_d" };

  function loadGoat() {
    if (state.goatCache[state.goatMetric]) { state.goatData = state.goatCache[state.goatMetric]; renderGoat(); return; }
    return fetch(BASE + "/" + GOAT_METRIC_FILE[state.goatMetric])
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.goatCache[state.goatMetric] = data;
        state.goatData = data;
        renderGoat();
      })
      .catch(function () {
        goatTableWrap.innerHTML = '<p class="sport-error">Could not load GOAT table</p>';
      });
  }

  function renderGoat() {
    if (!state.goatData) return;
    var teams = state.goatLeague === "all" ? state.goatData : state.goatData.filter(function (t) { return t.league === state.goatLeague; });

    var activeField = GOAT_FIELD[state.goatMetric];
    var barSc = barScale(teams.map(function (t) { return t[activeField]; }));
    updateDisruptedNote("goatDisrupted", teams.map(function (t) { return t.season; }));
    var rows = teams.map(function (t) {
      var slug = state.nameToSlug[t.team];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + t.season + '">' + t.team + "</td>"
        : '<td class="team-cell">' + t.team + "</td>";
      var targetLg = (state.goatLeague !== "all" ? state.goatLeague : t.league) || "";
      var metricCells = GOAT_METRICS.map(function (m) {
        return m.field === activeField
          ? '<td class="col-od">' + ratingBar(t[m.field], barSc) + "</td>"
          : '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t[m.field], null) + "</td>";
      }).join("");
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="season-cell linked" data-season-link="' + t.season + '" data-target-league="' + targetLg + '" style="text-align:center">' + t.season + seasonTag(t.season) + "</td>" +
        teamTd +
        "<td>" + leagueBadge(t.league, t.domestic_finish) + "</td>" +
        '<td class="col-hide-mobile col-record">' + fmtRecord(t.record) + "</td>" +
        metricCells +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.domestic_finish, t.cl_finish, t.el_finish, t.league, t.domestic_cup_finish) + "</td>" +
        "</tr>"
      );
    }).join("");

    var metricHeaders = GOAT_METRICS.map(function (m) {
      return '<th class="col-od' + (m.field === activeField ? "" : " col-hide-mobile") + '"' + (m.title ? ' title="' + m.title + '"' : "") + ">" + m.label + "</th>";
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">All time rank</th>' +
      '<th style="text-align:center">Season</th>' +
      "<th>Team</th><th>League</th>" +
      '<th class="col-hide-mobile col-record">League W-D-L (Pts)</th>' +
      metricHeaders +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildLeaguePills("goatLeaguePills", true, state.goatLeague, function (v) { state.goatLeague = v; renderGoat(); });
  buildPillsFromOpts("goatMetricPills", [
    { value: "overall", label: "Rating (overall)" },
    { value: "offense", label: "Offense only" },
    { value: "defense", label: "Defense only" },
  ], state.goatMetric, function (v) { state.goatMetric = v; loadGoat(); });

  // ═══════════════════════════════ init ═══════════════════════════════

  buildLeaguePills("tsLeaguePills", false, state.tsLeague, function (v) {
    state.tsLeague = v;
    populateTeams(v);
    tsChartWrap.hidden = true;
    tsTableWrap.innerHTML = '<p class="sport-loading">Select a team above</p>';
    tsSeasonSelect.innerHTML = "";
  });
  buildPillsFromOpts("tsViewPills", [
    { value: "cross", label: "All season summary" },
    { value: "single", label: "All matches within one season" },
  ], state.tsView, function (v) {
    state.tsView = v;
    tsSeasonSelect.hidden = v !== "single";
    tsDateTypeSelect.hidden = v !== "cross";
    renderTeamTable();
  });
  tsSeasonSelect.hidden = true;
  tsDateTypeSelect.hidden = false;

  // Load teams_index + seasons_index together before any table renders -
  // avoids a double-render flash on load AND the disruptedSeasons race
  // ZIDANE's own teamLinkClick has to defensively work around (it re-fetches
  // seasons_index there since its init IIFE doesn't await initStandings).
  // Here disruptedSeasons is populated in this same Promise.all before
  // anything downstream fires, so no re-fetch workaround is needed.
  Promise.all([
    fetch(BASE + "/seasons_index.json").then(function (r) { return r.json(); }),
    loadTeamsIndex(),
  ]).then(function (results) {
    var data = results[0];
    state.seasonsIndex = data;
    state.disruptedSeasons = data.disrupted_seasons || {};
    dateRangeEl.textContent = "Ratings include matches from " + fmtDate(data.first_date) + " to " + fmtDate(data.last_date);
    if (data.generated_at) {
      var refreshed = new Date(data.generated_at);
      refreshedEl.textContent = "Last refreshed: " + refreshed.toLocaleString(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    }
    seasonSelect.innerHTML = data.seasons.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("");
    seasonSelect.value = data.seasons[0];
    buildLeaguePills("zdLeaguePills", true, state.standingsLeague, function (v) { state.standingsLeague = v; renderStandings(); });
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
