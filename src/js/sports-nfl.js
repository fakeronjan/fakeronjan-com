(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 10, BAR_CAP = 24;
  var PLACEHOLDER_LM = ["No match yet", "No competitive match yet", "No Game", "Bye / No Game"];
  var CONFERENCES = ["AFC", "NFC"];

  var state = {
    seasonsIndex: null,
    disruptedSeasons: {},
    seasonData: null,
    prevSeasonFinalRankByTeam: null,
    standingsConf: "ALL",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsConf: "ALL",
    tsView: "cross",
  };

  // ── formatting helpers, ported 1:1 from DILLON's docs/index.html ──────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  // NFL records can be "10-5" or "10-5-1" (W-L or W-L-T). Win pct counts ties
  // as half-wins per NFL convention, shown dimmed in parens.
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

  function fmtRecordSmart(reg, playoff, fallback) {
    var top = fmtRecord(reg || fallback);
    var pm = playoff ? playoff.match(/^(\d+)-(\d+)$/) : null;
    var hasPlayoffs = pm && (parseInt(pm[1], 10) + parseInt(pm[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  function finishBadge(sbStatus) {
    if (sbStatus === 2) return '<span class="finish-emoji" title="Super Bowl Champion">👑</span>';
    if (sbStatus === 1) return '<span class="finish-emoji" title="Super Bowl Runner-Up">🥈</span>';
    return "";
  }

  function confBadge(conf, sbStatus) {
    if (!conf) return "";
    if (sbStatus >= 1) {
      return '<span class="finish-badge finish-champion" title="' + conf + ' Champion">' + conf + " 🏆</span>";
    }
    return '<span class="finish-badge conf-pill">' + conf + "</span>";
  }

  function confDivBadge(conf, divName, divisionWinner, sbStatus) {
    var html = confBadge(conf, sbStatus);
    if (divName && divName !== "Other") {
      var divClass = divisionWinner ? "finish-badge finish-champion" : "finish-badge conf-pill";
      var divIcon = divisionWinner ? " 🥇" : "";
      var divTitle = divisionWinner ? divName + " Division Winner" : divName;
      html += ' <span class="' + divClass + '" title="' + divTitle + '">' + divName + divIcon + "</span>";
    }
    return html;
  }

  function fmtOD(rating, rank) {
    if (rating == null) return "-";
    var r = rating.toFixed(2);
    if (rank == null) return r;
    return '<div class="od-val">' + r + '</div><div class="od-rank">' + rank + "</div>";
  }

  // 0% (eliminated) and rounds-to-0.0% render as '-'; 100% drops the decimal.
  function fmtSBOdds(odds, rank) {
    if (odds == null) return "-";
    var displayed = (odds * 100).toFixed(1);
    if (displayed === "0.0") return "-";
    var value = parseFloat(displayed) >= 100 ? "100%" : displayed + "%";
    if (rank == null) return value;
    return '<div class="od-val">' + value + '</div><div class="od-rank">' + rank + "</div>";
  }

  function fmtRankMove(rank, prevRank) {
    if (prevRank == null || prevRank === rank) return String(rank);
    var delta = prevRank - rank;
    var cls = delta > 0 ? "rank-move-up" : "rank-move-down";
    var arrow = delta > 0 ? "&#9650;" : "&#9660;";
    return rank + ' <span class="rank-move ' + cls + '">' + arrow + Math.abs(delta) + "</span>";
  }

  function barScale(ratings) {
    var m = 0;
    ratings.forEach(function (r) {
      m = Math.max(m, Math.abs(r || 0));
    });
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

  // Generic disrupted-season note: dedupes a list of seasons against the
  // lookup and renders a footnote listing every distinct disruption found.
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
    var opts = options || [{ value: "ALL", label: "All" }].concat(
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
    state.tsConf = "ALL";
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

  // ── tabs ─────────────────────────────────────────────────────────────────

  document.getElementById("nflTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    state.userPickedTab = true;
    activateTab(btn.dataset.tab);
  });

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("nflSeason");
  var weekSelect = document.getElementById("nflWeek");
  var countEl = document.getElementById("nflCount");
  var warmupNote = document.getElementById("nflWarmup");
  var standingsTableWrap = document.getElementById("nflStandingsTable");
  var dateRangeEl = document.getElementById("nflDateRange");
  var refreshedEl = document.getElementById("nflRefreshed");

  function renderStandings() {
    var snapshot = state.seasonData.snapshots[Number(weekSelect.value)];
    var idx = Number(weekSelect.value);
    var prevSnapshot = idx > 0 ? state.seasonData.snapshots[idx - 1] : null;
    var prevRankByTeam = {};
    if (prevSnapshot) {
      prevSnapshot.teams.forEach(function (t) { prevRankByTeam[t.team] = t.rank; });
    } else if (state.prevSeasonFinalRankByTeam) {
      prevRankByTeam = state.prevSeasonFinalRankByTeam;
    }
    var teams = snapshot.teams.filter(function (t) {
      return state.standingsConf === "ALL" || t.conference === state.standingsConf;
    });
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams
      .map(function (t) {
        var isStale = !!(prevSnapshot && t.last_match_date && t.last_match_date <= prevSnapshot.date);
        var slug = state.nameToSlug[t.team];
        var badge = finishBadge(t.sb_status);
        var label = (t.display_name || t.team) + (badge ? " " + badge : "");
        var teamTd = slug
          ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + "</td>"
          : '<td class="team-cell">' + label + "</td>";
        var lastGameHtml = renderLastMatch(t.last_match, season, isStale);
        var lastGameCell = t.last_match_date
          ? lastGameHtml + '<div class="sub-line-italic">' + t.last_match_date + "</div>"
          : lastGameHtml;
        return (
          "<tr>" +
          '<td class="col-rank">' + fmtRankMove(t.rank, prevRankByTeam[t.team]) + "</td>" +
          teamTd +
          '<td class="col-hide-mobile col-conf">' + confDivBadge(t.conference, t.division, t.division_winner, t.sb_status) + "</td>" +
          '<td class="col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record, t.record) + "</td>" +
          "<td>" + ratingBar(t.rating, barSc) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile">' + fmtSBOdds(t.sb_odds, t.sb_odds_rank) + "</td>" +
          '<td class="col-last-match">' + lastGameCell + "</td>" +
          "</tr>"
        );
      })
      .join("");

    var sbOddsTitle = "Probability of winning the Super Bowl, from simulating the rest of the regular season and the playoffs with current ratings. League-wide probabilities sum to 100%.";
    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Rank</th><th>Team</th><th class="col-hide-mobile col-conf">Conf</th>' +
      '<th class="col-record">W-L (Pct)</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-hide-mobile col-od" title="' + sbOddsTitle + '">SB Odds</th><th class="col-last-match">Last Game</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  function populateWeekSelect() {
    var snapshots = state.seasonData.snapshots;
    // value stays the chronological (ascending) index so renderStandings'
    // prevSnapshot math keeps working - only the displayed option ORDER
    // reverses, newest week on top, matching DILLON's own [...snaps].reverse().
    var options = snapshots.map(function (s, i) {
      return '<option value="' + i + '">' + s.date + (s.label ? " | " + s.label : "") + "</option>";
    });
    weekSelect.innerHTML = options.slice().reverse().join("");
    weekSelect.value = String(snapshots.length - 1);
  }

  function loadPrevSeasonFinalRank(year) {
    return fetch(BASE + "/seasons/" + (year - 1) + ".json")
      .then(function (r) { if (!r.ok) throw new Error("no prior season"); return r.json(); })
      .then(function (data) {
        var finalSnapshot = data.snapshots[data.snapshots.length - 1];
        var map = {};
        finalSnapshot.teams.forEach(function (t) { map[t.team] = t.rank; });
        return map;
      })
      .catch(function () { return null; });
  }

  function loadSeason(year) {
    return Promise.all([
      fetch(BASE + "/seasons/" + year + ".json").then(function (r) { return r.json(); }),
      loadPrevSeasonFinalRank(year)
    ])
      .then(function (results) {
        state.seasonData = results[0];
        state.prevSeasonFinalRankByTeam = results[1];
        populateWeekSelect();
        warmupNote.hidden = Number(year) !== 1971;
        updateDisruptedNote("nflDisrupted", [year]);
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
    var filtered = state.tsConf === "ALL"
      ? state.teamsIndex
      : state.teamsIndex.filter(function (t) { return t.conference === state.tsConf; });
    tsTeamSelect.innerHTML = '<option value="">- Select a team -</option>' + filtered.map(function (t) {
      var priors = t.historical_names || [];
      var label = priors.length ? t.name + " (" + priors.join(" / ") + ")" : t.name;
      return '<option value="' + t.slug + '">' + label + "</option>";
    }).join("");
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
          var row = Object.assign({}, g, { season: s, _isStale: stale });
          rows.push(row);
          prevLastMatch = g.last_match;
        });
      });
      var prevSeasonGames = data.seasons[String(Number(seasonFilter) - 1)];
      rows.forEach(function (g, i) {
        if (i > 0) {
          g._prevRank = rows[i - 1].rank;
        } else if (prevSeasonGames && prevSeasonGames.length) {
          g._prevRank = prevSeasonGames[prevSeasonGames.length - 1].rank;
        }
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

    var canonical = data.team;
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
      var era = g.display_name && g.display_name !== canonical ? g.display_name : "";
      var badge = finishBadge(g.sb_status);
      var badgeStr = badge ? " " + badge : "";
      var snapshotCell = wkLabel
        ? wkLabel + '<div class="sub-line-italic">' + g.date + "</div>"
        : g.date;
      var seasonCell = era
        ? g.season + badgeStr + '<div class="sub-line-italic">' + era + "</div>"
        : g.season + badgeStr;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '">' + seasonCell + (state.tsView !== "single" ? seasonTag(g.season) : "") + "</td>" +
        '<td class="sport-week-cell">' + snapshotCell + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>" +
        '<td class="col-record">' + fmtRecordSmart(g.regular_record, g.playoff_record, g.record) + "</td>" +
        '<td class="col-rank">' + fmtRankMove(g.rank, g._prevRank) + "</td>" +
        "<td>" + ratingBar(g.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtSBOdds(g.sb_odds, g.sb_odds_rank) + "</td>" +
        '<td class="col-hide-mobile col-conf">' + confDivBadge(g.conference || data.conference, g.division || data.division, g.division_winner, g.sb_status) + "</td>" +
        "</tr>"
      );
    }).join("");

    var sbOddsTitle = "Probability of winning the Super Bowl, from simulating the rest of the regular season and the playoffs with current ratings. League-wide probabilities sum to 100%.";
    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th><th>Week</th><th class="col-last-match">Last Game</th>' +
      '<th class="col-record">W-L (Pct)</th><th class="col-rank">Rank</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-hide-mobile col-od" title="' + sbOddsTitle + '">SB Odds</th><th class="col-hide-mobile col-conf">Conf</th>' +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(tsTableWrap);
  }

  // Hand-rolled SVG rating-over-time chart, ported from DILLON's drawChart().
  function drawChart(rows, seasonFilter) {
    if (rows.length < 2) { tsChartWrap.hidden = true; return; }
    tsChartWrap.hidden = false;

    var W = tsChart.parentElement.clientWidth - 32;
    var H = 180;
    tsChart.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 10, D_CAP = 24;
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
      if (!r.sb_status || r.week !== 104) return;
      var emoji = r.sb_status === 2 ? "👑" : "🥈";
      var titleText = (r.sb_status === 2 ? "Champ (" : "Runner-Up (") + r.season + ")";
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

  // ═══════════════════════════════ Super Bowls (League History) ═══════════════════════════════

  var historyTableWrap = document.getElementById("historyTableWrap");
  var championsDisrupted = document.getElementById("championsDisrupted");
  var historyRankNote = document.getElementById("historyRankNote");
  var historyRankTableWrap = document.getElementById("historyRankTableWrap");

  function superBowlRoman(season) {
    var n = parseInt(season, 10);
    if (!isFinite(n) || n < 1966) return "";
    if (n === 2015) return "50";
    var lookup = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90],
      ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
    n = n - 1965;
    var out = "";
    lookup.forEach(function (pair) {
      while (n >= pair[1]) { out += pair[0]; n -= pair[1]; }
    });
    return out;
  }

  function countStr(t) {
    if (t.title_count) return ' <span class="dim-pct">(' + t.title_count + " 👑)</span>";
    if (t.runner_up_count) return ' <span class="dim-pct">(' + t.runner_up_count + " 🥈)</span>";
    return "";
  }

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

  function championTeamCell(t, bg, season, preRated) {
    if (!t) return '<td class="' + bg + '" colspan="5">-</td>';
    var afl = t.afl ? ' <em class="sport-afl-tag">AFL</em>' : "";
    var label = t.display_name || t.team;
    if (preRated) {
      var recordCell = t.regular_record
        ? '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record) + "</td>"
        : '<td class="' + bg + ' col-hide-mobile sport-dim-dash">-</td>';
      return (
        '<td class="' + bg + ' team-cell">' + label + afl + countStr(t) + "</td>" +
        '<td class="' + bg + ' rating-cell sport-dim-dash">-</td>' +
        '<td class="' + bg + ' rating-cell col-od col-hide-mobile sport-dim-dash">-</td>' +
        '<td class="' + bg + ' rating-cell col-od col-hide-mobile sport-dim-dash">-</td>' +
        recordCell
      );
    }
    var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
    var teamTd = slug
      ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + countStr(t) + "</td>"
      : '<td class="' + bg + ' team-cell">' + label + countStr(t) + "</td>";
    return (
      teamTd +
      '<td class="' + bg + ' rating-cell col-od">' + fmtOD(t.rating, t.rank) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
      '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record) + "</td>"
    );
  }

  function renderChampions() {
    if (!state.championsData) return;
    var entries = state.championsData.NFL || [];
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No champions data</p>';
      return;
    }
    var anyPreRated = false;
    updateDisruptedNote("championsDisrupted", entries.map(function (e) { return e.season; }));

    var rows = entries.map(function (e) {
      var preRated = !!e.pre_rated;
      if (preRated) anyPreRated = true;
      var sb = superBowlRoman(e.season);
      var sbSuffix = preRated ? ' <sup class="sport-dagger">†</sup>' : "";
      var seasonInner = sb
        ? e.season + '<div class="sub-line">(' + sb + ")" + sbSuffix + "</div>"
        : e.season + sbSuffix;
      var seasonTd = preRated
        ? '<td class="season-cell">' + seasonInner + "</td>"
        : '<td class="season-cell linked" data-season-link="' + e.season + '">' + seasonInner + seasonTag(e.season) + "</td>";
      var rowClass = preRated ? ' class="sport-prerated-row"' : "";
      return (
        "<tr" + rowClass + ">" +
        seasonTd +
        championTeamCell(e.champion, "col-champ", e.season, preRated) +
        '<td class="divider-col">' + (e.final_score || "") + "</td>" +
        championTeamCell(e.runner_up, "col-ru", e.season, preRated) +
        "</tr>"
      );
    }).join("");

    var footnote = anyPreRated
      ? '<p class="sport-note"><sup>†</sup> Pre-1971 Super Bowls. Results shown for completeness; teams from these seasons are not modeled in ratings (DILLON anchors at 1971 due to a 20-week warm-up).</p>'
      : "";

    historyTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th><th class="col-champ">Champion</th>' +
      '<th class="col-champ col-od">Rating</th>' +
      '<th class="col-champ col-hide-mobile col-od">OFF</th><th class="col-champ col-hide-mobile col-od">DEF</th>' +
      '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
      '<th class="divider-col">Score</th>' +
      '<th class="col-ru">Runner-Up</th><th class="col-ru col-od">Rating</th>' +
      '<th class="col-ru col-hide-mobile col-od">OFF</th><th class="col-ru col-hide-mobile col-od">DEF</th>' +
      '<th class="col-ru col-hide-mobile col-record">W-L</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
    attachLinks(historyTableWrap);
  }

  // ── Super Bowl rankings sub-view ────────────────────────────────────────

  var PRE_SB_MODES = ["best-matchup", "worst-matchup", "closest", "blowout", "upset"];
  var OFF_MODES = ["best-off-champs", "worst-off-champs"];
  var DEF_MODES = ["best-def-champs", "worst-def-champs"];

  function preSBView(t) { return Object.assign({}, t, { rating: t.rating_pre, rank: t.rank_pre, playoff_record: t.playoff_record_pre }); }
  function offView(t) { return Object.assign({}, t, { rating: t.rating_o, rank: t.rank_o }); }
  function defView(t) { return Object.assign({}, t, { rating: t.rating_d, rank: t.rank_d }); }
  function fmtSigned(n) { return (n >= 0 ? "+" : "") + n.toFixed(2); }
  function flipScore(s) {
    var m = s && s.match(/^(\d+)-(\d+)$/);
    return m ? m[2] + "-" + m[1] : s;
  }

  function rankSeasonCell(e) {
    var sb = superBowlRoman(e.season);
    var inner = sb ? e.season + '<div class="sub-line">(' + sb + ")</div>" : String(e.season);
    return '<td class="season-cell linked" data-season-link="' + e.season + '">' + inner + seasonTag(e.season) + "</td>";
  }

  function rankTeamBlock(t, bg, season, sortReact) {
    if (!t) return '<td class="' + bg + '" colspan="3">-</td>';
    var label = t.display_name || t.team;
    var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
    var teamTd = slug
      ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + countStr(t) + "</td>"
      : '<td class="' + bg + ' team-cell">' + label + countStr(t) + "</td>";
    var reactClass = bg + " rating-cell col-od" + (sortReact ? " sort-col" : "");
    return (
      teamTd +
      '<td class="' + reactClass + '">' + fmtOD(t.rating, t.rank) + "</td>" +
      '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record) + "</td>"
    );
  }

  function renderRankingTable(rows, mode, metricLabel) {
    var showCombined = mode === "matchup";
    var showDiff = mode === "spread";
    var isPreSB = showCombined || showDiff;
    var loserFocal = mode === "loser-vs-champ";
    var leftLabel = loserFocal ? "Runner-Up" : "Champion";
    var rightLabel = loserFocal ? "Champion" : "Runner-Up";
    var preTag = isPreSB ? '<div class="sub-line">(pre-SB)</div>' : "";
    var metricHeader = showCombined
      ? '<th class="sort-col">Quality' + preTag + "</th>"
      : showDiff
      ? '<th class="sort-col">Pred. Diff' + preTag + "</th>"
      : "";
    var label = metricLabel || "Rating";
    var sortLeftReact = !isPreSB;
    var leftReactHeader = sortLeftReact
      ? '<th class="col-champ col-od sort-col">' + label + "</th>"
      : '<th class="col-champ col-od">' + label + preTag + "</th>";

    var head =
      '<th class="col-rank">#</th><th class="col-rank">Season</th>' +
      '<th class="col-champ">' + leftLabel + "</th>" +
      leftReactHeader +
      '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
      '<th class="divider-col">Score</th>' +
      '<th class="col-ru">' + rightLabel + "</th>" +
      '<th class="col-ru col-od">' + label + preTag + "</th>" +
      '<th class="col-ru col-hide-mobile col-record">W-L</th>' +
      metricHeader;

    var body = rows.map(function (e, i) {
      var leftTeam = loserFocal ? e.loser : e.champ;
      var rightTeam = loserFocal ? e.champ : e.loser;
      var metricCell = "";
      if (showCombined) {
        metricCell = '<td class="sort-col rating-cell">' + e.quality.toFixed(2) + "</td>";
      } else if (showDiff) {
        var cls = e.diff >= 0 ? "bar-pos" : "bar-neg";
        metricCell = '<td class="sort-col rating-cell ' + cls + '">' + fmtSigned(e.diff) + "</td>";
      }
      var displayScore = loserFocal ? flipScore(e.score) : e.score;
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        rankSeasonCell(e) +
        rankTeamBlock(leftTeam, "col-champ", e.season, sortLeftReact) +
        '<td class="divider-col">' + displayScore + "</td>" +
        rankTeamBlock(rightTeam, "col-ru", e.season, false) +
        metricCell +
        "</tr>"
      );
    }).join("");

    return '<table class="sport-table"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";
  }

  function renderRankings(rankType) {
    if (!state.championsData) return;
    if (rankType === "repeat-champs") return renderRepeatChamps();
    if (rankType === "rematches") return renderRematches();
    if (rankType === "biggest-leap") return renderBiggestLeap();
    if (rankType === "biggest-favorites") return renderTitleOddsList("high");
    if (rankType === "longest-shots") return renderTitleOddsList("low");

    var isOff = OFF_MODES.indexOf(rankType) !== -1;
    var isDef = DEF_MODES.indexOf(rankType) !== -1;
    var isPreSB = PRE_SB_MODES.indexOf(rankType) !== -1;
    var metricLabel = isOff ? "Offense" : isDef ? "Defense" : "Rating";

    var entries = (state.championsData.NFL || []).filter(function (e) {
      if (!e.champion || !e.runner_up) return false;
      if (isOff) return e.champion.rating_o != null && e.runner_up.rating_o != null;
      if (isDef) return e.champion.rating_d != null && e.runner_up.rating_d != null;
      return e.champion.rating != null && e.runner_up.rating != null;
    });

    var rows = entries.map(function (e) {
      var c, r;
      if (isPreSB) { c = preSBView(e.champion); r = preSBView(e.runner_up); }
      else if (isOff) { c = offView(e.champion); r = offView(e.runner_up); }
      else if (isDef) { c = defView(e.champion); r = defView(e.runner_up); }
      else { c = e.champion; r = e.runner_up; }
      var hi = Math.max(c.rating, r.rating);
      var lo = Math.min(c.rating, r.rating);
      return { season: e.season, score: e.final_score || "", champ: c, loser: r, quality: hi + 2 * lo, diff: c.rating - r.rating };
    });

    var sorted, note, mode;
    switch (rankType) {
      case "best-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by overall Rating. The strongest teams ever to win a Super Bowl.";
        mode = "team-vs-opp"; break;
      case "worst-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by overall Rating. The weakest teams ever to win a Super Bowl.";
        mode = "team-vs-opp"; break;
      case "best-losers":
        sorted = rows.slice().sort(function (a, b) { return b.loser.rating - a.loser.rating; }).slice(0, 10);
        note = "Top 10 runner-ups by overall Rating. The strongest teams ever to lose a Super Bowl.";
        mode = "loser-vs-champ"; break;
      case "worst-losers":
        sorted = rows.slice().sort(function (a, b) { return a.loser.rating - b.loser.rating; }).slice(0, 10);
        note = "Bottom 10 runner-ups by overall Rating. The weakest teams ever to lose a Super Bowl.";
        mode = "loser-vs-champ"; break;
      case "best-off-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by Offense rating. The most explosive offenses ever to win a Super Bowl.";
        mode = "team-vs-opp"; break;
      case "worst-off-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by Offense rating. The weakest offenses ever to ride a championship defense.";
        mode = "team-vs-opp"; break;
      case "best-def-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by Defense rating. The most suffocating defenses ever to win a Super Bowl.";
        mode = "team-vs-opp"; break;
      case "worst-def-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by Defense rating. The weakest defenses ever to win on the back of an elite offense.";
        mode = "team-vs-opp"; break;
      case "best-matchup":
        sorted = rows.slice().sort(function (a, b) { return b.quality - a.quality; }).slice(0, 10);
        note = "Top 10 by pre-SB matchup quality. Formula: max(Rating) + 2 × min(Rating), which weights the weaker team double to reward balanced strength over one-sided star power.";
        mode = "matchup"; break;
      case "worst-matchup":
        sorted = rows.slice().sort(function (a, b) { return a.quality - b.quality; }).slice(0, 10);
        note = "Bottom 10 by pre-SB matchup quality. Formula: max(Rating) + 2 × min(Rating), which weights the weaker team double to penalise lopsided matchups over evenly-mediocre ones.";
        mode = "matchup"; break;
      case "closest":
        sorted = rows.slice().sort(function (a, b) { return Math.abs(a.diff) - Math.abs(b.diff); }).slice(0, 10);
        note = "Top 10 by smallest pre-SB rating gap. Signed diff is from the champion's POV (negative = upset).";
        mode = "spread"; break;
      case "blowout":
        sorted = rows.slice().sort(function (a, b) { return Math.abs(b.diff) - Math.abs(a.diff); }).slice(0, 10);
        note = "Top 10 by largest pre-SB rating gap. The biggest predicted mismatches, regardless of who actually won.";
        mode = "spread"; break;
      case "upset":
        sorted = rows.filter(function (r) { return r.diff < 0; }).sort(function (a, b) { return a.diff - b.diff; });
        note = sorted.length + " Super Bowls where the model picked the loser by pre-SB rating. Sorted from biggest upset down.";
        mode = "spread"; break;
      default:
        sorted = []; note = ""; mode = "team-vs-opp";
    }

    historyRankNote.textContent = note;
    historyRankTableWrap.innerHTML = sorted.length ? renderRankingTable(sorted, mode, metricLabel) : '<p class="sport-loading">No data</p>';
    attachLinks(historyRankTableWrap);
  }

  var PAIR_HEAD =
    '<th class="col-rank">Season</th><th class="col-champ">Champion</th>' +
    '<th class="col-champ col-od">Rating</th>' +
    '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
    '<th class="divider-col">Score</th>' +
    '<th class="col-ru">Runner-Up</th><th class="col-ru col-od">Rating</th>' +
    '<th class="col-ru col-hide-mobile col-record">W-L</th>';

  function pairRow(e, isPairEnd) {
    var rowClass = isPairEnd ? ' class="row-group-end"' : "";
    return (
      "<tr" + rowClass + ">" +
      rankSeasonCell(e) +
      rankTeamBlock(e.champion, "col-champ", e.season, false) +
      '<td class="divider-col">' + (e.final_score || "") + "</td>" +
      rankTeamBlock(e.runner_up, "col-ru", e.season, false) +
      "</tr>"
    );
  }

  function renderRepeatChamps() {
    var entries = (state.championsData.NFL || []).slice().sort(function (a, b) { return a.season - b.season; });
    var runs = [];
    var current = [];
    entries.forEach(function (e) {
      if (!e.champion) {
        if (current.length >= 2) runs.push(current);
        current = [];
        return;
      }
      var prev = current.length ? current[current.length - 1] : null;
      var continues = prev && prev.champion.team === e.champion.team && e.season - prev.season === 1;
      if (continues) { current.push(e); }
      else { if (current.length >= 2) runs.push(current); current = [e]; }
    });
    if (current.length >= 2) runs.push(current);
    runs.sort(function (a, b) { return b[b.length - 1].season - a[a.length - 1].season; });

    var totalSeasons = runs.reduce(function (sum, r) { return sum + r.length; }, 0);
    historyRankNote.textContent = runs.length + " repeat-championship runs (" + totalSeasons + " total seasons across consecutive titles).";
    if (!runs.length) {
      historyRankTableWrap.innerHTML = '<p class="sport-loading">No repeat champions in this dataset</p>';
      return;
    }
    var body = runs.map(function (run) {
      var rev = run.slice().reverse();
      return rev.map(function (e, i) { return pairRow(e, i === rev.length - 1); }).join("");
    }).join("");
    historyRankTableWrap.innerHTML = '<table class="sport-table"><thead><tr>' + PAIR_HEAD + "</tr></thead><tbody>" + body + "</tbody></table>";
    attachLinks(historyRankTableWrap);
  }

  function renderRematches() {
    var REMATCH_GAP_THRESHOLD = 5;
    var entries = (state.championsData.NFL || [])
      .filter(function (e) { return e.champion && e.runner_up && e.champion.rating != null && e.runner_up.rating != null; })
      .sort(function (a, b) { return a.season - b.season; });

    function pairKey(e) { return [e.champion.team, e.runner_up.team].sort().join("|"); }
    var meetingsByPair = {};
    entries.forEach(function (e) {
      var k = pairKey(e);
      (meetingsByPair[k] = meetingsByPair[k] || []).push(e);
    });

    var groups = [];
    Object.keys(meetingsByPair).forEach(function (k) {
      var list = meetingsByPair[k];
      var current = [list[0]];
      for (var i = 1; i < list.length; i++) {
        var gap = list[i].season - list[i - 1].season;
        if (gap > REMATCH_GAP_THRESHOLD) {
          if (current.length >= 2) groups.push(current);
          current = [list[i]];
        } else {
          current.push(list[i]);
        }
      }
      if (current.length >= 2) groups.push(current);
    });
    groups.sort(function (a, b) { return b[b.length - 1].season - a[a.length - 1].season; });

    var totalMeetings = groups.reduce(function (sum, g) { return sum + g.length; }, 0);
    historyRankNote.textContent = groups.length + " Super Bowl rematch groups (" + totalMeetings + " total meetings). A group continues as long as the same two teams meet again within " + REMATCH_GAP_THRESHOLD + " years.";
    if (!groups.length) {
      historyRankTableWrap.innerHTML = '<p class="sport-loading">No qualifying rematches</p>';
      return;
    }
    var body = groups.map(function (group) {
      var rev = group.slice().reverse();
      return rev.map(function (e, i) { return pairRow(e, i === rev.length - 1); }).join("");
    }).join("");
    historyRankTableWrap.innerHTML = '<table class="sport-table"><thead><tr>' + PAIR_HEAD + "</tr></thead><tbody>" + body + "</tbody></table>";
    attachLinks(historyRankTableWrap);
  }

  function renderBiggestLeap() {
    var rows = (state.championsData.NFL || [])
      .filter(function (e) { return e.champion && e.champion.rating != null && e.champion.rating_rs != null; })
      .map(function (e) {
        var c = e.champion;
        return { e: e, c: c, rs: c.rating_rs, ps: c.rating, leap: c.rating - c.rating_rs };
      })
      .sort(function (a, b) { return b.leap - a.leap; })
      .slice(0, 10);

    historyRankNote.textContent = "Top 10 champions by rating gained from end of regular season to end of playoffs. The teams that leveled up the most over their title run.";
    if (!rows.length) {
      historyRankTableWrap.innerHTML = '<p class="sport-loading">No data</p>';
      return;
    }
    var body = rows.map(function (r, i) {
      var c = r.c;
      var label = c.display_name || c.team;
      var slug = state.nameToSlug[c.team] || state.nameToSlug[label];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + r.e.season + '">' + label + countStr(c) + "</td>"
        : '<td class="team-cell">' + label + countStr(c) + "</td>";
      var sign = r.leap >= 0 ? "+" : "";
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        rankSeasonCell(r.e) +
        teamTd +
        '<td class="col-hide-mobile col-record">' + fmtRecordSmart(c.regular_record, c.playoff_record) + "</td>" +
        '<td class="rating-cell">' + r.rs.toFixed(2) + " &rarr; " + r.ps.toFixed(2) + "</td>" +
        '<td class="sort-col rating-cell col-od">' + sign + r.leap.toFixed(2) + "</td>" +
        "</tr>"
      );
    }).join("");
    historyRankTableWrap.innerHTML =
      '<table class="sport-table sport-table-narrow"><thead><tr>' +
      '<th class="col-rank">#</th><th class="col-rank">Season</th><th>Champion</th><th class="col-hide-mobile col-record">W-L</th>' +
      '<th>Rating<div class="sub-line">Season &rarr; Playoffs</div></th><th class="sort-col col-od">Rating Increase</th>' +
      "</tr></thead><tbody>" + body + "</tbody></table>";
    attachLinks(historyRankTableWrap);
  }

  function renderTitleOddsList(direction) {
    var rows = (state.championsData.NFL || [])
      .filter(function (e) { return e.champion && e.champion.rs_sb_odds != null; })
      .map(function (e) { return { e: e, c: e.champion, odds: e.champion.rs_sb_odds }; })
      .sort(function (a, b) { return direction === "high" ? b.odds - a.odds : a.odds - b.odds; })
      .slice(0, 10);

    historyRankNote.textContent = direction === "high"
      ? "Top 10 champions based on odds to win it all at the end of the regular season."
      : "Bottom 10 champions based on odds to win it all at the end of the regular season.";
    if (!rows.length) {
      historyRankTableWrap.innerHTML = '<p class="sport-loading">No data</p>';
      return;
    }
    var body = rows.map(function (r, i) {
      var c = r.c;
      var label = c.display_name || c.team;
      var slug = state.nameToSlug[c.team] || state.nameToSlug[label];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + r.e.season + '">' + label + countStr(c) + "</td>"
        : '<td class="team-cell">' + label + countStr(c) + "</td>";
      var oddsRank = c.rs_sb_odds_rank != null ? String(c.rs_sb_odds_rank) : "-";
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        rankSeasonCell(r.e) +
        teamTd +
        '<td class="col-hide-mobile col-record">' + fmtRecordSmart(c.regular_record, c.playoff_record) + "</td>" +
        '<td class="col-hide-mobile col-rank sport-dim-rank">' + oddsRank + "</td>" +
        '<td class="sort-col rating-cell col-od">' + (r.odds * 100).toFixed(1) + "%</td>" +
        "</tr>"
      );
    }).join("");
    historyRankTableWrap.innerHTML =
      '<table class="sport-table sport-table-narrow"><thead><tr>' +
      '<th class="col-rank">#</th><th class="col-rank">Season</th><th>Champion</th><th class="col-hide-mobile col-record">W-L</th>' +
      '<th class="col-hide-mobile col-rank">Odds rank</th><th class="sort-col col-od">Super Bowl odds</th>' +
      "</tr></thead><tbody>" + body + "</tbody></table>";
    attachLinks(historyRankTableWrap);
  }

  function showRankCategory(cat) {
    var pills = document.querySelectorAll("#historyRankPills .pill");
    var firstInCat = null;
    pills.forEach(function (b) {
      var inCat = b.dataset.cat === cat;
      b.hidden = !inCat;
      if (inCat && !firstInCat) firstInCat = b;
    });
    var active = document.querySelector("#historyRankPills .pill.active");
    var target = active && active.dataset.cat === cat ? active : firstInCat;
    pills.forEach(function (b) { b.classList.remove("active"); });
    if (target) {
      target.classList.add("active");
      renderRankings(target.dataset.rank);
    }
  }

  document.getElementById("historyViewPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#historyViewPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    var view = btn.dataset.hview;
    document.getElementById("historyListView").hidden = view !== "list";
    document.getElementById("historyRankingsView").hidden = view !== "rankings";
    if (view === "rankings") showRankCategory(btn.dataset.cat);
  });

  document.getElementById("historyRankPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#historyRankPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    renderRankings(btn.dataset.rank);
  });

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  var goatNoteEl = document.getElementById("goatNote");
  var goatTableWrap = document.getElementById("goatTableWrap");
  state.goatMode = "ps";
  state.goatMetric = "react";
  state.goatConf = "ALL";

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
    var teams = state.goatConf === "ALL" ? data : data.filter(function (t) { return t.conference === state.goatConf; });
    updateDisruptedNote("goatDisrupted", teams.map(function (t) { return t.season; }));
    var barSc = barScale(teams.map(function (t) { return t[pick.field]; }));

    var rows = teams.map(function (t) {
      var badge = finishBadge(t.sb_status);
      var label = (t.display_name || t.team) + (badge ? " " + badge : "");
      var slug = state.nameToSlug[t.team] || state.nameToSlug[t.display_name || t.team];
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
        '<td class="col-rank linked" data-season-link="' + t.season + '">' + t.season + "</td>" +
        teamTd +
        '<td class="col-hide-mobile col-conf">' + confDivBadge(t.conference, t.division, t.division_winner, t.sb_status) + "</td>" +
        '<td class="col-hide-mobile col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record) + "</td>" +
        metricCells +
        "</tr>"
      );
    }).join("");

    var headerCells = GOAT_METRICS.map(function (m) {
      return '<th class="col-od' + (m.field === pick.field ? "" : " col-hide-mobile") + '">' + m.label + "</th>";
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">All-time rank</th><th class="col-rank">Season</th><th>Team</th>' +
      '<th class="col-hide-mobile col-conf">Conf</th><th class="col-hide-mobile col-record">W-L</th>' +
      headerCells +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildPills("goatConfPills", state.goatConf, function (v) { state.goatConf = v; renderGoat(); }, [
    { value: "ALL", label: "All" }, { value: "AFC", label: "AFC" }, { value: "NFC", label: "NFC" },
  ]);
  buildPills("goatMetricPills", state.goatMetric, function (v) { state.goatMetric = v; renderGoat(); }, [
    { value: "react", label: "Rating (overall)" }, { value: "o", label: "Offense only" }, { value: "d", label: "Defense only" },
  ]);
  buildPills("goatModePills", state.goatMode, function (v) { state.goatMode = v; renderGoat(); }, [
    { value: "rs", label: "End of regular season" }, { value: "ps", label: "End of playoffs" },
  ]);

  // ═══════════════════════════════ Weekly Matchups ════════════════════════
  // Every game of a week, previewed from DILLON's ratings going into it: win
  // probability, line, projected score, and the stakes (each team's playoff
  // and Super Bowl odds with a win vs a loss, from simulations of the rest of
  // the season split by that game's result). Results + DILLON's record once
  // played. Data: weekly_matchups/<season>.json. Purely for fun.

  var wmNav = document.getElementById("nflWmNav");
  var wmTitle = document.getElementById("wmTitle");
  var wmNote = document.getElementById("wmNote");
  var wmSeasonSelect = document.getElementById("wmSeasonSelect");
  var wmWeekSelect = document.getElementById("wmWeekSelect");
  var wmStamp = document.getElementById("wmStamp");
  var wmWrap = document.getElementById("wmWrap");
  state.wmSeasons = {};

  var WM_QUALITY_TITLE = "How good and how even the matchup is: the weaker team's rating and how close DILLON has the game. 0-100, ranked against every game.";
  var WM_STAKES_TITLE = "How much the result swings both teams' playoff and Super Bowl odds. 0-100, ranked against every game.";
  var WM_JUICE_TITLE = "Quality and Stakes combined (their geometric mean). A game needs both to score high.";
  var WM_PS_WEEKS = { 101: "Wild Card", 102: "Divisional Round", 103: "Conference Championships", 104: "Super Bowl" };
  function wmWeekLabel(w) { return WM_PS_WEEKS[w] || "Week " + w; }
  function wmNick(name) {
    if (/Football Team$/.test(name)) return "Washington";
    var parts = name.split(" ");
    return parts[parts.length - 1];
  }
  function wmPct(v) {
    if (v == null) return "-";
    var x = v * 100;
    if (x > 0 && x < 1) return "&lt;1%";
    if (x < 100 && x > 99) return "&gt;99%";
    return Math.round(x) + "%";
  }
  function wmSwing(s) { return s.po_win == null ? 0 : s.po_win - s.po_loss; }

  function wmPick(g) {
    var home = g.p_home >= 0.5;
    return { team: home ? g.home : g.away, p: home ? g.p_home : 1 - g.p_home, home: home };
  }
  function wmLine(g) {
    if (Math.abs(g.line) < 0.25) return "Pick'em";
    return wmNick(g.line > 0 ? g.home : g.away) + " by " + Math.abs(g.line);
  }
  function wmCorrect(g) {
    if (!g.result || g.result.home === g.result.away) return null;
    return (g.p_home >= 0.5) === (g.result.home > g.result.away);
  }
  function wmPctOf(rec) {
    var m = rec.match(/^(\d+)-(\d+)(?:-(\d+))?$/);
    if (!m) return 0;
    var w = +m[1], l = +m[2], t = +(m[3] || 0), n = w + l + t;
    return n ? (w + 0.5 * t) / n : 0.5;
  }

  function loadWeeklyMatchups() {
    return fetch(BASE + "/weekly_matchups/index.json")
      .then(function (r) { return r.json(); })
      .then(function (idx) {
        state.wmIndex = idx;
        if (!idx.seasons.length) return;
        wmNav.hidden = false;
        wmSeasonSelect.innerHTML = idx.seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
        wmSeasonSelect.onchange = function () { loadWmSeason(Number(wmSeasonSelect.value)); };
        wmWeekSelect.onchange = renderWeeklyMatchups;
        return loadWmSeason(idx.seasons[0]);
      })
      .catch(function () {});
  }

  function loadWmSeason(season) {
    var have = state.wmSeasons[season];
    var p = have ? Promise.resolve(have) : fetch(BASE + "/weekly_matchups/" + season + ".json").then(function (r) { return r.json(); });
    return p.then(function (d) {
      state.wmSeasons[season] = d;
      state.wmSeason = season;
      wmSeasonSelect.value = String(season);
      // Default: the first week with games still to play, else the last week.
      var cur = d.weeks.filter(function (w) { return w.games.some(function (g) { return !g.result; }); })[0] || d.weeks[d.weeks.length - 1];
      wmWeekSelect.innerHTML = d.weeks.slice().reverse().map(function (w) {
        return '<option value="' + w.week + '">' + wmWeekLabel(w.week) + "</option>";
      }).join("");
      wmWeekSelect.value = String(cur.week);
      renderWeeklyMatchups();
    });
  }

  function wmTeamLink(name, season) {
    var slug = state.nameToSlug[name];
    return slug ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + name + "</span>" : name;
  }

  function wmStakesLines(g, key, ps) {
    return ["away", "home"].map(function (side) {
      var s = g.stakes[side];
      if (key === "po") {
        if (s.po_win == null) return "";
        return '<div class="wm-stake">' + wmPct(s.po_win) + ' <span class="wm-dim">/</span> ' + wmPct(s.po_loss) + "</div>";
      }
      return '<div class="wm-stake">' + wmPct(s.sb_win) + ' <span class="wm-dim">/</span> ' + (ps ? "out" : wmPct(s.sb_loss)) + "</div>";
    }).join("");
  }

  function wmResult(g) {
    if (!g.result) return '<span class="wm-dim">-</span>';
    var ok = wmCorrect(g);
    var mark = ok == null ? "" : (ok ? ' <span class="wc-w">&#10003;</span>' : ' <span class="wc-l">&#10007;</span>');
    return wmNick(g.away) + " " + g.result.away + ", " + wmNick(g.home) + " " + g.result.home + mark;
  }

  function renderWeeklyMatchups() {
    var d = state.wmSeasons[state.wmSeason];
    if (!d) return;
    var week = Number(wmWeekSelect.value);
    var wk = d.weeks.filter(function (w) { return w.week === week; })[0];
    var ps = week >= 100;
    wmTitle.textContent = d.season + " " + wmWeekLabel(week);
    wmNote.textContent = "Win probability, line and projected score for every game, from DILLON's ratings going into the week. " +
      "Stakes show each team's playoff and Super Bowl odds with a win and with a loss.";

    // DILLON's record picking winners: this week, and the season through it.
    function tally(weeks) {
      var w = 0, l = 0;
      weeks.forEach(function (x) { x.games.forEach(function (g) { var c = wmCorrect(g); if (c === true) w++; else if (c === false) l++; }); });
      return [w, l];
    }
    var thisWk = tally([wk]);
    var season = tally(d.weeks.filter(function (w) { return w.week <= week; }));
    var stamp = '<span class="wc-md-label">DILLON pick record</span>';
    if (thisWk[0] + thisWk[1]) stamp += '<span class="wc-result">' + wmWeekLabel(week) + " <b>" + thisWk[0] + "-" + thisWk[1] + "</b></span>";
    if (season[0] + season[1]) stamp += '<span class="wc-result">' + d.season + " season <b>" + season[0] + "-" + season[1] + "</b></span>";
    wmStamp.innerHTML = stamp;

    var games = wk.games.slice().sort(function (a, b) { return (b.juice || 0) - (a.juice || 0); });

    // Markers: the game of the week (top Juice, the table's first row)
    // and upset-watch picks (DILLON favors the team with the worse record).
    var gotw = games[0];
    function isUpset(g) {
      if (ps) return false;
      var pk = wmPick(g);
      return wmPctOf(pk.home ? g.home_record : g.away_record) < wmPctOf(pk.home ? g.away_record : g.home_record);
    }
    var nUpset = games.filter(isUpset).length;
    wmStamp.innerHTML += '<span class="wm-legend">&#11088; Game of the week</span>' +
      (nUpset ? '<span class="wm-legend" title="DILLON favors the team with the worse record">&#9889; Upset watch</span>' : "");

    var rows = games.map(function (g) {
      var pk = wmPick(g);
      var mark = (g === gotw ? "&#11088;" : "") + (isUpset(g) ? "&#9889;" : "");
      return '<tr' + (g === gotw ? ' class="wm-gotw"' : "") + ">" +
        '<td class="wm-mark">' + mark + "</td>" +
        '<td class="wm-matchup"><div><span class="wm-at"></span><span class="wm-rank">' + (g.away_rank || "") + "</span>" + wmTeamLink(g.away, d.season) + ' <span class="wm-dim">' + g.away_record + "</span></div>" +
        '<div><span class="wm-at">' + (g.neutral ? "vs." : "@") + '</span><span class="wm-rank">' + (g.home_rank || "") + "</span>" + wmTeamLink(g.home, d.season) + ' <span class="wm-dim">' + g.home_record + "</span></div></td>" +
        '<td class="col-od col-hide-mobile">' + g.quality + "</td>" +
        '<td class="col-od col-hide-mobile">' + g.stakes_score + "</td>" +
        '<td class="col-od wm-juice">' + g.juice + "</td>" +
        '<td class="col-od"><div class="od-val">' + wmNick(pk.team) + '</div><div class="od-rank">' + wmPct(pk.p) + "</div></td>" +
        '<td class="col-hide-mobile">' + wmLine(g) + "</td>" +
        '<td class="col-hide-mobile">' + wmNick(g.away) + " " + g.proj_away + "<div>" + wmNick(g.home) + " " + g.proj_home + "</div></td>" +
        (ps ? "" : "<td>" + wmStakesLines(g, "po", ps) + "</td>") +
        '<td class="' + (ps ? "" : "col-hide-mobile") + '">' + wmStakesLines(g, "sb", ps) + "</td>" +
        '<td class="wm-result">' + wmResult(g) + "</td>" +
        "</tr>";
    }).join("");
    wmWrap.innerHTML =
      '<table class="sport-table wm-table"><thead><tr>' +
      '<th class="wm-mark"></th>' + "<th>Matchup</th>" +
      '<th class="col-od col-hide-mobile" title="' + WM_QUALITY_TITLE + '">Quality</th>' +
      '<th class="col-od col-hide-mobile" title="' + WM_STAKES_TITLE + '">Stakes</th>' +
      '<th class="col-od" title="' + WM_JUICE_TITLE + '">Juice</th>' +
      "<th class=\"col-od\">DILLON pick</th><th class=\"col-hide-mobile\">DILLON Line</th><th class=\"col-hide-mobile\">Projected</th>" +
      (ps ? "" : '<th title="Playoff odds with a win / with a loss">Playoff odds (W/L)</th>') +
      '<th class="' + (ps ? "" : "col-hide-mobile") + '" title="Super Bowl odds with a win / with a loss">Super Bowl odds (W/L)</th>' +
      "<th>Result</th></tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(wmWrap);
  }

  // ═══════════════════════════════ NFL Playoffs ═══════════════════════════
  // Knockout odds, ported from MESSI's World Cup grid (same code as sports-wnba.js,
  // plus match scores and penalties for single-match rounds). Data: per-season
  // snapshots from the end of the regular season on (playoff_odds/<season>.json).
  // The tab always shows, defaulting to the newest postseason with data (the
  // current one once its regular season is over, else last year's).

  var poNav = document.getElementById("nflPoNav");
  var poTitle = document.getElementById("poTitle");
  var poNote = document.getElementById("poNote");
  var poSeasonSelect = document.getElementById("poSeasonSelect");
  var poDateSelect = document.getElementById("poDateSelect");
  var poStamp = document.getElementById("poStamp");
  var poWrap = document.getElementById("poWrap");
  state.poSeasons = {};

  function loadPlayoffOdds() {
    return fetch(BASE + "/playoff_odds/index.json")
      .then(function (r) { return r.json(); })
      .then(function (idx) {
        state.poIndex = idx;
        if (!idx.seasons.length) return;
        poNav.hidden = false;
        poSeasonSelect.innerHTML = idx.seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
        poSeasonSelect.onchange = function () { loadPoSeason(Number(poSeasonSelect.value), null); };
        return loadPoSeason(idx.seasons[0], null).then(function () {
          // Land here while the current season's playoffs are undecided.
          var snaps = state.poSeasons[idx.seasons[0]].snapshots;
          var last = snaps[snaps.length - 1];
          var live = idx.seasons[0] === idx.current_season && last.stage !== "Champion";
          if (live && !state.userPickedTab) activateTab("playoff-odds");
        });
      })
      .catch(function () {});
  }

  function loadPoSeason(season, date) {
    var have = state.poSeasons[season];
    var p = have ? Promise.resolve(have) : fetch(BASE + "/playoff_odds/" + season + ".json").then(function (r) { return r.json(); });
    return p.then(function (d) {
      state.poSeasons[season] = d;
      state.poSeason = season;
      poSeasonSelect.value = String(season);
      var snaps = d.snapshots;
      poDateSelect.innerHTML = snaps.slice().reverse().map(function (s) {
        return '<option value="' + s.date + '">' + s.date + " | " + s.stage + "</option>";
      }).join("");
      poDateSelect.value = date || snaps[snaps.length - 1].date;
      poDateSelect.onchange = function () { renderPlayoffOdds(); };
      renderPlayoffOdds();
    });
  }

  function renderPlayoffOdds() {
    var d = state.poSeasons[state.poSeason];
    if (!d) return;
    var view = d.snapshots.filter(function (s) { return s.date === poDateSelect.value; })[0] || d.snapshots[d.snapshots.length - 1];
    var short = d.rounds_short;
    var nR = short.length;
    poTitle.textContent = d.season + " NFL Playoffs 🏆 Win Probability";
    poNote.textContent = (view.n_sims || state.poIndex.n_sims || 0).toLocaleString() + " Monte Carlo simulations · each column is the chance to advance past that round";

    if (view.results && view.results.length) {
      poStamp.innerHTML = '<span class="wc-md-label">Results · ' + view.date + "</span>" + view.results.map(function (g) {
        var so = g.pens ? ' <span class="wc-so">(pens)</span>' : "";
        return '<span class="wc-result">' + g.home + " <b>" + g.hp + "-" + g.vp + "</b> " + g.away + so + "</span>";
      }).join("");
    } else {
      poStamp.innerHTML = '<span class="wc-md-label">' + view.stage + "</span>";
    }

    var teams = view.teams.map(function (t) {
      var byRound = {};
      t.series.forEach(function (x) { byRound[x.round] = x; });
      // Round the team was knocked out in (latest lost matchup). Counting
      // matchups played instead misorders brackets with byes or play-ins.
      var out = -1;
      t.series.forEach(function (x) { if (x.done && !x.won) out = Math.max(out, short.indexOf(x.round)); });
      return Object.assign({}, t, { _by: byRound, _out: out });
    });
    var ordered = teams.slice().sort(function (a, b) {
      if (!a.eliminated !== !b.eliminated) return a.eliminated ? 1 : -1;
      if (!a.eliminated) return b.adv[nR - 1] - a.adv[nR - 1];
      return (b._out - a._out) || (b.rating - a.rating);
    });

    function pct(v) { return v * 100 < 1 ? "&lt;1%" : Math.round(v * 100) + "%"; }
    var MAXA = 0.70;
    var alive = teams.filter(function (t) { return !t.eliminated; });
    var range = short.map(function (rd, k) {
      var vs = alive.filter(function (t) { return !(t._by[rd] && t._by[rd].done) && k + 1 >= t.enter; }).map(function (t) { return t.adv[k]; });
      return [vs.length ? Math.min.apply(null, vs) : Infinity, vs.length ? Math.max.apply(null, vs) : -Infinity];
    });
    function heat(v, r) {
      var lo = r[0], hi = r[1];
      if (!isFinite(lo) || hi <= lo) return "background:color-mix(in srgb, var(--accent) 6%, #fff)";
      var x = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      if (x >= 0.5) return "background:color-mix(in srgb, var(--accent) " + ((x - 0.5) * 2 * MAXA * 100).toFixed(1) + "%, #fff)";
      return "background:color-mix(in srgb, var(--accent-2) " + ((0.5 - x) * 2 * MAXA * 100).toFixed(1) + "%, #fff)";
    }
    function cell(t, k) {
      var rd = short[k];
      var cls = "col-od wc-heat" + (k === nR - 1 ? " wc-champ-cell" : "") + (k < nR - 2 ? " col-hide-mobile" : "");
      var x = t._by[rd];
      if (x && x.done) return '<td class="' + cls + '"><span class="' + (x.won ? "wc-w" : "wc-l") + ' wc-wl">' + (x.won ? "W" : "L") + "</span></td>";
      if (k + 1 < t.enter) return '<td class="' + cls + '"><span style="color:var(--muted)">bye</span></td>';
      if (t.eliminated) return '<td class="' + cls + '"><span style="color:var(--muted)">-</span></td>';
      // Series under way: its score sits under the odds until it's clinched.
      var inner = x && (x.w || x.l)
        ? '<div class="od-val">' + pct(t.adv[k]) + '</div><div class="od-rank" style="color:inherit;opacity:0.75">' + x.w + "-" + x.l + "</div>"
        : pct(t.adv[k]);
      return '<td class="' + cls + '" style="' + heat(t.adv[k], range[k]) + '">' + inner + "</td>";
    }
    function resultsCell(t) {
      var lines = t.series.slice().reverse().map(function (x) {
        var rd = '<span class="wc-rd">' + x.round + "</span>";
        var opp = '<span class="wc-vs">vs. ' + x.opp + "</span>";
        if (!x.w && !x.l) return rd + " " + opp;
        if (x.score) {
          var p = x.pens ? ' <span class="wc-so">p</span>' : "";
          return rd + ' <span class="' + (x.won ? "wc-w" : "wc-l") + '">' + (x.won ? "W" : "L") + " " + x.score + p + "</span> " + opp;
        }
        // Best-of-3 Round One: a series record, labeled so it doesn't read as a score.
        var score = x.w + "-" + x.l + (x.best_of === 3 ? " series" : "");
        if (!x.done) return rd + " <b>" + score + "</b> " + opp;
        return rd + ' <span class="' + (x.won ? "wc-w" : "wc-l") + '">' + (x.won ? "W" : "L") + " " + score + "</span> " + opp;
      });
      var body = lines.length
        ? lines.map(function (p) { return '<div class="wc-seg">' + p + "</div>"; }).join("")
        : '<span style="color:var(--muted)">-</span>';
      return '<td class="wc-results"><div class="wc-results-inner">' + body + "</div></td>";
    }
    var rows = ordered.map(function (t) {
      var slug = state.nameToSlug[t.team];
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + d.season + '">' + t.team + "</td>"
        : '<td class="team-cell">' + t.team + "</td>";
      return "<tr>" +
        '<td class="col-rank">' + t.seed + "</td>" + teamTd +
        '<td class="col-od rating-cell">' + fmtOD(t.rating, t.rank) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
        resultsCell(t) +
        short.map(function (_, k) { return cell(t, k); }).join("") +
        "</tr>";
    }).join("");
    var heads = short.map(function (rd, k) {
      var label = k === nR - 1 ? rd + " 🏆" : rd;
      return '<th class="col-od wc-col' + (k < nR - 2 ? " col-hide-mobile" : "") + '">' + label + "</th>";
    }).join("");
    poWrap.innerHTML =
      '<table class="sport-table wc-odds-table"><thead><tr>' +
      '<th style="text-align:center;width:56px">Seed</th><th style="width:152px">Team</th>' +
      '<th class="col-od" style="width:60px">Rating</th>' +
      '<th class="col-hide-mobile col-od" style="width:56px">OFF</th>' +
      '<th class="col-hide-mobile col-od" style="width:56px">DEF</th>' +
      "<th>Results</th>" + heads +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(poWrap);
  }

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
    buildPills("nflConfPills", state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); }, [
      { value: "ALL", label: "All" }, { value: "AFC", label: "AFC" }, { value: "NFC", label: "NFC" },
    ]);
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
    loadPlayoffOdds();
    loadWeeklyMatchups();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
