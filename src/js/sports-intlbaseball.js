(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 4, BAR_CAP = 11;

  var CONF_OPTIONS = [
    { value: "Asia", label: "🌏 Asia" },
    { value: "Americas", label: "🌎 Americas" },
    { value: "Europe", label: "🇪🇺 Europe" },
    { value: "Africa", label: "🌍 Africa" },
    { value: "Oceania", label: "🌏 Oceania" },
  ];

  // International baseball has no continental championships, so all four
  // global events live in one row. 👑 marks the global pinnacle (World
  // Baseball Classic); 🏆 for the rest (handled per-tournament in
  // renderLeagueHistory).
  var HISTORY_WORLD = [
    { value: "World Baseball Classic", label: "👑 World Baseball Classic" },
    { value: "Olympics", label: "🏆 Olympics" },
    { value: "WBSC Premier12", label: "🏆 WBSC Premier12" },
    { value: "Baseball World Cup", label: "🏆 Baseball World Cup" },
  ];

  var state = {
    seasonsIndex: null,
    seasonData: null,
    currentSnapshot: null,
    standingsConf: "all",
    teamsIndex: null,
    nameToSlug: {},
    teamCache: {},
    tsConf: "all",
    tsView: "cross",
    historyTourny: "World Baseball Classic",
    championsData: null,
    goatData: null,
    goatConf: "all",
  };

  // ── formatting helpers, ported 1:1 from ICHIRO's docs/index.html ──────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  // Namespaced badge- classes (badge-ib-*) so this site's own confederation
  // color choices never collide with CARMELO's identically-named
  // confederations that picked different colors (e.g. CARMELO's Europe is
  // red, ICHIRO's is yellow) - both are legitimate per-site "flag" choices,
  // not something that needs to match across the international fleet.
  var CONF_BADGE_CLS = { Asia: "badge-ib-Asia", Americas: "badge-ib-Americas", Europe: "badge-ib-Europe", Africa: "badge-ib-Africa", Oceania: "badge-ib-Oceania" };
  var CONF_BADGE_LABEL = { Asia: "🌏 Asia", Americas: "🌎 Americas", Europe: "🇪🇺 Europe", Africa: "🌍 Africa", Oceania: "🌏 Oceania" };

  function confederationBadge(confed, wonContinental) {
    if (!confed) return "";
    if (wonContinental) {
      return '<span class="finish-badge finish-champion" title="' + confed + ' Continental Champion">' + confed + " 🏆</span>";
    }
    var cls = CONF_BADGE_CLS[confed] || "badge-Other";
    var label = CONF_BADGE_LABEL[confed] || confed;
    return '<span class="league-badge ' + cls + '">' + label + "</span>";
  }

  // Country Summary uses a simpler gold-pill / plain-pill (no per-confederation color).
  function confBadge(conf, wonContinental) {
    if (!conf) return "";
    if (wonContinental) {
      return '<span class="finish-badge finish-champion" title="' + conf + ' Continental Champion">' + conf + " 🏆</span>";
    }
    return '<span class="finish-badge conf-pill">' + conf + "</span>";
  }

  // 👑 reserved for World Baseball Classic gold (the premier global
  // championship); 🏆 for Olympic / Premier12 / Baseball World Cup gold.
  function finishBadge(finishes) {
    if (!finishes || !finishes.length) return "";
    function cls(f) { return f === 1 ? "finish-champion" : f === 2 ? "finish-runner" : "finish-bronze"; }
    function medal(x) {
      if (x.finish === 1) return x.tournament === "WBC" ? "👑" : "🏆";
      if (x.finish === 2) return "🥈";
      return "🥉";
    }
    return finishes.map(function (x) {
      return '<span class="finish-badge ' + cls(x.finish) + '">' + x.tournament + " " + medal(x) + "</span>";
    }).join(" ");
  }

  function resultClass(match, isStale) {
    if (!match) return "";
    var first = match[0];
    var suffix = isStale ? "-stale" : "";
    if (first === "W") return "result-W" + suffix;
    if (first === "L") return "result-L" + suffix;
    return "";
  }

  var PLACEHOLDER_LM = ["No match yet", "No competitive match yet", "No Game", "Bye / No Game"];
  function displayMatch(s) {
    return !s || PLACEHOLDER_LM.indexOf(s) !== -1 ? "" : s;
  }

  var LAST_MATCH_RE = /^([WL])\s+(\d+\s*-\s*\d+)\s+(vs\.?(?:\s*\(N\))?|@)\s+(.+?)\s*(\([^)]+\))?\s*$/;

  // ICHIRO format: "W 6-1 vs. Venezuela (WBSC Premier12)" - full tournament tag
  // preserved. Opponent country names match teamsIndex; they become deep-links.
  function renderLastMatch(raw, season, isStale, tsViewLink) {
    var display = displayMatch(raw);
    if (!display) return "-";
    var rc = resultClass(raw, isStale);
    var m = display.match(LAST_MATCH_RE);
    if (!m) return '<span class="' + rc + '">' + display + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4], comp = m[5];
    var slug = state.nameToSlug[opponent.trim()];
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '"' +
        (tsViewLink ? ' data-ts-view="' + tsViewLink + '"' : "") + ">" + opponent + "</span>"
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

  function buildConfPills(containerId, includeAll, current, onSelect) {
    var opts = includeAll
      ? [{ value: "all", label: "All Confederations" }].concat(CONF_OPTIONS)
      : CONF_OPTIONS;
    buildPillsFromOpts(containerId, opts, current, onSelect);
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

  // Valid Standings confederation pill values (excludes 'all').
  var STANDINGS_CONFS = {};
  CONF_OPTIONS.forEach(function (o) { STANDINGS_CONFS[o.value] = true; });

  function seasonLinkClick(season, targetConf) {
    if (!season) return;
    activateTab("standings");
    if (targetConf && STANDINGS_CONFS[targetConf]) {
      state.standingsConf = targetConf;
      buildConfPills("ibConfPills", true, state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
    }
    seasonSelect.value = season;
    loadSeason(Number(season));
  }

  function teamLinkClick(slug, season, viewOverride) {
    if (!slug) return;
    activateTab("team-summary");
    var t = state.teamsIndex && state.teamsIndex.filter(function (x) { return x.slug === slug; })[0];
    state.tsConf = t ? t.confederation : "all";
    buildConfPills("tsConfPills", false, state.tsConf, function (v) {
      state.tsConf = v;
      populateTeams(v);
      tsChartWrap.hidden = true;
      tsTableWrap.innerHTML = '<p class="sport-loading">Select a country above</p>';
      tsSeasonSelect.innerHTML = "";
    });
    populateTeams(state.tsConf);
    tsTeamSelect.value = slug;
    var isTourneyView = viewOverride && viewOverride !== "single" && viewOverride !== "cross";
    var wantSingle = !isTourneyView && season != null && season !== "";
    state.tsView = isTourneyView ? viewOverride : (wantSingle ? "single" : "cross");
    buildPillsFromOpts("tsViewPills", [
      { value: "cross", label: "Yearly summary" },
      { value: "single", label: "All games within one year" },
      { value: "wbc", label: "WBC" },
    ], state.tsView, function (v) {
      state.tsView = v;
      tsSeasonSelect.hidden = v !== "single";
      tsDateTypeSelect.hidden = v !== "cross";
      renderTeamTable();
    });
    tsSeasonSelect.hidden = state.tsView !== "single";
    tsDateTypeSelect.hidden = state.tsView !== "cross";
    loadTeam(slug).then(function () {
      if (wantSingle) {
        var targetVal = String(season);
        var hasOpt = Array.prototype.some.call(tsSeasonSelect.options, function (o) { return o.value === targetVal; });
        if (hasOpt) tsSeasonSelect.value = targetVal;
      }
      renderTeamTable();
    });
  }

  // International baseball events are all global (multi-confederation), so a
  // year-click never carries a confederation through to Standings.
  function tournamentConf() {
    return "";
  }

  function attachLinks(root) {
    root.querySelectorAll(".team-cell.linked, .team-link.linked").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        teamLinkClick(el.dataset.teamSlug, el.dataset.season, el.dataset.tsView);
      });
    });
    root.querySelectorAll("[data-season-link].linked").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        seasonLinkClick(el.dataset.seasonLink, el.dataset.targetConf);
      });
    });
  }

  // ── tabs ─────────────────────────────────────────────────────────────────

  document.getElementById("ibTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("ibSeason");
  var dateSelect = document.getElementById("ibDate");
  var countEl = document.getElementById("ibCount");
  var standingsTableWrap = document.getElementById("ibStandingsTable");
  var dateRangeEl = document.getElementById("ibDateRange");

  function renderStandings() {
    if (!state.currentSnapshot) return;
    var confed = state.standingsConf;

    // Confederation rank: position within each confederation (sorted by OVR rank)
    var confRankMap = {};
    var confCounter = {};
    state.currentSnapshot.teams.forEach(function (t) {
      confCounter[t.confederation] = (confCounter[t.confederation] || 0) + 1;
      confRankMap[t.team] = confCounter[t.confederation];
    });

    var teams = state.currentSnapshot.teams;
    if (confed !== "all") teams = teams.filter(function (t) { return t.confederation === confed; });

    var snaps = state.seasonData.snapshots;
    var idx = -1;
    snaps.forEach(function (s, i) { if (s.date === state.currentSnapshot.date) idx = i; });
    var prevDate = idx > 0 ? snaps[idx - 1].date : null;
    var season = state.seasonData.season;

    countEl.textContent = teams.length + " team" + (teams.length !== 1 ? "s" : "");

    var barSc = barScale(teams.map(function (t) { return t.rating; }));

    var rows = teams.map(function (t) {
      var cRank = confRankMap[t.team] || "-";
      var isStale = !!(prevDate && t.last_match_date && t.last_match_date <= prevDate);
      var slug = state.nameToSlug[t.team];
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + t.team;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + cellInner + "</td>"
        : '<td class="team-cell">' + cellInner + "</td>";
      return (
        "<tr>" +
        '<td class="col-rank">' + (t.rank != null ? t.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + cRank + "</td>" +
        teamTd +
        "<td>" + confederationBadge(t.confederation, !!t.continental_winner) + "</td>" +
        '<td class="col-record">' + (t.record || "-") + "</td>" +
        "<td>" + ratingBar(t.rating, barSc) + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(t.last_match, season, isStale) + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px;color:var(--muted);white-space:nowrap">' + (t.last_match_date || "") + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.tournament_finishes) + "</td>" +
        "</tr>"
      );
    }).join("");

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      '<th>Country</th><th>Conf</th><th class="col-record">W-L</th><th>Rating</th>' +
      '<th class="col-last-match">Last Game</th>' +
      '<th class="col-hide-mobile">Date</th>' +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  function populateDateSelect() {
    var snaps = state.seasonData.snapshots;
    // Tournament-end snapshots first (sorted by prestige), then a separator, then all dates.
    var labeled = snaps.filter(function (s) { return s.label != null; })
      .slice().sort(function (a, b) { return (a.prestige != null ? a.prestige : 99) - (b.prestige != null ? b.prestige : 99); });
    var options = labeled.map(function (s) {
      return '<option value="' + s.date + '">' + s.date + " | " + s.label + "</option>";
    });
    if (labeled.length) options.push('<option disabled>──────────</option>');
    options = options.concat(snaps.slice().reverse().map(function (s) {
      return '<option value="' + s.date + '">' + s.date + "</option>";
    }));
    dateSelect.innerHTML = options.join("");

    // Default: highest-prestige tournament end for complete years; latest
    // snapshot for the current calendar year (in-progress).
    var isCurrentYear = state.seasonData.season === new Date().getFullYear();
    var defaultDate = (!isCurrentYear && labeled.length) ? labeled[0].date : snaps[snaps.length - 1].date;
    selectSnapshot(defaultDate);
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

  // ═══════════════════════════════ Country Summary ═══════════════════════════════

  var tsTeamSelect = document.getElementById("tsTeamSelect");
  var tsSeasonSelect = document.getElementById("tsSeasonSelect");
  var tsDateTypeSelect = document.getElementById("tsDateTypeSelect");
  var tsChartWrap = document.getElementById("tsChartWrap");
  var tsChart = document.getElementById("tsChart");
  var tsTableWrap = document.getElementById("tsTableWrap");

  function populateTeams(confederation) {
    tsTeamSelect.innerHTML = '<option value="">- Select a country -</option>';
    if (!state.teamsIndex) { tsTeamSelect.disabled = true; return; }
    var list = (!confederation || confederation === "all")
      ? state.teamsIndex.slice()
      : state.teamsIndex.filter(function (t) { return t.confederation === confederation; });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    list.forEach(function (t) {
      var priors = t.historical_names || [];
      var baseLabel = t.flag ? t.flag + " " + t.name : t.name;
      var label = priors.length ? baseLabel + " (" + priors.join(" / ") + ")" : baseLabel;
      tsTeamSelect.innerHTML += '<option value="' + t.slug + '">' + label + "</option>";
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

  // WBC finish medal on its own line atop the record cell: 👑 champion,
  // 🥈 runner-up, 🥉 third. Mirrors finishBadge's glyphs.
  function wbcMedal(finishes) {
    var w = (finishes || []).filter(function (x) { return x.tournament === "WBC"; })[0];
    if (!w) return "";
    return w.finish === 1 ? "👑" : w.finish === 2 ? "🥈" : w.finish === 3 ? "🥉" : "";
  }

  // WBC edition record cell, top to bottom: finish medal on its own line
  // (omitted with no top-3 / in progress), POOL W-L (primary), KNOCKOUT W-L
  // (dimmed sub-line, omitted before the knockout round). Baseball has no
  // draws/points, so records are plain W-L.
  function fmtWbcRecord(r, finishes) {
    if (!r) return "0-0";
    var e = wbcMedal(finishes);
    var medalLine = e ? '<div style="line-height:1.3">' + e + "</div>" : "";
    var koLine = (r.k_w + r.k_l) ? '<div class="sub-line">' + r.k_w + "-" + r.k_l + "</div>" : "";
    return medalLine + r.p_w + "-" + r.p_l + koLine;
  }

  // World Baseball Classic view: the selected country's OWN rank·rating walk
  // across the edition, rendered as an offset "stairstep" beside the game
  // list. The walk has N+1 boundary nodes (pre-tournament .. post-final) for
  // N games. Both columns use fixed WC_ROW-tall rows; the games cell is
  // pushed down half a row (wcMatchesCell) so each game lands in the GAP
  // between the two walk nodes it sits between - the node below a game is
  // the rating going IN, the node above is the rating coming OUT. Per-node
  // delta is measured against the chronologically prior boundary: teal for a
  // rating gain, pink for a drop (mirrors the season chart's +D/-D palette);
  // the arrow shows rank movement.
  var WC_ROW = 30; // px - fixed height of every walk node AND game row
  var WC_PAD = 9;  // px - shared top baseline; set inline on BOTH cells so the
                   // half-row offset is exact and mobile-proof

  function wcWalkCell(walk) {
    var nodes = (walk || []).slice().reverse(); // top = end of WBC, bottom = pre-WBC
    var html = nodes.map(function (w, d) {
      var below = nodes[d + 1]; // the chronologically earlier boundary
      var delta = "";
      if (below && w.g != null && below.g != null) {
        var dr = parseFloat((w.g - below.g).toFixed(2));
        var dk = (below.r != null && w.r != null) ? below.r - w.r : null; // + => rank improved
        var arrow = dk == null ? "" : dk > 0 ? "▲" + dk : dk < 0 ? "▼" + (-dk) : "–";
        var col = dr > 0 ? "var(--accent)" : dr < 0 ? "var(--accent-2)" : "var(--muted)";
        delta = '<span style="color:' + col + ';font-size:0.82em;margin-left:5px">' + arrow + " " + (dr > 0 ? "+" : "") + dr.toFixed(2) + "</span>";
      }
      var val = (w.r != null)
        ? '<span style="font-variant-numeric:tabular-nums">#' + w.r + " · " + w.g.toFixed(2) + "</span>"
        : '<span style="color:var(--muted)">–</span>';
      return '<div style="height:' + WC_ROW + 'px;display:flex;align-items:center;white-space:nowrap">' + val + delta + "</div>";
    }).join("");
    return '<td style="white-space:nowrap;vertical-align:top;font-size:12px;color:var(--muted);padding-top:' + WC_PAD + 'px">' + html + "</td>";
  }

  function wcMatchesCell(g) {
    var ms = ((g.wbc_record && g.wbc_record.matches) || []).slice().reverse();
    var html = ms.map(function (mm) {
      var date = mm.d ? '<span style="color:var(--muted);font-size:0.85em;margin-right:8px;font-variant-numeric:tabular-nums">' + mm.d + "</span>" : "";
      var opp = (mm.r != null) ? ' <span style="color:var(--muted);font-size:0.85em">#' + mm.r + " · " + mm.g.toFixed(2) + "</span>" : "";
      // Wrap game + opp in ONE inline span: in this flex row a bare whitespace
      // text node between two flex items is dropped, which would kill the
      // space before the opponent rank. Inside a single span it renders normally.
      return '<div style="height:' + WC_ROW + 'px;display:flex;align-items:center;white-space:nowrap">' + date +
        "<span>" + renderLastMatch(mm.s, g.season, false, "wbc") + opp + "</span></div>";
    }).join("");
    // baseline + half a row offsets the games DOWN so each lands between two walk nodes
    return '<td class="col-last-match" style="padding-top:' + (WC_PAD + WC_ROW / 2) + 'px;vertical-align:top">' + html + "</td>";
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
    } else if (state.tsView === "wbc") {
      seasonFilter = "all";
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (g.wbc_record) rows.push(Object.assign({}, g, { season: s }));
        });
      });
      if (rows.length === 0) {
        tsChartWrap.hidden = true;
        tsTableWrap.innerHTML = '<p class="sport-loading">No World Baseball Classic appearances in the rating era</p>';
        return;
      }
    } else {
      seasonFilter = "all";
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (g.is_year_anchor === 1) rows.push(Object.assign({}, g, { season: s }));
        });
      });
    }

    drawChart(rows, seasonFilter);

    var isWbc = state.tsView === "wbc";
    var targetConf = data.confederation || "";
    var canonical = data.team;
    var barSc = barScale(rows.slice().reverse().filter(function (g) { return g.rank != null; }).map(function (g) { return g.rating; }));
    var tableRows = rows.slice().reverse().map(function (g) {
      var dateLabel = g.year_anchor_label || "";
      var dateCell = dateLabel ? g.date + '<div class="sub-line-italic">' + dateLabel + "</div>" : g.date;
      var era = (g.display_name && g.display_name !== canonical) ? g.display_name : "";
      var seasonCell = era ? g.season + '<div class="sub-line-italic">' + era + "</div>" : g.season;
      return (
        "<tr>" +
        '<td class="col-rank linked" data-season-link="' + g.season + '" data-target-conf="' + targetConf + '" style="text-align:center">' + seasonCell + "</td>" +
        (isWbc ? "" : '<td class="col-hide-mobile">' + dateCell + "</td>") +
        (isWbc ? wcWalkCell(g.wbc_record && g.wbc_record.team_walk) + wcMatchesCell(g) : '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>") +
        (isWbc ? '<td class="col-record">' + fmtWbcRecord(g.wbc_record, g.tournament_finishes) + "</td>" : "") +
        '<td class="col-rank">' + (g.rank != null ? g.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (g.conf_rank != null ? g.conf_rank : "-") + "</td>" +
        "<td>" + (g.rank != null ? ratingBar(g.rating, barSc) : '<span style="color:var(--muted)">-</span>') + "</td>" +
        '<td class="col-hide-mobile col-conf">' + confBadge(data.confederation, g.continental_winner) + "</td>" +
        (isWbc ? "" : '<td class="col-hide-mobile">' + finishBadge(g.tournament_finishes) + "</td>") +
        "</tr>"
      );
    }).join("");

    tsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Year</th>' + (isWbc ? "" : '<th class="col-hide-mobile">Date</th>') +
      (isWbc ? '<th>Rating Evolution<div class="sub-line">Rank · Rating</div></th>' : "") +
      "<th>" + (isWbc ? 'Games<div class="sub-line">opponent rank · rating prior to game</div>' : "Last Game") + "</th>" +
      (isWbc ? '<th>Pool W-L<div class="sub-line">Knockout W-L</div></th>' : "") +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      "<th>" + (isWbc ? "Final Rating" : "Rating") + "</th>" +
      '<th class="col-hide-mobile col-conf">Conf</th>' +
      (isWbc ? "" : '<th class="col-hide-mobile">Honors</th>') +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(tsTableWrap);
  }

  // Hand-rolled SVG rating-over-time chart, ported from ICHIRO's drawChart().
  // No trophy markers - the WBC view's own rank/rating walk already carries
  // that context.
  function drawChart(rows, seasonFilter) {
    if (rows.length < 2) { tsChartWrap.hidden = true; return; }
    tsChartWrap.hidden = false;

    var W = tsChart.parentElement.clientWidth - 32;
    var H = 180;
    tsChart.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 4, D_CAP = 11;
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

  // ═══════════════════════════════ Tournaments (League History) ═══════════════════════════════

  var historyTableWrap = document.getElementById("historyTableWrap");

  function loadChampions() {
    return fetch(BASE + "/champions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.championsData = data;
        renderLeagueHistory(state.historyTourny);
      })
      .catch(function () {
        historyTableWrap.innerHTML = '<p class="sport-error">Could not load tournaments</p>';
      });
  }

  function renderLeagueHistory(league) {
    if (!state.championsData || !league) return;
    var entries = state.championsData[league] || [];
    if (!entries.length) {
      historyTableWrap.innerHTML = '<p class="sport-loading">No data for this competition</p>';
      return;
    }

    // 👑 reserved for WBC gold counts (the global pinnacle); 🏆 elsewhere.
    var champEmoji = league === "World Baseball Classic" ? "👑" : "🏆";

    function teamCell(t, bg, season, preRated) {
      if (!t) return '<td class="' + bg + '" colspan="4" style="text-align:center;color:var(--muted)">-</td>';
      var countStr = "";
      if (t.title_count) countStr = ' <span class="dim-pct">(' + t.title_count + " " + champEmoji + ")</span>";
      else if (t.runner_up_count) countStr = ' <span class="dim-pct">(' + t.runner_up_count + " 🥈)</span>";
      else if (t.third_count) countStr = ' <span class="dim-pct">(' + t.third_count + " 🥉)</span>";
      // Edition W-L sub-line: the medalist's record within this specific edition.
      var wlStr = t.wl ? '<div class="sub-line">' + t.wl + "</div>" : "";
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + t.team + countStr + wlStr;
      if (preRated) {
        return (
          '<td class="' + bg + ' team-cell" style="white-space:nowrap">' + cellInner + "</td>" +
          '<td class="' + bg + ' col-hide-mobile sport-dim-dash" style="text-align:center">-</td>' +
          '<td class="' + bg + ' col-hide-mobile sport-dim-dash" style="text-align:center">-</td>' +
          '<td class="' + bg + ' rating-cell sport-dim-dash">-</td>'
        );
      }
      var rating = t.rating != null ? t.rating.toFixed(2) : "-";
      var ovrRank = t.rank != null ? String(t.rank) : "-";
      var confRank = t.conf_rank != null ? String(t.conf_rank) : "-";
      var slug = state.nameToSlug[t.team];
      var teamTd = slug
        ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '" style="white-space:nowrap">' + cellInner + "</td>"
        : '<td class="' + bg + ' team-cell" style="white-space:nowrap">' + cellInner + "</td>";
      return (
        teamTd +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + ovrRank + "</td>" +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + confRank + "</td>" +
        '<td class="' + bg + ' rating-cell">' + rating + "</td>"
      );
    }

    // International baseball events are all global, so a year-click never
    // carries a confederation through to Standings.
    var targetConf = tournamentConf();

    var anyPreRated = false;
    var rows = entries.map(function (e) {
      var preRated = !!e.pre_rated;
      if (preRated) anyPreRated = true;
      var hostStr = e.host_flags ? ' <span style="font-size:0.85em">' + e.host_flags + "</span>" : "";
      var sbSuffix = preRated ? ' <sup class="sport-dagger">†</sup>' : "";
      var yearTd = preRated
        ? '<td class="season-cell" style="white-space:nowrap">' + e.season + hostStr + sbSuffix + "</td>"
        : '<td class="season-cell linked" data-season-link="' + e.season + '" data-target-conf="' + targetConf + '" style="white-space:nowrap">' + e.season + hostStr + "</td>";
      var rowStyle = preRated ? ' style="background:color-mix(in srgb, var(--fg) 3%, transparent)"' : "";
      return (
        "<tr" + rowStyle + ">" +
        yearTd +
        teamCell(e.champion, "col-champ", e.season, preRated) +
        teamCell(e.runner_up, "col-ru", e.season, preRated) +
        teamCell(e.third, "col-ru", e.season, preRated) +
        "</tr>"
      );
    }).join("");

    var footnote = anyPreRated
      ? '<p class="sport-note"><sup>†</sup> Editions before ICHIRO ratings begin (or with incomplete game data). Podium shown for completeness; ratings are not available at these editions\' final dates.</p>'
      : "";

    historyTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      "<th>Year</th>" +
      '<th class="col-champ">Gold</th>' +
      '<th class="col-champ col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-champ col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-champ">Rating</th>' +
      '<th class="col-ru">Silver</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-ru">Rating</th>' +
      '<th class="col-ru">Bronze</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-ru">Rating</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
    attachLinks(historyTableWrap);
  }

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  var goatTableWrap = document.getElementById("goatTableWrap");

  function loadGoat() {
    return fetch(BASE + "/goat_teams.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.goatData = data;
        renderGoat();
      })
      .catch(function () {
        goatTableWrap.innerHTML = '<p class="sport-error">Could not load GOAT table</p>';
      });
  }

  function renderGoat() {
    if (!state.goatData) return;
    var teams = state.goatConf === "all" ? state.goatData : state.goatData.filter(function (t) { return t.confederation === state.goatConf; });

    var barSc = barScale(teams.map(function (t) { return t.rating; }));
    var rows = teams.map(function (t) {
      var slug = state.nameToSlug[t.team];
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + t.team;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + t.season + '">' + cellInner + "</td>"
        : '<td class="team-cell">' + cellInner + "</td>";
      var targetConf = (state.goatConf !== "all" ? state.goatConf : t.confederation) || "";
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="season-cell linked" data-season-link="' + t.season + '" data-target-conf="' + targetConf + '" style="text-align:center">' + t.season + "</td>" +
        teamTd +
        "<td>" + confederationBadge(t.confederation, !!t.continental_winner) + "</td>" +
        "<td>" + ratingBar(t.rating, barSc) + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.tournament_finishes) + "</td>" +
        "</tr>"
      );
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">All time rank</th>' +
      '<th style="text-align:center">Year</th>' +
      "<th>Country</th><th>Conf</th><th>Rating</th>" +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildConfPills("goatConfPills", true, state.goatConf, function (v) { state.goatConf = v; renderGoat(); });

  var onHistoryPick = function (v) { state.historyTourny = v; renderLeagueHistory(v); };
  buildPillsFromOpts("historyWorldPills", HISTORY_WORLD, state.historyTourny, onHistoryPick);

  buildConfPills("ibConfPills", true, state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
  buildConfPills("tsConfPills", false, state.tsConf, function (v) {
    state.tsConf = v;
    populateTeams(v);
    tsChartWrap.hidden = true;
    tsTableWrap.innerHTML = '<p class="sport-loading">Select a country above</p>';
    tsSeasonSelect.innerHTML = "";
  });
  buildPillsFromOpts("tsViewPills", [
    { value: "cross", label: "Yearly summary" },
    { value: "single", label: "All games within one year" },
    { value: "wbc", label: "WBC" },
  ], state.tsView, function (v) {
    state.tsView = v;
    tsSeasonSelect.hidden = v !== "single";
    tsDateTypeSelect.hidden = v !== "cross";
    renderTeamTable();
  });
  tsSeasonSelect.hidden = true;

  // ═══════════════════════════════ init ═══════════════════════════════

  // Load teams_index first so opponent/slug lookups are populated before any
  // table renders - avoids a double-render flash on initial page load.
  Promise.all([
    fetch(BASE + "/seasons_index.json").then(function (r) { return r.json(); }),
    loadTeamsIndex(),
  ]).then(function (results) {
    var data = results[0];
    state.seasonsIndex = data;
    dateRangeEl.textContent = "Ratings include games from " + fmtDate(data.first_date) + " to " + fmtDate(data.last_date);
    seasonSelect.innerHTML = data.seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
    seasonSelect.value = String(data.seasons[0]);
    populateTeams(state.tsConf);
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load standings</p>';
  });
})();
