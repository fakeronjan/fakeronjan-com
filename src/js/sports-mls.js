(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 1, BAR_CAP = 3.5;
  var CONFERENCES = ["East", "West"];

  var state = {
    seasonsIndex: null,
    disruptedSeasons: {},
    seasonData: null,
    currentSnapshot: null,
    standingsConf: "all",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsConf: "all",
    tsView: "cross",
    goatConf: "all",
    goatMode: "ps",
    goatMetric: "overall",
    goatData: { rs: null, ps: null, rs_o: null, rs_d: null, ps_o: null, ps_d: null },
    championsData: null,
    historyTrophy: "MLS Cup",
  };

  // ── formatting helpers, ported 1:1 from COBI's docs/index.html ────────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  function fmtRecord(rec) {
    if (!rec || rec === "-") return "0-0-0";
    var parts = rec.split("-");
    if (parts.length !== 3) return rec;
    var w = parseInt(parts[0], 10), d = parseInt(parts[1], 10), l = parseInt(parts[2], 10);
    if (w + d + l === 0) return rec;
    var pts = 3 * w + d;
    return rec + ' <span class="dim-pct">(' + pts + ")</span>";
  }

  // Stacked record: regular-season W-D-L (Pts) on top, playoff W-L below in
  // dimmed sub-line. Playoff line hidden when the team hasn't entered
  // playoffs yet (record empty or 0-0).
  function fmtRecordStacked(reg, playoff) {
    var top = fmtRecord(reg);
    if (!playoff) return top;
    var m = playoff.match(/^(\d+)-(\d+)$/);
    var hasPlayoffs = m && (parseInt(m[1], 10) + parseInt(m[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  // Strips the trailing "(MLS)" qualifier - redundant now that every game is
  // MLS. Non-MLS comp tags (e.g. "(CONCACAF Champions Cup)") are left as-is -
  // unlike ZIDANE's abbrevComp, this doesn't abbreviate multiple competitions.
  function abbrevComp(str) {
    if (!str) return "";
    return str.replace(/\s*\(MLS\)\s*$/, "");
  }

  // Gold "East 🏆"/"West 🏆" only when the MLS Cup's two finalists came from
  // different conferences - years where both finalists were from the same
  // conference don't earn the conference-champion badge (mirrors LOBO).
  function confBadge(conf, isCupConfFinalist) {
    if (!conf) return "";
    if (isCupConfFinalist) {
      return '<span class="finish-badge finish-champion" title="' + conf + ' Conference Champion">' + conf + " 🏆</span>";
    }
    return '<span class="finish-badge conf-pill">' + conf + "</span>";
  }

  // Doubles (Cup + Shield same team) get a gold-gradient "DOUBLE" badge
  // alongside both individual trophy badges.
  function finishBadge(t) {
    var cup = t.mls_cup_finish;
    var shield = t.supporters_shield_finish;
    var isDouble = cup === "Champion" && shield === "Champion";
    var bits = [];
    if (isDouble) bits.push('<span class="finish-badge finish-double">DOUBLE 👑</span>');
    if (cup === "Champion") bits.push('<span class="finish-badge finish-champion">MLS Cup 🏆</span>');
    else if (cup === "Runner-Up") bits.push('<span class="finish-badge finish-runner">MLS Cup 🥈</span>');
    if (shield === "Champion") bits.push('<span class="finish-badge finish-champion">Shield 🛡️</span>');
    else if (shield === "Runner-Up") bits.push('<span class="finish-badge finish-runner">Shield 🥈</span>');
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

  // COBI format: "L vs. New England Revolution 0-1 (MLS)" - trailing (MLS)
  // stripped. Liga MX / foreign-club CCL opponents won't be in nameToSlug so
  // they render as plain text (intentional - only MLS clubs have summaries).
  function renderLastMatch(raw, season, isStale) {
    var display = displayMatch(raw);
    if (!display) return "-";
    var stripped = abbrevComp(display);
    var rc = resultClass(raw, isStale);
    var m = stripped.match(LAST_MATCH_RE);
    if (!m) return '<span class="' + rc + '">' + stripped + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4], comp = m[5];
    var slug = state.nameToSlug[opponent.trim()];
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + opponent + "</span>"
      : opponent;
    var compStr = comp ? " " + comp : "";
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

  // ── Disrupted-season helpers (established fleet pattern) ──────────────────

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

  function buildPillsFromOpts(containerId, opts, current, onSelect) {
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
        b.classList.add("active");
        onSelect(o.value);
      });
      wrap.appendChild(b);
    });
  }

  // Conference pills default to All + East + West unless a narrower opts
  // list is passed - Team Summary keeps "All" too (unlike ZIDANE's leagues).
  function buildConfPills(containerId, current, onSelect, opts) {
    var options = opts || [{ value: "all", label: "All" }].concat(CONFERENCES.map(function (c) { return { value: c, label: c }; }));
    buildPillsFromOpts(containerId, options, current, onSelect);
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

  document.getElementById("mlsTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ── deep-link handlers ──────────────────────────────────────────────────

  function seasonLinkClick(season) {
    if (!season) return;
    activateTab("standings");
    seasonSelect.value = season;
    loadSeason(season);
  }

  function teamLinkClick(slug, season) {
    if (!slug) return;
    activateTab("team-summary");
    state.tsConf = "all";
    buildConfPills("tsConfPills", state.tsConf, function (v) { state.tsConf = v; populateTeams(); });
    populateTeams();
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
        seasonLinkClick(el.dataset.seasonLink);
      });
    });
  }

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("mlsSeason");
  var dateSelect = document.getElementById("mlsDate");
  var countEl = document.getElementById("mlsCount");
  var standingsTableWrap = document.getElementById("mlsStandingsTable");
  var dateRangeEl = document.getElementById("mlsDateRange");
  var refreshedEl = document.getElementById("mlsRefreshed");
  var eraNoteEl = document.getElementById("mlsEraNote");

  function renderStandings() {
    if (!state.currentSnapshot) return;
    var conf = state.standingsConf;

    var teams = state.currentSnapshot.teams;
    if (conf !== "all") teams = teams.filter(function (t) { return t.conference === conf; });

    var snaps = state.seasonData.snapshots;
    var idx = -1;
    snaps.forEach(function (s, i) { if (s.date === state.currentSnapshot.date) idx = i; });
    var prevDate = idx > 0 ? snaps[idx - 1].date : null;
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");
    updateDisruptedNote("mlsDisrupted", [season]);

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams.map(function (t) {
      var isStale = !!(prevDate && t.last_match_date && t.last_match_date <= prevDate);
      var slug = state.nameToSlug[t.team];
      var label = t.display_name || t.team;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + "</td>"
        : '<td class="team-cell">' + label + "</td>";
      // Last Match + Date merged into one column - fleet-wide override;
      // COBI's own source keeps them split.
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (t.conf_rank != null ? t.conf_rank : "-") + "</td>" +
        teamTd +
        "<td>" + confBadge(t.conference, t.mls_cup_conf_finalist) + "</td>" +
        '<td class="col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>" +
        "<td>" + ratingBar(t.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating.">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating.">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(t.last_match, season, isStale) +
        (t.last_match_date ? '<div class="sub-line-italic">' + t.last_match_date + "</div>" : "") + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t) + "</td>" +
        "</tr>"
      );
    }).join("");

    // 1996-1999 had no draws - tied games went to a 35-yard run-in shootout,
    // and the era's points formula was 3 reg-W + 1 SOW + 0 L. Standings-only:
    // Team Summary/Champions/GOAT keep the normal "W-D-L (Pts)" header.
    var seasonYear = parseInt(season, 10);
    var isShootoutEra = seasonYear >= 1996 && seasonYear <= 1999;
    var recordHeader = isShootoutEra ? "W-SOW-L (Pts)" : "W-D-L (Pts)";
    if (isShootoutEra) {
      eraNoteEl.textContent = "MLS 1996-1999 had no draws - tied matches were decided by a 35-yard run-in shootout. Era points: 3 for a regulation win, 1 for a shootout win (SOW), 0 for a loss. End-of-season records here are pulled from Wikipedia and are era-accurate; intra-season records during this era are approximate (our gap-fill source doesn't preserve per-match shootout flags).";
      eraNoteEl.hidden = false;
    } else {
      eraNoteEl.hidden = true;
    }

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      "<th>Team</th><th>Conf</th>" +
      '<th class="col-record">' + recordHeader + "</th><th>Rating</th>" +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-last-match">Last Match</th>' +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  // Simple reverse-chronological list (a season has ~93 game-days, 2 carry a
  // milestone label), not the international sites' prestige-sorted-shortcuts
  // pattern - matches COBI's own source. Default is always the latest snapshot.
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

  // teamsIndex is sorted by (conference, name) for the conference-filtered
  // views - when "All" is selected we want a single alphabetical list.
  function populateTeams() {
    tsTeamSelect.innerHTML = '<option value="">- Select a team -</option>';
    if (!state.teamsIndex) { tsTeamSelect.disabled = true; return; }
    var filtered = state.tsConf === "all"
      ? state.teamsIndex.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
      : state.teamsIndex.filter(function (t) { return t.conference === state.tsConf; });
    filtered.forEach(function (t) {
      var priors = t.historical_names || [];
      tsTeamSelect.innerHTML += '<option value="' + t.slug + '">' + (priors.length ? t.name + " (" + priors.join(" / ") + ")" : t.name) + "</option>";
    });
    tsTeamSelect.disabled = false;
  }

  function loadTeamsIndex() {
    return fetch(BASE + "/teams_index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.teamsIndex = data;
        state.nameToSlug = {};
        data.forEach(function (t) {
          state.nameToSlug[t.name] = t.slug;
          (t.historical_names || []).forEach(function (h) { state.nameToSlug[h] = t.slug; });
        });
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
      // (synthetic EOS-day row for teams eliminated earlier).
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
      // Cross-season summary: one snapshot per season (end of regular season
      // or end of playoffs, per the date-type select).
      seasonFilter = "all";
      var dateType = tsDateTypeSelect.value;
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (dateType === "eor" && g.is_end_of_regular_season === 1) rows.push(Object.assign({}, g, { season: s }));
          else if (dateType === "eos" && g.is_end_of_season === 1) rows.push(Object.assign({}, g, { season: s }));
        });
      });
    }

    drawChart(rows, seasonFilter);

    var isSingle = state.tsView === "single";
    var seasonsList = isSingle ? [seasonFilter] : rows.map(function (g) { return g.season; });
    if (isSingle) {
      updateDisruptedNote("tsDisruptedTop", seasonsList);
      updateDisruptedNote("tsDisruptedBottom", []);
    } else {
      updateDisruptedNote("tsDisruptedBottom", seasonsList);
      updateDisruptedNote("tsDisruptedTop", []);
    }

    var canonical = data.team;
    var barSc = barScale(rows.slice().reverse().filter(function (g) { return g.rank != null; }).map(function (g) { return g.rating; }));
    var tableRows = rows.slice().reverse().map(function (g) {
      var era = (g.display_name && g.display_name !== canonical) ? g.display_name : "";
      var seasonCell = era ? g.season + '<div class="sub-line-italic">' + era + "</div>" : g.season;
      var dateLabel = g.is_end_of_regular_season === 1 ? "End of regular season" : g.is_end_of_season === 1 ? "End of playoffs" : "";
      var dateCell = dateLabel ? g.date + '<div class="sub-line-italic">' + dateLabel + "</div>" : g.date;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '" style="text-align:center">' + seasonCell + (state.tsView !== "single" ? seasonTag(g.season) : "") + "</td>" +
        '<td class="col-hide-mobile">' + dateCell + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>" +
        '<td class="col-record">' + fmtRecordStacked(g.regular_record, g.playoff_record) + "</td>" +
        '<td class="col-rank">' + (g.rank != null ? g.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (g.conf_rank != null ? g.conf_rank : "-") + "</td>" +
        "<td>" + (g.rank != null ? ratingBar(g.rating, barSc) : '<span style="color:var(--muted)">-</span>') + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="col-hide-mobile">' + confBadge(g.conference || data.conference, g.mls_cup_conf_finalist) + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(g) + "</td>" +
        "</tr>"
      );
    }).join("");

    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Season</th><th class="col-hide-mobile">Date</th>' +
      "<th>Last Match</th>" +
      '<th class="col-record">W-D-L (Pts)</th>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      "<th>Rating</th>" +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-hide-mobile">Conf</th>' +
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

    var D_DEFAULT = 1, D_CAP = 3.5;
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

  // ═══════════════════════════════ Champions ═══════════════════════════════
  // championsData is keyed by trophy label -> list of {season, champion,
  // runner_up, final_score}. Two trophies: MLS Cup (single-game playoff
  // final) and Supporters' Shield (best regular-season points).

  var historyTableWrap = document.getElementById("historyTableWrap");
  var TROPHY_OPTIONS = [
    { value: "MLS Cup", label: "🏆 MLS Cup" },
    { value: "Supporters Shield", label: "🛡️ Supporters' Shield" },
  ];

  function loadChampions() {
    return fetch(BASE + "/champions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.championsData = data;
        renderChampions();
      })
      .catch(function () {
        historyTableWrap.innerHTML = '<p class="sport-error">Could not load champions</p>';
      });
  }

  function renderChampions() {
    if (!state.championsData) return;
    var entries = state.championsData[state.historyTrophy] || [];
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No data for this trophy yet</p>';
      return;
    }

    var isShield = state.historyTrophy === "Supporters Shield";
    var titleEmoji = isShield ? "🛡️" : "🏆";
    // Shield is graded on regular-season form (frozen on Decision Day) so a
    // team's early playoff exit doesn't drag down its Shield-era rating.
    // MLS Cup uses end-of-postseason rating - playoff form matters there.
    var ratingKey = isShield ? "rating_regular_season" : "rating";
    var rankKey = isShield ? "rank_regular_season" : "rank";
    var confRankKey = isShield ? "conf_rank_regular_season" : "conf_rank";

    // Doubles get DOUBLE + the OTHER trophy badge on a second line below the
    // team name (current trophy is implicit via the tab, no need to repeat it).
    function rowHonor(t) {
      if (!t) return "";
      var isDouble = t.mls_cup_finish === "Champion" && t.supporters_shield_finish === "Champion";
      if (!isDouble) return "";
      var other = state.historyTrophy === "MLS Cup"
        ? '<span class="finish-badge finish-champion">Shield 🛡️</span>'
        : '<span class="finish-badge finish-champion">MLS Cup 🏆</span>';
      return '<div style="margin-top:3px"><span class="finish-badge finish-double">DOUBLE 👑</span> ' + other + "</div>";
    }

    function teamCell(t, bg, season) {
      var cols = isShield ? 4 : 5;
      if (!t) return '<td class="' + bg + '" colspan="' + cols + '">-</td>';
      var ratingVal = t[ratingKey];
      var rating = ratingVal != null ? ratingVal.toFixed(2) : "-";
      var ovrRank = t[rankKey] != null ? String(t[rankKey]) : "-";
      var confRank = t[confRankKey] != null ? String(t[confRankKey]) : "-";
      var label = t.display_name || t.team;
      var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
      var countStr = t.title_count
        ? ' <span class="dim-pct">(' + t.title_count + " " + titleEmoji + ")</span>"
        : t.runner_up_count
        ? ' <span class="dim-pct">(' + t.runner_up_count + " 🥈)</span>"
        : "";
      var cellInner = label + countStr + rowHonor(t);
      var teamTd = slug
        ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '" style="white-space:nowrap">' + cellInner + "</td>"
        : '<td class="' + bg + ' team-cell" style="white-space:nowrap">' + cellInner + "</td>";
      return (
        teamTd +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + ovrRank + "</td>" +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + confRank + "</td>" +
        '<td class="' + bg + ' rating-cell">' + rating + "</td>" +
        '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>"
      );
    }

    updateDisruptedNote("historyDisrupted", entries.map(function (e) { return e.season; }));

    var rows = entries.map(function (e) {
      var divCell = isShield ? "" : (e.final_score
        ? '<td class="divider-col" style="width:3.4rem">' + e.final_score + "</td>"
        : '<td class="divider-col"></td>');
      return (
        "<tr>" +
        '<td class="season-cell linked" data-season-link="' + e.season + '">' + e.season + seasonTag(e.season) + "</td>" +
        teamCell(e.champion, "col-champ", e.season) +
        divCell +
        teamCell(e.runner_up, "col-ru", e.season) +
        "</tr>"
      );
    }).join("");

    var note = isShield
      ? '<p class="sport-note">Supporters\' Shield = best regular-season points total. Ties broken by wins, then GD, then GF. <em>Rating shown is end-of-regular-season - frozen on Decision Day, before playoffs.</em> Pre-2000 standings come from era-accurate Wikipedia totals - MLS used a no-draws shootout format then (regulation W = 3 pts, shootout W = 1 pt)</p>'
      : '<p class="sport-note">MLS Cup = playoff bracket champion. <em>Rating shown is end-of-playoffs - includes the Cup run.</em></p>';

    var scoreCol = isShield ? "" : '<th class="divider-col" style="width:3.4rem">Score</th>';
    var ratingLabel = isShield
      ? 'Rating<div class="sub-line">(Regular Season)</div>'
      : 'Rating<div class="sub-line">(Playoffs)</div>';

    historyTableWrap.innerHTML =
      note +
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Season</th>' +
      '<th class="col-champ">Champion</th>' +
      '<th class="col-champ col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-champ col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-champ">' + ratingLabel + "</th>" +
      '<th class="col-champ col-hide-mobile col-record">W-D-L (Pts)</th>' +
      scoreCol +
      '<th class="col-ru">Runner-Up</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-ru">' + ratingLabel + "</th>" +
      '<th class="col-ru col-hide-mobile col-record">W-D-L (Pts)</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(historyTableWrap);
  }

  buildPillsFromOpts("historyTrophyPills", TROPHY_OPTIONS, state.historyTrophy, function (v) {
    state.historyTrophy = v;
    renderChampions();
  });

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  var goatTableWrap = document.getElementById("goatTableWrap");
  var goatNoteEl = document.getElementById("goatNote");
  var GOAT_METRICS = [
    { field: "rating", label: "Rating", title: "" },
    { field: "rating_o", label: "OFF", title: "Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating." },
    { field: "rating_d", label: "DEF", title: "Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating." },
  ];

  function loadGoat() {
    return Promise.all([
      fetch(BASE + "/goat_rs.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_rs_o.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_rs_d.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps_o.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps_d.json").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      state.goatData = { rs: results[0], ps: results[1], rs_o: results[2], rs_d: results[3], ps_o: results[4], ps_d: results[5] };
      renderGoat();
    }).catch(function () {
      goatTableWrap.innerHTML = '<p class="sport-error">Could not load GOAT table</p>';
    });
  }

  // {data, field} for the active mode (rs/ps) x metric (overall/offense/defense).
  function goatPick() {
    var g = state.goatData;
    var byMode = state.goatMode === "rs"
      ? { overall: g.rs, offense: g.rs_o, defense: g.rs_d }
      : { overall: g.ps, offense: g.ps_o, defense: g.ps_d };
    var field = state.goatMetric === "offense" ? "rating_o" : state.goatMetric === "defense" ? "rating_d" : "rating";
    return { data: byMode[state.goatMetric], field: field };
  }

  function renderGoat() {
    var pick = goatPick();
    var data = pick.data;
    if (!data) return;
    if (goatNoteEl) {
      goatNoteEl.textContent = "Top " + data.length + " single-season ratings · " +
        (state.goatMode === "rs" ? "end of regular season, all teams" : "end of playoffs, champions only");
    }
    var teams = state.goatConf === "all" ? data : data.filter(function (t) { return t.conference === state.goatConf; });
    updateDisruptedNote("goatDisrupted", teams.map(function (t) { return t.season; }));

    var barSc = barScale(teams.map(function (t) { return t[pick.field]; }));
    var rows = teams.map(function (t) {
      var label = t.display_name || t.team;
      var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + t.season + '">' + label + "</td>"
        : '<td class="team-cell">' + label + "</td>";
      var metricCells = GOAT_METRICS.map(function (m) {
        return m.field === pick.field
          ? '<td class="col-od">' + ratingBar(t[m.field], barSc) + "</td>"
          : '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t[m.field], null) + "</td>";
      }).join("");
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="season-cell linked" data-season-link="' + t.season + '" style="text-align:center">' + t.season + seasonTag(t.season) + "</td>" +
        teamTd +
        "<td>" + confBadge(t.conference, t.mls_cup_conf_finalist) + "</td>" +
        '<td class="col-hide-mobile col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>" +
        metricCells +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t) + "</td>" +
        "</tr>"
      );
    }).join("");

    var metricHeaders = GOAT_METRICS.map(function (m) {
      return '<th class="col-od' + (m.field === pick.field ? "" : " col-hide-mobile") + '"' + (m.title ? ' title="' + m.title + '"' : "") + ">" + m.label + "</th>";
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">All time rank</th>' +
      '<th style="text-align:center">Season</th>' +
      "<th>Team</th><th>Conf</th>" +
      '<th class="col-hide-mobile col-record">W-D-L (Pts)</th>' +
      metricHeaders +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildConfPills("goatConfPills", state.goatConf, function (v) { state.goatConf = v; renderGoat(); });
  buildPillsFromOpts("goatModePills", [
    { value: "rs", label: "End of regular season" },
    { value: "ps", label: "End of playoffs" },
  ], state.goatMode, function (v) { state.goatMode = v; renderGoat(); });
  buildPillsFromOpts("goatMetricPills", [
    { value: "overall", label: "Rating (overall)" },
    { value: "offense", label: "Offense only" },
    { value: "defense", label: "Defense only" },
  ], state.goatMetric, function (v) { state.goatMetric = v; renderGoat(); });

  // ═══════════════════════════════ init ═══════════════════════════════

  buildConfPills("tsConfPills", state.tsConf, function (v) { state.tsConf = v; populateTeams(); });
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
    buildConfPills("mlsConfPills", state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
    populateTeams();
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
