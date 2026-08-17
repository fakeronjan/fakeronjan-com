(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 20, BAR_CAP = 48;
  var PLACEHOLDER_LM = ["No match yet", "No competitive match yet", "No Game", "Bye / No Game"];
  var CONFERENCES = ["ACC", "Big Ten", "Big 12", "Pac-12", "SEC", "Big East", "Other"];

  // Historical conference names → compact badge label (realignment-aware).
  var CONF_SHORT = {
    "ACC": "ACC", "Big Ten": "B1G", "Big 12": "Big 12", "Pac-12": "Pac-12",
    "Pac-10": "Pac-10", "SEC": "SEC", "Big East": "Big East", "Big 8": "Big 8",
    "FBS Independents": "IND", "Mountain West": "MWC", "American Athletic": "AAC",
    "Conference USA": "C-USA", "Mid-American": "MAC", "Sun Belt": "SBC",
    "Western Athletic": "WAC", "Southwest": "SWC",
  };
  function shortConf(c) { return CONF_SHORT[c] || c; }

  var state = {
    seasonsIndex: null,
    disruptedSeasons: {},
    seasonData: null,
    standingsConf: "all",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsConf: "all",
    tsView: "cross",
    historyConf: "all",
    championsData: null,
  };

  // ── formatting helpers, ported 1:1 from SALAAM's docs/index.html ──────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  // CFB records can be "12-1" or "11-2-1" pre-1996 (ties allowed).
  function fmtRecord(rec) {
    if (!rec || rec === "-") return "0-0";
    var m = rec.match(/^(\d+)-(\d+)(?:-(\d+))?$/);
    if (!m) return rec;
    var w = parseInt(m[1], 10), l = parseInt(m[2], 10), t = m[3] ? parseInt(m[3], 10) : 0;
    var games = w + l + t;
    if (games === 0) return rec;
    var pct = ((w + 0.5 * t) / games).toFixed(3).replace(/^0/, "");
    return rec + ' <span class="dim-pct">(' + pct + ")</span>";
  }

  function fmtRecordStacked(reg, playoff) {
    if (!reg || reg === "-") return "0-0";
    var top = fmtRecord(reg);
    var pm = playoff ? playoff.match(/^(\d+)-(\d+)$/) : null;
    var hasPlayoffs = pm && (parseInt(pm[1], 10) + parseInt(pm[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  function fmtRecordSmart(reg, playoff, fallback) {
    var top = fmtRecord(reg || fallback);
    var pm = playoff ? playoff.match(/^(\d+)-(\d+)$/) : null;
    var hasPlayoffs = pm && (parseInt(pm[1], 10) + parseInt(pm[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  // National-title honors. 👑 = national title, label = the selector(s) that
  // named this team (CFP / BCS / AP / Coaches / combinations for split poll
  // years). 🏆 stays reserved for conference titles (see confBadge).
  function honorsBadge(cfpStatus, cfpAppearance, era, selectors) {
    if (cfpStatus === 2) {
      var label = (selectors && selectors.length) ? selectors.join("+") : (era || "CFP");
      return '<span class="finish-badge finish-champion">' + label + " 👑</span>";
    }
    if (cfpStatus === 1) return '<span class="finish-badge finish-runner">' + (era || "CFP") + " 🥈</span>";
    if (cfpAppearance === 1) return '<span class="finish-badge finish-appearance">CFP App.</span>';
    return "";
  }

  // Conference badge - gold+trophy when the team won that season's conference
  // title, plain pill otherwise. rawConf carries the historical name (e.g.
  // "Pac-10" for old USC seasons); isChamp is a plain boolean.
  function confBadge(rawConf, isChamp) {
    if (!rawConf) return "";
    var label = shortConf(rawConf);
    return isChamp
      ? '<span class="finish-badge finish-champion">' + label + " 🏆</span>"
      : '<span class="finish-badge conf-pill">' + label + "</span>";
  }

  function fmtOD(rating, rank) {
    if (rating == null) return '<span class="sport-dim-dash">-</span>';
    var r = rating.toFixed(2);
    if (rank == null) return '<div class="od-val">' + r + "</div>";
    return '<div class="od-val">' + r + '</div><div class="od-rank">' + rank + "</div>";
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

  function displayMatch(s) {
    return !s || PLACEHOLDER_LM.indexOf(s) !== -1 ? "" : s;
  }

  function resultClass(match, isStale) {
    if (!match) return "";
    var first = match[0];
    var suffix = isStale ? "-stale" : "";
    if (first === "W") return "result-W" + suffix;
    if (first === "L") return "result-L" + suffix;
    return "";
  }

  var LAST_MATCH_RE = /^([WLT])\s+(\d+\s*-\s*\d+)\s+(vs\.?(?:\s*\(N\))?|@)\s+(.+)$/;

  function renderLastMatch(raw, season, isStale) {
    var display = displayMatch(raw);
    if (!display) return "-";
    var rc = resultClass(raw, isStale);
    var m = display.match(LAST_MATCH_RE);
    if (!m) return '<span class="' + rc + '">' + display + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4];
    var slug = state.nameToSlug[opponent.trim()];
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + opponent + "</span>"
      : opponent;
    return '<span class="' + rc + '">' + letter + " " + score + " " + venue + " " + oppHtml + "</span>";
  }

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

  function buildPills(containerId, current, onSelect, options) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = "";
    var opts = options || [{ value: "all", label: "All" }].concat(
      CONFERENCES.map(function (c) { return { value: c, label: c }; })
    );
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (o.value === current ? " active" : "");
      b.textContent = o.label;
      b.dataset.value = o.value;
      b.addEventListener("click", function () {
        wrap.querySelectorAll(".pill").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        onSelect(o.value);
      });
      wrap.appendChild(b);
    });
  }

  // ── deep-link handlers ──────────────────────────────────────────────────

  function activateTab(tabName) {
    document.querySelectorAll(".sport-tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".sport-view").forEach(function (v) { v.hidden = true; v.classList.remove("active"); });
    var btn = document.querySelector('.sport-tab[data-tab="' + tabName + '"]');
    var view = document.getElementById(tabName);
    if (btn) btn.classList.add("active");
    if (view) { view.hidden = false; view.classList.add("active"); }
  }

  function seasonLinkClick(season) {
    if (!season) return;
    activateTab("standings");
    seasonSelect.value = season;
    loadSeason(Number(season));
  }

  function teamLinkClick(slug, season) {
    if (!slug) return;
    activateTab("team-summary");
    state.tsConf = "all";
    buildPills("tsConfPills", state.tsConf, function (v) { state.tsConf = v; populateTeamSelect(); });
    populateTeamSelect();
    tsTeamSelect.value = slug;
    var wantSingle = season != null && season !== "";
    state.tsView = wantSingle ? "single" : "cross";
    buildPills("tsViewPills", state.tsView, function (v) {
      state.tsView = v;
      tsSeasonSelect.hidden = v !== "single";
      tsDateTypeSelect.hidden = v !== "cross";
      renderTeamTable();
    }, [
      { value: "cross", label: "All season summary" },
      { value: "single", label: "All games within one season" },
    ]);
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

  document.getElementById("ncaafbTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("ncaafbSeason");
  var weekSelect = document.getElementById("ncaafbWeek");
  var countEl = document.getElementById("ncaafbCount");
  var warmupNote = document.getElementById("ncaafbWarmup");
  var standingsTableWrap = document.getElementById("ncaafbStandingsTable");
  var dateRangeEl = document.getElementById("ncaafbDateRange");
  var refreshedEl = document.getElementById("ncaafbRefreshed");

  function renderStandings() {
    var snapshot = state.seasonData.snapshots[Number(weekSelect.value)];
    var idx = Number(weekSelect.value);
    var prevSnapshot = idx > 0 ? state.seasonData.snapshots[idx - 1] : null;
    var teams = snapshot.teams.filter(function (t) {
      return state.standingsConf === "all" || t.conference === state.standingsConf;
    });
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams
      .map(function (t) {
        var isStale = !!(prevSnapshot && t.last_match_date && t.last_match_date <= prevSnapshot.date);
        var slug = state.nameToSlug[t.team];
        var teamTd = slug
          ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + t.team + "</td>"
          : '<td class="team-cell">' + t.team + "</td>";
        return (
          "<tr>" +
          '<td class="col-rank">' + t.rank + "</td>" +
          '<td class="col-rank col-hide-mobile">' + (t.conf_rank != null ? t.conf_rank : '<span class="sport-dim-dash">-</span>') + "</td>" +
          teamTd +
          '<td class="col-hide-mobile">' + confBadge(t.conference_raw || t.conference, !!t.conference_champ) + "</td>" +
          '<td class="col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record, t.record) + "</td>" +
          "<td>" + ratingBar(t.rating, barSc) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
          '<td class="col-last-match">' + renderLastMatch(t.last_match, season, isStale) + "</td>" +
          '<td class="col-hide-mobile col-date">' + (t.last_match_date || "") + "</td>" +
          '<td class="col-hide-mobile col-honors">' + honorsBadge(t.cfp_status, t.cfp_appearance, t.champ_era, t.title_selectors) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">OVR #</th><th class="col-rank col-hide-mobile">Conf #</th><th>Team</th>' +
      '<th class="col-hide-mobile">Conf</th><th class="col-record">W-L (Pct)</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-last-match">Last Game</th><th class="col-hide-mobile col-date">Date</th>' +
      '<th class="col-hide-mobile col-honors">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  function populateWeekSelect() {
    var snapshots = state.seasonData.snapshots;
    var options = snapshots.map(function (s, i) {
      return '<option value="' + i + '">' + s.date + (s.label ? " | " + s.label : "") + "</option>";
    });
    weekSelect.innerHTML = options.slice().reverse().join("");
    weekSelect.value = String(snapshots.length - 1);
  }

  function loadSeason(year) {
    return fetch(BASE + "/seasons/" + year + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.seasonData = data;
        populateWeekSelect();
        warmupNote.hidden = Number(year) !== 1983;
        updateDisruptedNote("ncaafbDisrupted", [year]);
        renderStandings();
      })
      .catch(function () {
        standingsTableWrap.innerHTML = '<p class="sport-error">Could not load season data</p>';
      });
  }

  seasonSelect.addEventListener("change", function () {
    loadSeason(Number(seasonSelect.value));
  });
  weekSelect.addEventListener("change", renderStandings);

  // ═══════════════════════════════ Team Summary ═══════════════════════════════

  var tsTeamSelect = document.getElementById("tsTeamSelect");
  var tsSeasonSelect = document.getElementById("tsSeasonSelect");
  var tsDateTypeSelect = document.getElementById("tsDateTypeSelect");
  var tsChartWrap = document.getElementById("tsChartWrap");
  var tsChart = document.getElementById("tsChart");
  var tsTableWrap = document.getElementById("tsTableWrap");

  function populateTeamSelect() {
    if (!state.teamsIndex) return;
    var filtered = state.tsConf === "all"
      ? state.teamsIndex
      : state.teamsIndex.filter(function (t) { return (t.all_conferences || [t.conference]).indexOf(state.tsConf) !== -1; });
    tsTeamSelect.innerHTML = '<option value="">- Select a team -</option>' + filtered.map(function (t) {
      return '<option value="' + t.slug + '">' + t.name + "</option>";
    }).join("");
  }

  function loadTeamsIndex() {
    return fetch(BASE + "/teams_index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.teamsIndex = data;
        state.nameToSlug = {};
        data.forEach(function (t) { state.nameToSlug[t.name] = t.slug; });
        buildPills("tsConfPills", state.tsConf, function (v) { state.tsConf = v; populateTeamSelect(); });
        populateTeamSelect();
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
    var seasons = Object.keys(data.seasons).sort();
    var rows = [];
    var seasonFilter;

    if (state.tsView === "single") {
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
      seasonFilter = "all";
      var flag = tsDateTypeSelect.value === "eor" ? 1 : 2;
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (g.season_flag === flag) rows.push(Object.assign({}, g, { season: s }));
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

    var barSc = barScale(rows.map(function (g) { return g.rating; }));
    var tableRows = rows.slice().reverse().map(function (g) {
      var wkLabel = g.week_label || "";
      var snapshotCell = wkLabel
        ? wkLabel + '<div class="sub-line-italic">' + g.date + "</div>"
        : g.date;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '">' + g.season + (state.tsView !== "single" ? seasonTag(g.season) : "") + "</td>" +
        '<td class="sport-week-cell">' + snapshotCell + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>" +
        '<td class="col-record">' + fmtRecordSmart(g.regular_record, g.playoff_record, g.record) + "</td>" +
        '<td class="col-rank">' + g.rank + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (g.conf_rank != null ? g.conf_rank : '<span class="sport-dim-dash">-</span>') + "</td>" +
        "<td>" + ratingBar(g.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="col-hide-mobile">' + confBadge(g.conference_raw || g.conference, !!g.conference_champ) + "</td>" +
        '<td class="col-hide-mobile col-honors">' + honorsBadge(g.cfp_status, g.cfp_appearance, g.champ_era, g.title_selectors) + "</td>" +
        "</tr>"
      );
    }).join("");

    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th><th>Week</th><th class="col-last-match">Last Game</th>' +
      '<th class="col-record">W-L (Pct)</th><th class="col-rank">OVR #</th><th class="col-rank col-hide-mobile">Conf #</th>' +
      "<th>Rating</th><th class=\"col-hide-mobile col-od\">OFF</th><th class=\"col-hide-mobile col-od\">DEF</th>" +
      '<th class="col-hide-mobile">Conf</th><th class="col-hide-mobile col-honors">Honors</th>' +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(tsTableWrap);
  }

  // Hand-rolled SVG rating-over-time chart. Trophy markers key off cfp_status +
  // season_flag===2 (the title-game snapshot), not a hardcoded week number -
  // SALAAM's own source uses this same season_flag check rather than DILLON's
  // week!==104 convention.
  function drawChart(rows, seasonFilter) {
    if (rows.length < 2) { tsChartWrap.hidden = true; return; }
    tsChartWrap.hidden = false;

    var W = tsChart.parentElement.clientWidth - 32;
    var H = 180;
    tsChart.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 20, D_CAP = 48;
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

    var trophies = [];
    rows.forEach(function (r, i) {
      if (!r.cfp_status || r.season_flag !== 2) return;
      var emoji = r.cfp_status === 2 ? "👑" : "🥈";
      var titleText = (r.cfp_status === 2 ? "National Champion (" : "National Runner-Up (") + r.season + ")";
      var x = px(i);
      var y = Math.max(14, py(r.rating) - 12);
      trophies.push(
        '<g style="cursor:help"><title>' + titleText + '</title>' +
        '<rect x="' + (x - 9).toFixed(1) + '" y="' + (y - 12).toFixed(1) + '" width="18" height="18" fill="transparent"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="14" text-anchor="middle" pointer-events="none">' + emoji + "</text></g>"
      );
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
      clipMarks.join("") + trophies.join("");
  }

  tsTeamSelect.addEventListener("change", function () { loadTeam(tsTeamSelect.value); });
  tsSeasonSelect.addEventListener("change", renderTeamTable);
  tsDateTypeSelect.addEventListener("change", renderTeamTable);

  // ═══════════════════════════════ National Champions ═══════════════════════════════
  // No 18-derived-rankings sub-view here (confirmed absent from SALAAM's source) -
  // just the champion list with a conference filter, plus split/co-championship
  // handling for poll-era seasons where AP and Coaches disagreed.

  var historyTableWrap = document.getElementById("historyTableWrap");

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

  function teamNameHtml(t, season) {
    var sel = (t.selectors && t.selectors.length) ? t.selectors.join("+") : "";
    var selTag = sel ? '<span class="finish-badge finish-champion sport-sel-tag">' + sel + " 👑</span>" : "";
    var conf = confBadge(t.conference_raw || t.conference, !!t.conference_champ);
    var cnt = t.title_count
      ? ' <span class="dim-pct">(' + t.title_count + " 👑)</span>"
      : t.runner_up_count
      ? ' <span class="dim-pct">(' + t.runner_up_count + " 🥈)</span>"
      : "";
    var slug = state.nameToSlug[t.team];
    var nameHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + t.team + "</span>"
      : t.team;
    return '<div class="sport-champ-name">' + nameHtml + selTag + cnt + "</div><div class=\"sport-champ-conf\">" + conf + "</div>";
  }

  // 5-cell single-team row (team / Rating[+OVR rank] / OFF[+rank] / DEF[+rank] / W-L).
  // Split/co-championship seasons render each team on its OWN <tr> (see
  // renderChampions) instead of stacking two teams inside one cell - a per-cell
  // stack put each column's divider at a different height since cell content
  // heights differ, so the dashed lines never lined up across columns. Real
  // adjacent rows share one clean row boundary for every column instead.
  function teamCells(t, bg, season) {
    if (!t) return '<td class="' + bg + ' sport-dim-dash" style="text-align:center" colspan="5">-</td>';
    return (
      '<td class="' + bg + ' team-cell">' + teamNameHtml(t, season) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od">' + fmtOD(t.rating, t.rank) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
      '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>"
    );
  }

  function renderChampions() {
    if (!state.championsData) return;
    var entries = state.championsData.CFB || [];
    if (state.historyConf !== "all") {
      entries = entries.filter(function (e) {
        var confs = [e.champion, e.co_champion, e.runner_up].filter(Boolean).map(function (t) { return t.conference; });
        return confs.indexOf(state.historyConf) !== -1;
      });
    }
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No champions for this filter</p>';
      return;
    }

    updateDisruptedNote("championsDisrupted", entries.map(function (e) { return e.season; }));

    var rows = entries.map(function (e) {
      var hasCo = !!e.co_champion;
      var rspan = hasCo ? 2 : 1;
      var eraTag = e.era ? '<div class="sub-line">' + e.era + "</div>" : "";
      var seasonCell = '<td class="season-cell linked" data-season-link="' + e.season + '" rowspan="' + rspan + '">' + e.season + seasonTag(e.season) + eraTag + "</td>";
      var scoreCell = '<td class="divider-col" rowspan="' + rspan + '">' + (e.final_score || '<span class="sport-dim-dash">-</span>') + "</td>";
      // co_champion only occurs in poll-era seasons, which never had a title
      // game to produce a runner_up (confirmed against live data - every
      // co_champion entry has runner_up: null) - the collapsed dash spans
      // both sub-rows. Still handled generically in case that ever changes.
      var runnerCell = e.runner_up
        ? teamCells(e.runner_up, "col-ru", e.season)
        : '<td class="col-ru sport-dim-dash" style="text-align:center" colspan="5" rowspan="' + rspan + '">-</td>';

      if (hasCo) {
        return (
          '<tr class="sport-split-top">' + seasonCell + teamCells(e.champion, "col-champ", e.season) + scoreCell + runnerCell + "</tr>" +
          "<tr>" + teamCells(e.co_champion, "col-champ", e.season) + "</tr>"
        );
      }
      return "<tr>" + seasonCell + teamCells(e.champion, "col-champ", e.season) + scoreCell + runnerCell + "</tr>";
    }).join("");

    historyTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th>' +
      '<th class="col-champ">Champion</th><th class="col-champ col-od">Rating</th>' +
      '<th class="col-champ col-hide-mobile col-od">OFF</th><th class="col-champ col-hide-mobile col-od">DEF</th>' +
      '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
      '<th class="divider-col">Score</th>' +
      '<th class="col-ru">Runner-Up</th><th class="col-ru col-od">Rating</th>' +
      '<th class="col-ru col-hide-mobile col-od">OFF</th><th class="col-ru col-hide-mobile col-od">DEF</th>' +
      '<th class="col-ru col-hide-mobile col-record">W-L</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(historyTableWrap);
  }

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  var goatNoteEl = document.getElementById("goatNote");
  var goatTableWrap = document.getElementById("goatTableWrap");
  state.goatMode = "ps";
  state.goatMetric = "react";
  state.goatConf = "all";

  function loadGoat() {
    return Promise.all([
      fetch(BASE + "/goat_rs.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_rs_o.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_rs_d.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps_o.json").then(function (r) { return r.json(); }),
      fetch(BASE + "/goat_ps_d.json").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      state.goatData = {
        rs: results[0], ps: results[1], rs_o: results[2], rs_d: results[3], ps_o: results[4], ps_d: results[5],
      };
      renderGoat();
    }).catch(function () {
      goatTableWrap.innerHTML = '<p class="sport-error">Could not load GOAT table</p>';
    });
  }

  function goatPick() {
    if (state.goatMetric === "o") {
      return { data: state.goatData[state.goatMode === "rs" ? "rs_o" : "ps_o"], field: "rating_o", header: "Offense" };
    }
    if (state.goatMetric === "d") {
      return { data: state.goatData[state.goatMode === "rs" ? "rs_d" : "ps_d"], field: "rating_d", header: "Defense" };
    }
    return { data: state.goatData[state.goatMode], field: "rating", header: "Rating" };
  }

  function renderGoat() {
    var pick = goatPick();
    var GOAT_METRICS = [
      { field: "rating", label: "Rating" },
      { field: "rating_o", label: "OFF" },
      { field: "rating_d", label: "DEF" },
    ];
    var data = pick.data;
    if (!data) return;
    goatNoteEl.textContent = "Top " + data.length + " single-season ratings · " +
      (state.goatMode === "rs" ? "end of regular season, all teams" : "end of playoffs, champions only");
    var teams = state.goatConf === "all" ? data : data.filter(function (t) { return t.conference === state.goatConf; });
    updateDisruptedNote("goatDisrupted", teams.map(function (t) { return t.season; }));
    var barSc = barScale(teams.map(function (t) { return t[pick.field]; }));

    var rows = teams.map(function (t) {
      var slug = state.nameToSlug[t.team];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + t.season + '">' + t.team + "</td>"
        : '<td class="team-cell">' + t.team + "</td>";
      var metricCells = GOAT_METRICS.map(function (m) {
        return m.field === pick.field
          ? '<td class="col-od">' + ratingBar(t[m.field], barSc) + "</td>"
          : '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t[m.field], null) + "</td>";
      }).join("");
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="col-rank linked" data-season-link="' + t.season + '">' + t.season + seasonTag(t.season) + "</td>" +
        teamTd +
        '<td class="col-hide-mobile">' + confBadge(t.conference_raw || t.conference, !!t.conference_champ) + "</td>" +
        '<td class="col-hide-mobile col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>" +
        metricCells +
        '<td class="col-hide-mobile col-honors">' + honorsBadge(t.cfp_status, t.cfp_appearance, t.champ_era, t.title_selectors) + "</td>" +
        "</tr>"
      );
    }).join("");

    var headerCells = GOAT_METRICS.map(function (m) {
      return '<th class="col-od' + (m.field === pick.field ? "" : " col-hide-mobile") + '">' + m.label + "</th>";
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">All-time rank</th><th class="col-rank">Season</th><th>Team</th>' +
      '<th class="col-hide-mobile">Conf</th><th class="col-hide-mobile col-record">W-L</th>' +
      headerCells +
      '<th class="col-hide-mobile col-honors">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildPills("goatConfPills", state.goatConf, function (v) { state.goatConf = v; renderGoat(); });
  buildPills("goatMetricPills", state.goatMetric, function (v) { state.goatMetric = v; renderGoat(); }, [
    { value: "react", label: "Rating (overall)" }, { value: "o", label: "Offense only" }, { value: "d", label: "Defense only" },
  ]);
  buildPills("goatModePills", state.goatMode, function (v) { state.goatMode = v; renderGoat(); }, [
    { value: "rs", label: "End of regular season" }, { value: "ps", label: "End of playoffs" },
  ]);
  buildPills("historyConfPills", state.historyConf, function (v) { state.historyConf = v; renderChampions(); });

  // ═══════════════════════════════ init ═══════════════════════════════

  buildPills("tsViewPills", state.tsView, function (v) {
    state.tsView = v;
    tsSeasonSelect.hidden = v !== "single";
    tsDateTypeSelect.hidden = v !== "cross";
    renderTeamTable();
  }, [
    { value: "cross", label: "All season summary" },
    { value: "single", label: "All games within one season" },
  ]);
  tsSeasonSelect.hidden = true;

  Promise.all([
    fetch(BASE + "/seasons_index.json").then(function (r) { return r.json(); }),
    loadTeamsIndex(),
  ]).then(function (results) {
    var data = results[0];
    state.seasonsIndex = data;
    state.disruptedSeasons = data.disrupted_seasons || {};
    dateRangeEl.textContent = "Ratings include games from " + fmtDate(data.first_date) + " to " + fmtDate(data.last_date);
    if (data.generated_at) {
      var refreshed = new Date(data.generated_at);
      refreshedEl.textContent = "Last refreshed: " + refreshed.toLocaleString(undefined, {
        year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });
    }
    seasonSelect.innerHTML = data.seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
    seasonSelect.value = String(data.seasons[0]);
    buildPills("ncaafbConfPills", state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
