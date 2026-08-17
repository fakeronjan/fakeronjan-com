(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 1, BAR_CAP = 4;
  var LEAGUES = ["AL", "NL"];

  var state = {
    seasonsIndex: null,
    disruptedSeasons: {},
    seasonData: null,
    currentSnapshot: null,
    standingsConf: "ALL",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsConf: "ALL",
    tsView: "cross",
    championsData: null,
  };

  // ── formatting helpers, ported 1:1 from GRIFFEY's docs/index.html ─────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  function fmtRecord(rec) {
    if (!rec || rec === "-") return "0-0";
    var m = rec.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return rec;
    var w = parseInt(m[1], 10), l = parseInt(m[2], 10);
    if (w + l === 0) return w + "-" + l;
    var pct = (w / (w + l)).toFixed(3).replace(/^0/, "");
    return w + "-" + l + ' <span class="dim-pct">(' + pct + ")</span>";
  }

  function fmtRecordSmart(reg, playoff) {
    var top = fmtRecord(reg || "0-0");
    var pm = playoff ? playoff.match(/^(\d+)-(\d+)$/) : null;
    var hasPlayoffs = pm && (parseInt(pm[1], 10) + parseInt(pm[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  function fmtRecordStacked(reg, playoff) {
    if (!reg || reg === "-") return "0-0";
    var top = fmtRecord(reg);
    var pm = playoff ? playoff.match(/^(\d+)-(\d+)$/) : null;
    var hasPlayoffs = pm && (parseInt(pm[1], 10) + parseInt(pm[2], 10) > 0);
    if (!hasPlayoffs) return top;
    return top + '<div class="sub-line">' + playoff + "</div>";
  }

  function fmtOD(rating, rank) {
    if (rating == null) return "-";
    var r = rating.toFixed(2);
    if (rank == null) return r;
    return '<div class="od-val">' + r + '</div><div class="od-rank">' + rank + "</div>";
  }

  function fmtTitleOdds(odds, rank) {
    if (odds == null) return "-";
    var pct = odds < 0.001 ? "<0.1%" : (odds * 100).toFixed(1) + "%";
    if (rank == null) return pct;
    return '<div class="od-val">' + pct + '</div><div class="od-rank">' + rank + "</div>";
  }

  // Two side-by-side pills: league pill (highlighted if pennant won), and
  // division pill (highlighted if division won). Division pill only shows
  // when we have a division name that isn't a placeholder/the league itself.
  function leagueBadge(lg, finalsStatus, divName, divisionWinner) {
    if (!lg) return "";
    var lgClass = finalsStatus >= 1 ? "finish-badge finish-champion" : "finish-badge conf-pill";
    var lgIcon = finalsStatus >= 1 ? " 🏆" : "";
    var lgTitle = finalsStatus >= 1 ? lg + " Pennant" : lg;
    var html = '<span class="' + lgClass + '" title="' + lgTitle + '">' + lg + lgIcon + "</span>";

    if (divName && divName.indexOf("(") !== 0 && divName !== "Other" && divName !== lg) {
      var shortDiv = divName.replace(/^(AL|NL)\s+/, "");
      var divClass = divisionWinner ? "finish-badge finish-champion" : "finish-badge conf-pill";
      var divIcon = divisionWinner ? " 🥇" : "";
      var divTitle = divisionWinner ? divName + " Division Winner" : divName;
      html += ' <span class="' + divClass + '" title="' + divTitle + '">' + shortDiv + divIcon + "</span>";
    }
    return html;
  }

  function finishBadge(finalsStatus) {
    if (finalsStatus === 2) return '<span class="finish-emoji" title="World Series Champion">👑</span>';
    if (finalsStatus === 1) return '<span class="finish-emoji" title="World Series Runner-Up">🥈</span>';
    return "";
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

  function resultClass(match, isStale) {
    var suffix = isStale ? "-stale" : "";
    if (match[0] === "W") return "result-W" + suffix;
    if (match[0] === "L") return "result-L" + suffix;
    return "";
  }

  var ONE_MATCH_RE = /^([WLT])\s+(\d+\s*-\s*\d+)\s+(vs\.?(?:\s*\(N\))?|@)\s+(.+)$/;

  function renderOneMatch(raw, season, isStale) {
    var cls = resultClass(raw, isStale);
    var m = raw.match(ONE_MATCH_RE);
    if (!m) return '<span class="' + cls + '">' + raw + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4];
    var slug = state.nameToSlug[opponent.trim()];
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + opponent + "</span>"
      : opponent;
    return '<span class="' + cls + '">' + letter + " " + score + " " + venue + " " + oppHtml + "</span>";
  }

  // "G1: W 10-0" -> small "G1" badge, score gets the colored/linked treatment.
  function renderDHLeg(labeledGame, season, isStale) {
    var m = labeledGame.match(/^(G\d+):\s*(.+)$/);
    if (!m) return renderOneMatch(labeledGame, season, isStale);
    var label = m[1], rest = m[2];
    return '<span class="dh-tag">' + label + "</span>" + renderOneMatch(rest, season, isStale);
  }

  var DH_SAME_OPP_RE = /^((?:G\d+:\s*[WLT]\s+\d+\s*-\s*\d+)(?:,\s*G\d+:\s*[WLT]\s+\d+\s*-\s*\d+)+)\s+(vs\.?(?:\s*\(N\))?|@)\s+(.+)$/;

  // Doubleheader-aware Last Game renderer. GRIFFEY's fix (2026-07-19): both DH
  // legs must show as explicit G1/G2 badges - a naive single-game regex
  // silently dropped one leg of every doubleheader.
  function renderLastMatch(raw, season, isStale) {
    if (!raw) return "-";
    // Same-opponent doubleheader: "G1: L 0-5, G2: W 6-5 vs. Montreal Expos"
    var dh = raw.match(DH_SAME_OPP_RE);
    if (dh) {
      var games = dh[1], venue = dh[2], opponent = dh[3];
      var slug = state.nameToSlug[opponent.trim()];
      var oppHtml = slug
        ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '">' + opponent + "</span>"
        : '<span class="team-link">' + opponent + "</span>";
      var legLetters = [];
      var re = /G\d+:\s*([WLT])/g, mm;
      while ((mm = re.exec(games))) legLetters.push(mm[1]);
      var sameOutcome = legLetters.length > 0 && legLetters.every(function (l) { return l === legLetters[0]; });
      if (sameOutcome) {
        // All legs went the same way (e.g. swept the DH) - match the
        // single-game look: whole line in one W/L color, badges stay neutral.
        var legsHtml = games.split(",").map(function (g) {
          var gm = g.trim().match(/^(G\d+):\s*(.+)$/);
          return gm ? '<span class="dh-tag">' + gm[1] + "</span>" + gm[2] : g.trim();
        }).join(" ");
        var cls = resultClass(legLetters[0], isStale);
        return '<span class="' + cls + '">' + legsHtml + " " + venue + "</span> " + oppHtml;
      }
      // Split doubleheader (one win, one loss) - each leg keeps its own W/L tint.
      var splitLegsHtml = games.split(",").map(function (g) { return renderDHLeg(g.trim(), season, isStale); }).join(" ");
      return splitLegsHtml + " " + venue + " " + oppHtml;
    }
    // Split doubleheader, different opponents (rare): "G1: W 5-3 vs. Team A / G2: L 2-4 @ Team B"
    if (raw.indexOf(" / ") !== -1) {
      return raw.split(" / ").map(function (part) { return renderDHLeg(part.trim(), season, isStale); }).join(" / ");
    }
    return renderOneMatch(raw, season, isStale);
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
    var opts = options || [{ value: "ALL", label: "All" }].concat(
      LEAGUES.map(function (c) { return { value: c, label: c }; })
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
    var wantSingle = season && season !== "all" && /^\d{4}$/.test(String(season));
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

  document.getElementById("mlbTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("mlbSeason");
  var dateSelect = document.getElementById("mlbDate");
  var countEl = document.getElementById("mlbCount");
  var warmupNote = document.getElementById("mlbWarmup");
  var standingsTableWrap = document.getElementById("mlbStandingsTable");
  var dateRangeEl = document.getElementById("mlbDateRange");
  var refreshedEl = document.getElementById("mlbRefreshed");

  var batTitle = "Batting: how much the team's offense contributes to its Rating, in runs above league average per game.";
  var pitTitle = "Pitching: how much the team's run prevention contributes to its Rating, in runs above league average per game.";
  var parkTitle = "Park factor: how much the team's home ballpark inflates (positive) or suppresses (negative) total runs scored, in runs per game, independent of team skill. Rank 1 = most hitter-friendly park.";
  var titleOddsTitle = "Probability of winning the World Series, given (Rating, Batting, Pitching, season progress, current playoff series state if applicable) through this point in the season. Trained on the same point in every other season since 1969. League-wide probabilities sum to 100%.";

  function renderStandings() {
    if (!state.currentSnapshot) return;
    var conf = state.standingsConf;
    var teams = state.currentSnapshot.teams;
    if (conf !== "ALL") teams = teams.filter(function (t) { return t.league === conf; });

    var snaps = state.seasonData.snapshots;
    var idx = -1;
    snaps.forEach(function (s, i) { if (s.date === state.currentSnapshot.date) idx = i; });
    var prevDate = idx > 0 ? snaps[idx - 1].date : null;
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams
      .map(function (t) {
        var isStale = !!(prevDate && t.last_match_date && t.last_match_date <= prevDate);
        var slug = state.nameToSlug[t.team];
        var badge = finishBadge(t.finals_status);
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
          '<td class="col-rank">' + t.rank + "</td>" +
          teamTd +
          '<td class="col-hide-mobile col-conf">' + leagueBadge(t.league, t.finals_status, t.division, t.division_winner) + "</td>" +
          '<td class="col-record">' + fmtRecordSmart(t.regular_record, t.playoff_record) + "</td>" +
          "<td>" + ratingBar(t.rating, barSc) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile" title="' + batTitle + '">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile" title="' + pitTitle + '">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile" title="' + parkTitle + '">' + fmtOD(t.park_factor, t.park_factor_rank) + "</td>" +
          '<td class="rating-cell col-od col-hide-mobile" title="' + titleOddsTitle + '">' + fmtTitleOdds(t.title_odds, t.title_odds_rank) + "</td>" +
          '<td class="col-last-match">' + lastGameCell + "</td>" +
          "</tr>"
        );
      })
      .join("");

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Rank</th><th>Team</th><th class="col-hide-mobile col-conf">League</th>' +
      '<th class="col-record">W-L (Pct)</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od" title="' + batTitle + '">BAT</th>' +
      '<th class="col-hide-mobile col-od" title="' + pitTitle + '">PIT</th>' +
      '<th class="col-hide-mobile col-od" title="' + parkTitle + '">PARK</th>' +
      '<th class="col-hide-mobile col-od" title="' + titleOddsTitle + '">Title Odds</th>' +
      '<th class="col-last-match">Last Game</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  function populateDateSelect() {
    var snaps = state.seasonData.snapshots;
    var options = snaps.map(function (s) {
      return '<option value="' + s.date + '">' + (s.label ? s.date + " | " + s.label : s.date) + "</option>";
    });
    dateSelect.innerHTML = options.slice().reverse().join("");
  }

  function selectSnapshot(date) {
    state.currentSnapshot = state.seasonData.snapshots.filter(function (s) { return s.date === date; })[0];
    dateSelect.value = date;
    renderStandings();
  }

  function loadSeason(year) {
    return fetch(BASE + "/seasons/" + year + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.seasonData = data;
        populateDateSelect();
        var snaps = data.snapshots;
        // Default: end-of-postseason for completed seasons, latest snapshot
        // for the current calendar year (in-progress).
        var isCurrentYear = data.season === new Date().getFullYear();
        var psSnap = snaps.filter(function (s) { return s.is_ps_end; })[0];
        var defaultDate = (!isCurrentYear && psSnap) ? psSnap.date : snaps[snaps.length - 1].date;
        selectSnapshot(defaultDate);
        warmupNote.hidden = Number(year) !== 1962;
        updateDisruptedNote("mlbDisrupted", [year]);
      })
      .catch(function () {
        standingsTableWrap.innerHTML = '<p class="sport-error">Could not load season data</p>';
      });
  }

  seasonSelect.addEventListener("change", function () {
    loadSeason(Number(seasonSelect.value));
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

  function populateTeamSelect() {
    if (!state.teamsIndex) return;
    var filtered = state.tsConf === "ALL"
      ? state.teamsIndex
      : state.teamsIndex.filter(function (t) { return t.league === state.tsConf; });
    tsTeamSelect.innerHTML = '<option value="">- Select a team -</option>' + filtered.map(function (t) {
      var priors = t.historical_names || [];
      var name = t.display_name || t.team;
      var label = priors.length ? name + " (" + priors.join(" / ") + ")" : name;
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
          state.nameToSlug[t.team] = t.slug;
          if (t.display_name) state.nameToSlug[t.display_name] = t.slug;
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
      // One-season view: filter to game-days for this team PLUS the EOR + EOS
      // snapshots (so non-playoff teams still see their end-of-playoffs rating).
      // Off-day rows beyond the team's last game render un-bolded via _isStale.
      seasonFilter = tsSeasonSelect.value;
      seasons.forEach(function (s) {
        if (s !== seasonFilter) return;
        data.seasons[s].forEach(function (g) {
          var isGameDay = g.last_match_date && g.last_match_date === g.date;
          var isFlag = g.season_flag === 1 || g.season_flag === 2;
          if (isGameDay || isFlag) {
            rows.push(Object.assign({}, g, { season: s, _isStale: isFlag && !isGameDay }));
          }
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
      var era = g.display_name && g.display_name !== canonical ? g.display_name : "";
      var isStrike = parseInt(g.season, 10) === 1994;
      var badge = finishBadge(g.finals_status);
      var badgeStr = badge ? " " + badge : "";
      var seasonCell = era
        ? g.season + badgeStr + '<div class="sub-line-italic">' + era + "</div>"
        : g.season + badgeStr;
      var dateLabel = isStrike ? "Strike began Aug 12, 1994"
        : g.season_flag === 1 ? "End of regular season"
        : g.season_flag === 2 ? "End of playoffs" : "";
      var dateCell = dateLabel ? g.date + '<div class="sub-line-italic">' + dateLabel + "</div>" : g.date;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '">' + seasonCell + (state.tsView !== "single" ? seasonTag(g.season) : "") + "</td>" +
        '<td class="col-hide-mobile">' + dateCell + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>" +
        '<td class="col-record">' + fmtRecordSmart(g.regular_record, g.playoff_record) + "</td>" +
        '<td class="col-rank">' + g.rank + "</td>" +
        "<td>" + ratingBar(g.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="' + batTitle + '">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="' + pitTitle + '">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="' + parkTitle + '">' + fmtOD(g.park_factor, g.park_factor_rank) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="' + titleOddsTitle + '">' + fmtTitleOdds(g.title_odds, g.title_odds_rank) + "</td>" +
        '<td class="col-hide-mobile col-conf">' + leagueBadge(g.league || data.league, g.finals_status, g.division, g.division_winner) + "</td>" +
        "</tr>"
      );
    }).join("");

    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th><th class="col-hide-mobile">Date</th><th class="col-last-match">Last Game</th>' +
      '<th class="col-record">W-L (Pct)</th><th class="col-rank">Rank</th><th>Rating</th>' +
      '<th class="col-hide-mobile col-od" title="' + batTitle + '">BAT</th>' +
      '<th class="col-hide-mobile col-od" title="' + pitTitle + '">PIT</th>' +
      '<th class="col-hide-mobile col-od" title="' + parkTitle + '">PARK</th>' +
      '<th class="col-hide-mobile col-od" title="' + titleOddsTitle + '">Title Odds</th>' +
      '<th class="col-hide-mobile col-conf">League</th>' +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(tsTableWrap);
  }

  // Hand-rolled SVG rating-over-time chart, ported from GRIFFEY's drawChart().
  function drawChart(rows, seasonFilter) {
    if (rows.length < 2) { tsChartWrap.hidden = true; return; }
    tsChartWrap.hidden = false;

    var W = tsChart.parentElement.clientWidth - 32;
    var H = 180;
    tsChart.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 1, D_CAP = 4;
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
      if (!r.finals_status || r.season_flag !== 2) return;
      var emoji = r.finals_status === 2 ? "👑" : "🥈";
      var titleText = (r.finals_status === 2 ? "World Series Champion (" : "World Series Runner-Up (") + r.season + ")";
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

  // ═══════════════════════════════ World Series (League History) ═══════════════════════════════

  var historyTableWrap = document.getElementById("historyTableWrap");
  var historyRankNote = document.getElementById("historyRankNote");
  var historyRankTableWrap = document.getElementById("historyRankTableWrap");

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

  function championTeamCell(t, bg, season) {
    if (!t) return '<td class="' + bg + '" colspan="6">-</td>';
    var label = t.display_name || t.team;
    var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
    var rating = t.ps_end_rating != null ? t.ps_end_rating.toFixed(2) : "-";
    var rank = t.ps_end_rank != null ? String(t.ps_end_rank) : "-";
    var teamTd = slug
      ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + countStr(t) + "</td>"
      : '<td class="' + bg + ' team-cell">' + label + countStr(t) + "</td>";
    return (
      teamTd +
      '<td class="' + bg + ' col-hide-mobile" style="color:var(--muted);font-size:0.85em;text-align:center">' + rank + "</td>" +
      '<td class="' + bg + ' rating-cell">' + rating + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.ps_end_rating_o, t.ps_end_rank_o) + "</td>" +
      '<td class="' + bg + ' rating-cell col-od col-hide-mobile">' + fmtOD(t.ps_end_rating_d, t.ps_end_rank_d) + "</td>" +
      '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordStacked(t.rs_record, t.ps_record) + "</td>"
    );
  }

  function renderChampions() {
    if (!state.championsData) return;
    var entries = state.championsData.MLB || [];
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No champions data</p>';
      return;
    }
    var anyPreRated = false;
    updateDisruptedNote("championsDisrupted", entries.map(function (e) { return e.season; }));

    var rows = entries.map(function (e) {
      if (e.no_series) {
        // 1994 strike - single-cell row across the table with a callout.
        return (
          '<tr class="sport-strike-row">' +
          '<td class="season-cell linked" data-season-link="' + e.season + '">' + e.season + seasonTag(e.season) + "</td>" +
          '<td colspan="13" class="sport-strike-note">No World Series - players\' strike cancelled the postseason</td>' +
          "</tr>"
        );
      }
      var preRated = !!e.pre_rated;
      if (preRated) anyPreRated = true;
      var seasonSuffix = preRated ? ' <sup class="sport-dagger">†</sup>' : "";
      var rowClass = preRated ? ' class="sport-prerated-row"' : "";
      return (
        "<tr" + rowClass + ">" +
        '<td class="season-cell linked" data-season-link="' + e.season + '">' + e.season + seasonTag(e.season) + seasonSuffix + "</td>" +
        championTeamCell(e.champion, "col-champ", e.season) +
        '<td class="divider-col">' + (e.series || "") +
        (e.final_score ? '<div class="sub-line">(' + e.final_score + ")</div>" : "") + "</td>" +
        championTeamCell(e.runner_up, "col-ru", e.season) +
        "</tr>"
      );
    }).join("");

    var footnote = anyPreRated
      ? '<p class="sport-note"><sup>†</sup> Season consumed by the model\'s 202 game-day warm-up window. Results shown for completeness; ratings begin in 1962.</p>'
      : "";

    historyTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">Season</th><th class="col-champ">Champion</th>' +
      '<th class="col-champ col-hide-mobile col-rank">Rank</th>' +
      '<th class="col-champ">Rating</th>' +
      '<th class="col-champ col-hide-mobile col-od">BAT</th><th class="col-champ col-hide-mobile col-od">PIT</th>' +
      '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
      '<th class="divider-col">Series<div class="sub-line">(Last game)</div></th>' +
      '<th class="col-ru">Runner-Up</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Rank</th>' +
      '<th class="col-ru">Rating</th>' +
      '<th class="col-ru col-hide-mobile col-od">BAT</th><th class="col-ru col-hide-mobile col-od">PIT</th>' +
      '<th class="col-ru col-hide-mobile col-record">W-L</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
    attachLinks(historyTableWrap);
  }

  // ── World Series rankings sub-view ────────────────────────────────────────

  var PRE_WS_MODES = ["best-matchup", "worst-matchup", "closest", "blowout", "upset"];
  var BAT_MODES = ["best-bat-champs", "worst-bat-champs"];
  var PIT_MODES = ["best-pit-champs", "worst-pit-champs"];

  function eosView(t) { return Object.assign({}, t, { rating: t.ps_end_rating, rank: t.ps_end_rank }); }
  function preWsView(t) { return Object.assign({}, t, { rating: t.rating_pre, rank: t.rank_pre, ps_record: t.ps_record_pre }); }
  function batView(t) { return Object.assign({}, t, { rating: t.ps_end_rating_o, rank: t.ps_end_rank_o }); }
  function pitView(t) { return Object.assign({}, t, { rating: t.ps_end_rating_d, rank: t.ps_end_rank_d }); }
  function fmtSigned(n) { return (n >= 0 ? "+" : "") + n.toFixed(2); }
  function flipSeries(s) {
    var m = s && s.match(/^(\d+)-(\d+)$/);
    return m ? m[2] + "-" + m[1] : s;
  }

  function rankSeasonCell(e) {
    return '<td class="season-cell linked" data-season-link="' + e.season + '">' + e.season + seasonTag(e.season) + "</td>";
  }

  function rankTeamBlock(t, bg, season, sortRating) {
    if (!t) return '<td class="' + bg + '" colspan="3">-</td>';
    var label = t.display_name || t.team;
    var slug = state.nameToSlug[t.team] || state.nameToSlug[label];
    var teamTd = slug
      ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + label + countStr(t) + "</td>"
      : '<td class="' + bg + ' team-cell">' + label + countStr(t) + "</td>";
    var ratingClass = sortRating ? bg + " rating-cell sort-col" : bg + " rating-cell";
    return (
      teamTd +
      '<td class="' + bg + ' col-hide-mobile" style="color:var(--muted);font-size:0.85em;text-align:center">' + (t.rank != null ? t.rank : "-") + "</td>" +
      '<td class="' + ratingClass + '">' + (t.rating != null ? t.rating.toFixed(2) : "-") + "</td>" +
      '<td class="' + bg + ' col-hide-mobile col-record">' + fmtRecordStacked(t.rs_record, t.ps_record) + "</td>"
    );
  }

  function renderRankingTable(rows, mode, metricLabel) {
    var showCombined = mode === "matchup";
    var showDiff = mode === "spread";
    var isPreWs = showCombined || showDiff;
    var loserFocal = mode === "loser-vs-champ";
    var leftLabel = loserFocal ? "Runner-Up" : "Champion";
    var rightLabel = loserFocal ? "Champion" : "Runner-Up";
    var preTag = isPreWs ? '<div class="sub-line">(pre-WS)</div>' : "";
    var metricHeader = showCombined
      ? '<th class="sort-col">Quality' + preTag + "</th>"
      : showDiff
      ? '<th class="sort-col">Pred. Diff' + preTag + "</th>"
      : "";
    var label = metricLabel || "Rating";
    var sortLeftRating = !isPreWs;
    var leftRatingHeader = sortLeftRating
      ? '<th class="col-champ sort-col col-rank">' + label + "</th>"
      : '<th class="col-champ col-rank">' + label + preTag + "</th>";

    var head =
      '<th class="col-rank">#</th><th class="col-rank">Season</th>' +
      '<th class="col-champ">' + leftLabel + "</th>" +
      leftRatingHeader +
      '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
      '<th class="divider-col">Series<div class="sub-line">(Last game)</div></th>' +
      '<th class="col-ru">' + rightLabel + "</th>" +
      '<th class="col-ru">' + label + preTag + "</th>" +
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
      var displaySeries = loserFocal ? flipSeries(e.series) : e.series;
      var scoreCell = '<td class="divider-col">' + (displaySeries || "") +
        (e.score ? '<div class="sub-line">(' + e.score + ")</div>" : "") + "</td>";
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        rankSeasonCell(e) +
        rankTeamBlock(leftTeam, "col-champ", e.season, sortLeftRating) +
        scoreCell +
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

    var isBat = BAT_MODES.indexOf(rankType) !== -1;
    var isPit = PIT_MODES.indexOf(rankType) !== -1;
    var isPreWs = PRE_WS_MODES.indexOf(rankType) !== -1;
    var metricLabel = isBat ? "Batting" : isPit ? "Pitching" : "Rating";

    var entries = (state.championsData.MLB || []).filter(function (e) {
      if (!e.champion || !e.runner_up) return false;
      if (isBat) return e.champion.ps_end_rating_o != null && e.runner_up.ps_end_rating_o != null;
      if (isPit) return e.champion.ps_end_rating_d != null && e.runner_up.ps_end_rating_d != null;
      if (isPreWs) return e.champion.rating_pre != null && e.runner_up.rating_pre != null;
      return e.champion.ps_end_rating != null && e.runner_up.ps_end_rating != null;
    });

    var rows = entries.map(function (e) {
      var c, r;
      if (isPreWs) { c = preWsView(e.champion); r = preWsView(e.runner_up); }
      else if (isBat) { c = batView(e.champion); r = batView(e.runner_up); }
      else if (isPit) { c = pitView(e.champion); r = pitView(e.runner_up); }
      else { c = eosView(e.champion); r = eosView(e.runner_up); }
      var hi = Math.max(c.rating, r.rating);
      var lo = Math.min(c.rating, r.rating);
      return { season: e.season, series: e.series || "", score: e.final_score || "", champ: c, loser: r, quality: hi + 2 * lo, diff: c.rating - r.rating };
    });

    var sorted, note, mode;
    switch (rankType) {
      case "best-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by end-of-playoffs rating. The strongest teams ever to win a World Series.";
        mode = "team-vs-opp"; break;
      case "worst-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by end-of-playoffs rating. The weakest teams ever to win a World Series.";
        mode = "team-vs-opp"; break;
      case "best-losers":
        sorted = rows.slice().sort(function (a, b) { return b.loser.rating - a.loser.rating; }).slice(0, 10);
        note = "Top 10 runner-ups by end-of-playoffs rating. The strongest teams ever to lose a World Series.";
        mode = "loser-vs-champ"; break;
      case "worst-losers":
        sorted = rows.slice().sort(function (a, b) { return a.loser.rating - b.loser.rating; }).slice(0, 10);
        note = "Bottom 10 runner-ups by end-of-playoffs rating. The weakest teams ever to lose a World Series.";
        mode = "loser-vs-champ"; break;
      case "best-bat-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by Batting rating. The most explosive offenses ever to win a World Series.";
        mode = "team-vs-opp"; break;
      case "worst-bat-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by Batting rating. The weakest offenses ever to ride a championship pitching staff.";
        mode = "team-vs-opp"; break;
      case "best-pit-champs":
        sorted = rows.slice().sort(function (a, b) { return b.champ.rating - a.champ.rating; }).slice(0, 10);
        note = "Top 10 champions by Pitching rating. The most dominant staffs ever to win a World Series.";
        mode = "team-vs-opp"; break;
      case "worst-pit-champs":
        sorted = rows.slice().sort(function (a, b) { return a.champ.rating - b.champ.rating; }).slice(0, 10);
        note = "Bottom 10 champions by Pitching rating. The weakest staffs ever to win on the back of an elite lineup.";
        mode = "team-vs-opp"; break;
      case "best-matchup":
        sorted = rows.slice().sort(function (a, b) { return b.quality - a.quality; }).slice(0, 10);
        note = "Top 10 by pre-WS matchup quality. Formula: max(Rating) + 2 × min(Rating), which weights the weaker team double to reward balanced strength over one-sided star power.";
        mode = "matchup"; break;
      case "worst-matchup":
        sorted = rows.slice().sort(function (a, b) { return a.quality - b.quality; }).slice(0, 10);
        note = "Bottom 10 by pre-WS matchup quality. Formula: max(Rating) + 2 × min(Rating), which weights the weaker team double to penalise lopsided matchups over evenly-mediocre ones.";
        mode = "matchup"; break;
      case "closest":
        sorted = rows.slice().sort(function (a, b) { return Math.abs(a.diff) - Math.abs(b.diff); }).slice(0, 10);
        note = "Top 10 by smallest pre-WS rating gap. Signed diff is from the champion's POV (negative = upset).";
        mode = "spread"; break;
      case "blowout":
        sorted = rows.slice().sort(function (a, b) { return Math.abs(b.diff) - Math.abs(a.diff); }).slice(0, 10);
        note = "Top 10 by largest pre-WS rating gap. The biggest predicted mismatches, regardless of who actually won.";
        mode = "spread"; break;
      case "upset":
        sorted = rows.filter(function (r) { return r.diff < 0; }).sort(function (a, b) { return a.diff - b.diff; });
        note = sorted.length + " World Series where the model picked the loser by pre-WS rating. Sorted from biggest upset down.";
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
    '<th class="col-champ col-hide-mobile col-rank">Rank</th>' +
    '<th class="col-champ">Rating</th>' +
    '<th class="col-champ col-hide-mobile col-record">W-L</th>' +
    '<th class="divider-col">Series<div class="sub-line">(Last game)</div></th>' +
    '<th class="col-ru">Runner-Up</th>' +
    '<th class="col-ru col-hide-mobile col-rank">Rank</th>' +
    '<th class="col-ru">Rating</th>' +
    '<th class="col-ru col-hide-mobile col-record">W-L</th>';

  function pairRow(e, isPairEnd) {
    var rowClass = isPairEnd ? ' class="row-group-end"' : "";
    // Pair rows use EOS rating (canonical "how good they were that year" measure).
    return (
      "<tr" + rowClass + ">" +
      rankSeasonCell(e) +
      rankTeamBlock(eosView(e.champion), "col-champ", e.season, false) +
      '<td class="divider-col">' + (e.series || "") +
      (e.final_score ? '<div class="sub-line">(' + e.final_score + ")</div>" : "") + "</td>" +
      rankTeamBlock(eosView(e.runner_up), "col-ru", e.season, false) +
      "</tr>"
    );
  }

  function renderRepeatChamps() {
    var entries = (state.championsData.MLB || []).slice().sort(function (a, b) { return a.season - b.season; });
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
    var entries = (state.championsData.MLB || [])
      .filter(function (e) { return e.champion && e.runner_up && e.champion.ps_end_rating != null && e.runner_up.ps_end_rating != null; })
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
    historyRankNote.textContent = groups.length + " World Series rematch groups (" + totalMeetings + " total meetings). A group continues as long as the same two teams meet again within " + REMATCH_GAP_THRESHOLD + " years.";
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
    var rows = (state.championsData.MLB || [])
      .filter(function (e) { return e.champion && e.champion.ps_end_rating != null && e.champion.rs_end_rating != null; })
      .map(function (e) {
        var c = e.champion;
        return { e: e, c: c, rs: c.rs_end_rating, ps: c.ps_end_rating, leap: c.ps_end_rating - c.rs_end_rating };
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
        '<td class="col-hide-mobile col-record">' + fmtRecordStacked(c.rs_record, c.ps_record) + "</td>" +
        '<td class="rating-cell">' + r.rs.toFixed(2) + " &rarr; " + r.ps.toFixed(2) + "</td>" +
        '<td class="sort-col rating-cell">' + sign + r.leap.toFixed(2) + "</td>" +
        "</tr>"
      );
    }).join("");
    historyRankTableWrap.innerHTML =
      '<table class="sport-table sport-table-narrow"><thead><tr>' +
      '<th class="col-rank">#</th><th class="col-rank">Season</th><th>Champion</th><th class="col-hide-mobile col-record">W-L</th>' +
      '<th>Rating<div class="sub-line">Season &rarr; Playoffs</div></th><th class="sort-col">Rating Increase</th>' +
      "</tr></thead><tbody>" + body + "</tbody></table>";
    attachLinks(historyRankTableWrap);
  }

  function renderTitleOddsList(direction) {
    var rows = (state.championsData.MLB || [])
      .filter(function (e) { return e.champion && e.champion.rs_end_title_odds != null; })
      .map(function (e) { return { e: e, c: e.champion, odds: e.champion.rs_end_title_odds }; })
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
      var oddsRank = c.rs_end_title_odds_rank != null ? String(c.rs_end_title_odds_rank) : "-";
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        rankSeasonCell(r.e) +
        teamTd +
        '<td class="col-hide-mobile col-record">' + fmtRecordStacked(c.rs_record, c.ps_record) + "</td>" +
        '<td class="col-hide-mobile col-rank sport-dim-rank">' + oddsRank + "</td>" +
        '<td class="sort-col rating-cell">' + (r.odds * 100).toFixed(1) + "%</td>" +
        "</tr>"
      );
    }).join("");
    historyRankTableWrap.innerHTML =
      '<table class="sport-table sport-table-narrow"><thead><tr>' +
      '<th class="col-rank">#</th><th class="col-rank">Season</th><th>Champion</th><th class="col-hide-mobile col-record">W-L</th>' +
      '<th class="col-hide-mobile col-rank">Odds rank</th><th class="sort-col">Title odds</th>' +
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
      return { data: state.goatData[state.goatMode === "rs" ? "rs_o" : "ps_o"], field: "rating_o", header: "Batting" };
    }
    if (state.goatMetric === "d") {
      return { data: state.goatData[state.goatMode === "rs" ? "rs_d" : "ps_d"], field: "rating_d", header: "Pitching" };
    }
    return { data: state.goatData[state.goatMode], field: "rating", header: "Rating" };
  }

  function renderGoat() {
    var pick = goatPick();
    var GOAT_METRICS = [
      { field: "rating", label: "Rating" },
      { field: "rating_o", label: "BAT" },
      { field: "rating_d", label: "PIT" },
    ];
    var data = pick.data;
    if (!data) return;
    goatNoteEl.textContent = "Top " + data.length + " single-season ratings · " +
      (state.goatMode === "rs" ? "end of regular season, all teams" : "end of playoffs, champions only");
    var teams = state.goatConf === "ALL" ? data : data.filter(function (t) { return t.league === state.goatConf; });
    updateDisruptedNote("goatDisrupted", teams.map(function (t) { return t.season; }));
    var barSc = barScale(teams.map(function (t) { return t[pick.field]; }));

    var rows = teams.map(function (t) {
      var badge = finishBadge(t.finals_status);
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
        '<td class="col-rank linked" data-season-link="' + t.season + '">' + t.season + seasonTag(t.season) + "</td>" +
        teamTd +
        '<td class="col-hide-mobile col-conf">' + leagueBadge(t.league, t.finals_status, t.division, t.division_winner) + "</td>" +
        '<td class="col-hide-mobile col-record">' + fmtRecordStacked(t.regular_record, t.playoff_record) + "</td>" +
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
      '<th class="col-hide-mobile col-conf">League</th><th class="col-hide-mobile col-record">W-L</th>' +
      headerCells +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildPills("goatConfPills", state.goatConf, function (v) { state.goatConf = v; renderGoat(); }, [
    { value: "ALL", label: "All" }, { value: "AL", label: "AL" }, { value: "NL", label: "NL" },
  ]);
  buildPills("goatMetricPills", state.goatMetric, function (v) { state.goatMetric = v; renderGoat(); }, [
    { value: "react", label: "Rating (overall)" }, { value: "o", label: "Batting only" }, { value: "d", label: "Pitching only" },
  ]);
  buildPills("goatModePills", state.goatMode, function (v) { state.goatMode = v; renderGoat(); }, [
    { value: "rs", label: "End of regular season" }, { value: "ps", label: "End of playoffs" },
  ]);

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
  tsDateTypeSelect.hidden = false;

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
    // Latest season first
    var seasons = data.seasons.slice().sort(function (a, b) { return b - a; });
    seasonSelect.innerHTML = seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
    seasonSelect.value = String(seasons[0]);
    buildPills("mlbConfPills", state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); }, [
      { value: "ALL", label: "All" }, { value: "AL", label: "AL" }, { value: "NL", label: "NL" },
    ]);
    loadSeason(seasons[0]);
    loadChampions();
    loadGoat();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
