(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var BAR_D = 2.5, BAR_CAP = 6;

  var CONF_OPTIONS = [
    { value: "UEFA", label: "🇪🇺 UEFA" },
    { value: "CONMEBOL", label: "🌎 CONMEBOL" },
    { value: "CONCACAF", label: "🌎 CONCACAF" },
    { value: "AFC", label: "🌏 AFC" },
    { value: "CAF", label: "🌍 CAF" },
    { value: "OFC", label: "🌏 OFC" },
  ];
  // "Other Tournaments" tab: two independent pill groups (NOT CARMELO's
  // world+continental split) - continental majors vs. nations-league
  // competitions. FIFA World Cup lives in its own top-level tab. Several
  // tournaments with real champions.json data (African Cup of Nations, Gold
  // Cup, Confederations Cup, Oceania Nations Cup) have no pill anywhere in
  // MESSI's own source either - ported faithfully, not fixed (confirmed with
  // Ronjan 2026-08-17).
  var HISTORY_CONTINENTAL = [
    { value: "UEFA Euro", label: "🇪🇺 UEFA Euro" },
    { value: "Copa América", label: "🌎 Copa América" },
    { value: "AFC Asian Cup", label: "🌏 AFC Asian Cup" },
  ];
  var HISTORY_NATIONS = [
    { value: "UEFA Nations League", label: "🇪🇺 UEFA Nations League" },
    { value: "CONCACAF Nations League", label: "🌎 CONCACAF Nations League" },
  ];

  var state = {
    seasonsIndex: null,
    seasonData: null,
    currentSnapshot: null,
    standingsConf: "all",
    teamsIndex: null,
    nameToSlug: {},
    nameToConf: {},
    nameToFlag: {},
    teamCache: {},
    tsConf: "all",
    tsView: "cross",
    historyTourny: "UEFA Euro",
    championsData: null,
    goatData: null,
    goatCache: {},
    goatConf: "all",
    goatMetric: "overall",
    userPickedTab: false,
    wcOddsData: null,
    wcHistory: null,
    wcViewKey: null,
    wcSelectedEdition: null,
    wcUpsets: null,
    wcCalib: null,
  };

  // ── formatting helpers, ported 1:1 from MESSI's docs/index.html ───────────

  function fmtDate(ds) {
    var d = new Date(ds + "T00:00:00");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }

  var CONF_BADGE_CLS = { UEFA: "badge-messi-UEFA", CONMEBOL: "badge-messi-CONMEBOL", CONCACAF: "badge-messi-CONCACAF", AFC: "badge-messi-AFC", CAF: "badge-messi-CAF", OFC: "badge-messi-OFC" };
  var CONF_BADGE_LABEL = { UEFA: "🇪🇺 UEFA", CONMEBOL: "🌎 CONMEBOL", CONCACAF: "🌎 CONCACAF", AFC: "🌏 AFC", CAF: "🌍 CAF", OFC: "🌏 OFC" };

  // Inline confederation badge - used next to the country name (Standings,
  // GOAT, WC Odds), not as its own column (a genuine MESSI structural choice,
  // unlike CARMELO/ICHIRO/FORSBERG's dedicated Conf column).
  function confederationBadge(confed, wonContinental) {
    if (!confed) return "";
    if (wonContinental) {
      return '<span class="finish-badge finish-champion" title="' + confed + ' Continental Champion">' + confed + " 🏆</span>";
    }
    var cls = CONF_BADGE_CLS[confed] || "badge-Other";
    var label = CONF_BADGE_LABEL[confed] || confed;
    return '<span class="league-badge ' + cls + '">' + label + "</span>";
  }

  // Country Summary keeps its own dedicated Conf column (unlike Standings/GOAT).
  function confBadge(conf, wonContinental) {
    if (!conf) return "";
    if (wonContinental) {
      return '<span class="finish-badge finish-champion" title="' + conf + ' Continental Champion">' + conf + " 🏆</span>";
    }
    return '<span class="finish-badge conf-pill">' + conf + "</span>";
  }

  // 🏆 for every tournament's gold (WC included) - the trophy fits the World
  // Cup's own imagery, and the tournament label already distinguishes it.
  function finishBadge(finishes) {
    if (!finishes || !finishes.length) return "";
    function cls(f) { return f === 1 ? "finish-champion" : f === 2 ? "finish-runner" : "finish-bronze"; }
    function medal(x) { return x.finish === 1 ? "🏆" : x.finish === 2 ? "🥈" : "🥉"; }
    return finishes.map(function (x) {
      return '<span class="finish-badge ' + cls(x.finish) + '">' + x.tournament + " " + medal(x) + "</span>";
    }).join(" ");
  }

  // Soccer draws ('D'), unlike the other 3 international-fleet sites.
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

  // MESSI format: "L 1-2 vs. Scotland (FIFA World Cup qualification)". In the
  // World Cup view (tsViewLink === 'worldcup') the opponent's flag is shown
  // and the redundant "(N)" venue tag is stripped (every WC match is neutral).
  function renderLastMatch(raw, season, isStale, tsViewLink, pens) {
    var display = displayMatch(raw);
    if (!display) return "-";
    var rc = resultClass(raw, isStale);
    var m = display.match(LAST_MATCH_RE);
    if (!m) return '<span class="' + rc + '">' + display + "</span>";
    var letter = m[1], score = m[2], venue = m[3], opponent = m[4], comp = m[5];
    var pensTag = pens ? ' <span class="wc-so">p</span>' : "";
    var slug = state.nameToSlug[opponent.trim()];
    var isWc = tsViewLink === "worldcup";
    var flag = isWc ? (state.nameToFlag[opponent.trim()] || "") : "";
    var oppLabel = flag ? flag + " " + opponent : opponent;
    var venueShown = isWc ? venue.replace(/\s*\(N\)/, "") : venue;
    var oppHtml = slug
      ? '<span class="team-link linked" data-team-slug="' + slug + '" data-season="' + season + '"' +
        (tsViewLink ? ' data-ts-view="' + tsViewLink + '"' : "") + ">" + oppLabel + "</span>"
      : oppLabel;
    var compStr = comp ? " " + comp : "";
    return '<span class="' + rc + '">' + letter + " " + score + pensTag + " " + venueShown + " " + oppHtml + compStr + "</span>";
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

  // Offense/Defense cell: value above, rank below (plain number, no '#'). Null-safe.
  function fmtOD(val, rank) {
    if (val == null) return "-";
    var v = val.toFixed(2);
    if (rank == null) return v;
    return '<div class="od-val">' + v + '</div><div class="od-rank">' + rank + "</div>";
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

  // ── tab switching ────────────────────────────────────────────────────────

  function activateTab(tabName) {
    document.querySelectorAll(".sport-tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".sport-view").forEach(function (v) { v.hidden = true; v.classList.remove("active"); });
    var btn = document.querySelector('.sport-tab[data-tab="' + tabName + '"]');
    var view = document.getElementById(tabName);
    if (btn) btn.classList.add("active");
    if (view) { view.hidden = false; view.classList.add("active"); }
  }

  document.getElementById("msTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    state.userPickedTab = true;
    activateTab(btn.dataset.tab);
  });

  function activateWcTab() {
    state.userPickedTab = true;
    activateTab("wc-odds");
  }

  // ── deep-link handlers ──────────────────────────────────────────────────

  // Valid Standings confederation pill values (excludes 'all').
  var STANDINGS_CONFS = {};
  CONF_OPTIONS.forEach(function (o) { STANDINGS_CONFS[o.value] = true; });

  function seasonLinkClick(season, targetConf) {
    if (!season) return;
    activateTab("standings");
    if (targetConf && STANDINGS_CONFS[targetConf]) {
      state.standingsConf = targetConf;
      buildConfPills("msConfPills", true, state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
    }
    seasonSelect.value = season;
    loadSeason(Number(season));
  }

  // Country Summary pill has an "All" option (unlike CARMELO/ICHIRO/FORSBERG),
  // but a deep-link still targets the team's own confederation by default.
  function teamLinkClick(slug, season, viewOverride) {
    if (!slug) return;
    if (viewOverride === "worldcup") { showWcByCountry(slug); return; }
    var t = state.teamsIndex && state.teamsIndex.filter(function (x) { return x.slug === slug; })[0];
    activateTab("team-summary");
    state.tsConf = t ? t.confederation : "all";
    buildConfPills("tsConfPills", true, state.tsConf, function (v) {
      state.tsConf = v;
      populateTeams(v);
      tsChartWrap.hidden = true;
      tsTableWrap.innerHTML = '<p class="sport-loading">Select a country above</p>';
      tsSeasonSelect.innerHTML = "";
    });
    populateTeams(state.tsConf);
    tsTeamSelect.value = slug;
    var wantSingle = season != null && season !== "";
    state.tsView = wantSingle ? "single" : "cross";
    buildPillsFromOpts("tsViewPills", [
      { value: "cross", label: "Yearly summary" },
      { value: "single", label: "All matches within one year" },
    ], state.tsView, function (v) {
      state.tsView = v;
      tsSeasonSelect.hidden = v !== "single";
      tsDateTypeSelect.hidden = v !== "cross";
      renderTeamTable({});
    });
    tsSeasonSelect.hidden = state.tsView !== "single";
    tsDateTypeSelect.hidden = state.tsView !== "cross";
    loadTeam(slug).then(function () {
      if (wantSingle) {
        var targetVal = String(season);
        var hasOpt = Array.prototype.some.call(tsSeasonSelect.options, function (o) { return o.value === targetVal; });
        if (hasOpt) tsSeasonSelect.value = targetVal;
      }
      renderTeamTable({});
    });
  }

  // Map an Other-Tournaments competition to a Standings confederation pill.
  // FIFA World Cup (multi-confederation) maps to nothing.
  function tournamentConf(t) {
    if (!t) return "";
    if (t.indexOf("UEFA") === 0) return "UEFA";
    if (t === "Copa América") return "CONMEBOL";
    if (t.indexOf("AFC") === 0) return "AFC";
    if (t.indexOf("CONCACAF") === 0) return "CONCACAF";
    if (t.indexOf("CAF") === 0 || t === "Africa Cup of Nations") return "CAF";
    if (t.indexOf("OFC") === 0) return "OFC";
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
    root.querySelectorAll("[data-wc-edition].linked").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        showWcOddsEdition(el.dataset.wcEdition);
      });
    });
  }

  // ═══════════════════════════════ Standings ═══════════════════════════════

  var seasonSelect = document.getElementById("msSeason");
  var dateSelect = document.getElementById("msDate");
  var countEl = document.getElementById("msCount");
  var standingsTableWrap = document.getElementById("msStandingsTable");
  var dateRangeEl = document.getElementById("msDateRange");
  var refreshedEl = document.getElementById("msRefreshed");

  function renderStandings() {
    if (!state.currentSnapshot) return;
    var confed = state.standingsConf;

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
      var confB = t.confederation ? '<span style="margin-left:6px">' + confederationBadge(t.confederation, !!t.continental_winner) + "</span>" : "";
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + (t.display_name || t.team) + confB;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '">' + cellInner + "</td>"
        : '<td class="team-cell">' + cellInner + "</td>";
      // Last Match + Date merged into one column - fleet-wide override; MESSI's
      // own source keeps them split, same regression pattern as CARMELO/ICHIRO.
      return (
        "<tr>" +
        '<td class="col-rank">' + (t.rank != null ? t.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + cRank + "</td>" +
        teamTd +
        "<td>" + ratingBar(t.rating, barSc) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating.">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile" title="Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating.">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
        '<td class="col-last-match">' + renderLastMatch(t.last_match, season, isStale) +
        (t.last_match_date ? '<div class="sub-line-italic">' + t.last_match_date + "</div>" : "") + "</td>" +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.tournament_finishes) + "</td>" +
        "</tr>"
      );
    }).join("");

    standingsTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      "<th>Country</th><th>Rating</th>" +
      '<th class="col-hide-mobile col-od" title="Attacking strength: goals scored vs an average opponent. Sums with Defense to Rating.">OFF</th>' +
      '<th class="col-hide-mobile col-od" title="Defending strength: goals prevented vs an average opponent. Sums with Offense to Rating.">DEF</th>' +
      '<th class="col-last-match">Last Match</th>' +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(standingsTableWrap);
  }

  function populateDateSelect() {
    var snaps = state.seasonData.snapshots;
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
        state.nameToConf = {};
        state.nameToFlag = {};
        data.forEach(function (t) {
          state.nameToSlug[t.name] = t.slug;
          state.nameToConf[t.name] = t.confederation;
          state.nameToFlag[t.name] = t.flag;
          (t.historical_names || []).forEach(function (h) {
            state.nameToSlug[h] = t.slug;
            state.nameToConf[h] = t.confederation;
            state.nameToFlag[h] = t.flag;
          });
        });
        populateWcCountries();
      })
      .catch(function () {
        tsTeamSelect.innerHTML = "<option>Could not load teams</option>";
      });
  }

  function ensureTeamData(slug) {
    if (!slug) return Promise.resolve();
    if (state.teamCache[slug]) return Promise.resolve(state.teamCache[slug]);
    return fetch(BASE + "/teams/" + slug + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) { state.teamCache[slug] = data; return data; });
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
    renderTeamTable({});
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

  // World Cup finish medal: 🏆 gold, 🥈 runner-up, 🥉 third. Own line atop the cell.
  function wcMedal(finishes) {
    var wc = (finishes || []).filter(function (x) { return x.tournament === "WC"; })[0];
    if (!wc) return "";
    return wc.finish === 1 ? "🏆" : wc.finish === 2 ? "🥈" : wc.finish === 3 ? "🥉" : "";
  }

  // World Cup edition record cell, top to bottom: finish medal (own line) ->
  // GROUP W-D-L (Pts), primary line -> KNOCKOUT W-L (dimmed sub-line, penalty
  // shootout W/L folded in and annotated, omitted for group-stage exits).
  function fmtWcRecord(r, finishes) {
    if (!r) return "0-0-0";
    var e = wcMedal(finishes);
    var medalLine = e ? '<div style="line-height:1.3">' + e + "</div>" : "";
    var group = fmtRecord(r.g_w + "-" + r.g_d + "-" + r.g_l);
    var kw = r.k_w + r.pens_w, kl = r.k_l + r.pens_l;
    var pens = (r.pens_w + r.pens_l) ? " (" + r.pens_w + "-" + r.pens_l + " pens)" : "";
    var koLine = (kw + kl) ? '<div class="sub-line">' + kw + "-" + kl + pens + "</div>" : "";
    return medalLine + group + koLine;
  }

  // World Cup view: the selected country's OWN rank·rating walk across the
  // edition, rendered as an offset "stairstep" beside the match list. The walk
  // has N+1 boundary nodes (pre-tournament .. post-final) for N matches. Both
  // columns use fixed WC_ROW-tall rows; the matches cell is pushed down half a
  // row (wcMatchesCell) so each match lands in the GAP between the two walk
  // nodes it sits between - the node below a match is the rating going IN, the
  // node above is the rating coming OUT. Per-node delta is measured against
  // the chronologically prior boundary: teal for a rating gain, pink for a
  // drop; the arrow shows rank movement.
  var WC_ROW = 30;
  var WC_PAD = 9;

  function wcWalkCell(walk) {
    var nodes = (walk || []).slice().reverse();
    var html = nodes.map(function (w, d) {
      var below = nodes[d + 1];
      var delta = "";
      if (below && w.g != null && below.g != null) {
        var dr = parseFloat((w.g - below.g).toFixed(2));
        var dk = (below.r != null && w.r != null) ? below.r - w.r : null;
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
    var ms = ((g.wc_record && g.wc_record.matches) || []).slice().reverse();
    var html = ms.map(function (mm) {
      var date = mm.d ? '<span style="color:var(--muted);font-size:0.85em;margin-right:8px;font-variant-numeric:tabular-nums">' + mm.d + "</span>" : "";
      var rd = mm.rd ? '<span class="wc-rd" style="margin-right:6px">' + mm.rd + "</span>" : "";
      var opp = (mm.r != null) ? ' <span style="color:var(--muted);font-size:0.85em">#' + mm.r + " · " + mm.g.toFixed(2) + "</span>" : "";
      var sm = mm.s.match(/^([WL])\s+(\d+)\s*-\s*(\d+)/);
      var pens = !!(mm.rd && mm.rd !== "G" && sm && sm[2] === sm[3]);
      return '<div style="height:' + WC_ROW + 'px;display:flex;align-items:center;white-space:nowrap">' + date +
        "<span>" + rd + renderLastMatch(mm.s, g.season, false, "worldcup", pens) + opp + "</span></div>";
    }).join("");
    return '<td class="col-last-match" style="padding-top:' + (WC_PAD + WC_ROW / 2) + 'px;vertical-align:top;max-width:420px">' + html + "</td>";
  }

  // Shared by Country Summary (cross/single) and History by Country
  // (view:'worldcup', separate select/wrap/chart ids, no chart).
  function renderTeamTable(opts) {
    opts = opts || {};
    var view = opts.view || state.tsView;
    var selectId = opts.selectId || "tsTeamSelect";
    var wrapId = opts.wrapId || "tsTableWrap";
    var slug = document.getElementById(selectId).value;
    if (!slug || !state.teamCache[slug]) return;
    var data = state.teamCache[slug];

    var rows = [];
    var seasons = Object.keys(data.seasons).sort();
    var seasonFilter;

    if (view === "single") {
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
    } else if (view === "worldcup") {
      seasonFilter = "all";
      seasons.forEach(function (s) {
        data.seasons[s].forEach(function (g) {
          if (g.wc_record) rows.push(Object.assign({}, g, { season: s }));
        });
      });
      if (rows.length === 0) {
        if (!opts.noChart) document.getElementById(opts.chartWrap || "tsChartWrap").hidden = true;
        document.getElementById(wrapId).innerHTML = '<p class="sport-loading">No FIFA World Cup appearances since 1990</p>';
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

    if (!opts.noChart) drawChart(rows, seasonFilter, opts.chartWrap || "tsChartWrap", opts.chartSvg || "tsChart");

    var isWc = view === "worldcup";
    var targetConf = data.confederation || "";
    var canonical = data.team;
    var barSc = barScale(rows.slice().reverse().filter(function (g) { return g.rank != null; }).map(function (g) { return g.rating; }));
    var tableRows = rows.slice().reverse().map(function (g) {
      var dateLabel = g.year_anchor_label || "";
      var dateCell = dateLabel ? g.date + '<div class="sub-line-italic">' + dateLabel + "</div>" : g.date;
      var era = (g.display_name && g.display_name !== canonical) ? g.display_name : "";
      var seasonCell = era ? g.season + '<div class="sub-line-italic">' + era + "</div>" : g.season;
      var yearTd = isWc
        ? '<td class="col-rank linked" data-wc-edition="' + g.season + '" style="text-align:center">' + seasonCell + "</td>"
        : '<td class="col-rank linked" data-season-link="' + g.season + '" data-target-conf="' + targetConf + '" style="text-align:center">' + seasonCell + "</td>";
      return (
        "<tr>" +
        yearTd +
        (isWc ? "" : '<td class="col-hide-mobile">' + dateCell + "</td>") +
        (isWc ? wcWalkCell(g.wc_record && g.wc_record.team_walk) + wcMatchesCell(g) : '<td class="col-last-match">' + renderLastMatch(g.last_match, g.season, !!g._isStale) + "</td>") +
        (isWc ? '<td style="font-variant-numeric:tabular-nums;white-space:nowrap">' + fmtWcRecord(g.wc_record, g.tournament_finishes) + "</td>" : "") +
        '<td class="col-rank">' + (g.rank != null ? g.rank : "-") + "</td>" +
        '<td class="col-rank col-hide-mobile">' + (g.conf_rank != null ? g.conf_rank : "-") + "</td>" +
        "<td>" + (g.rank != null ? ratingBar(g.rating, barSc) : '<span style="color:var(--muted)">-</span>') + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_o, g.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(g.rating_d, g.rank_d) + "</td>" +
        '<td class="col-hide-mobile">' + confBadge(g.confederation || data.confederation, g.continental_winner) + "</td>" +
        (isWc ? "" : '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(g.tournament_finishes) + "</td>") +
        "</tr>"
      );
    }).join("");

    document.getElementById(wrapId).innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">Year</th>' + (isWc ? "" : '<th class="col-hide-mobile">Date</th>') +
      (isWc ? '<th>Rating Evolution<div class="sub-line">Rank · Rating</div></th>' : "") +
      "<th>" + (isWc ? 'Matches<div class="sub-line">opponent rank · rating prior to match</div>' : "Last Match") + "</th>" +
      (isWc ? '<th>Group W-D-L <span class="dim-pct">(Pts)</span><div class="sub-line">Knockout W-L (Pen W-L)</div></th>' : "") +
      '<th class="col-rank">OVR #</th><th class="col-hide-mobile col-rank">Conf #</th>' +
      "<th>" + (isWc ? "Final Rating" : "Rating") + "</th>" +
      '<th class="col-hide-mobile col-od">OFF</th><th class="col-hide-mobile col-od">DEF</th>' +
      '<th class="col-hide-mobile">Conf</th>' +
      (isWc ? "" : '<th class="col-hide-mobile">Honors</th>') +
      "</tr></thead><tbody>" + tableRows + "</tbody></table>";
    attachLinks(document.getElementById(wrapId));
  }

  function drawChart(rows, seasonFilter, wrapId, svgId) {
    var wrap = document.getElementById(wrapId);
    var svg = document.getElementById(svgId);
    if (rows.length < 2) { wrap.hidden = true; return; }
    wrap.hidden = false;

    var W = svg.parentElement.clientWidth - 32;
    var H = 180;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    var D_DEFAULT = 2.5, D_CAP = 6;
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

    svg.innerHTML =
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
  tsSeasonSelect.addEventListener("change", function () { renderTeamTable({}); });
  tsDateTypeSelect.addEventListener("change", function () { renderTeamTable({}); });

  // ═══════════════════════════════ Other Tournaments ═══════════════════════════════

  var historyTableWrap = document.getElementById("historyTableWrap");

  function loadChampions() {
    return fetch(BASE + "/champions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.championsData = data;
        renderLeagueHistory(state.historyTourny, "historyTableWrap");
        renderLeagueHistory("FIFA World Cup", "wcHistoryWrap");
      })
      .catch(function () {
        historyTableWrap.innerHTML = '<p class="sport-error">Could not load league history</p>';
      });
  }

  // Shared by the Other Tournaments tab and the FIFA World Cup tab's
  // Historical Podiums sub-view (targetId differs).
  function renderLeagueHistory(league, targetId) {
    targetId = targetId || "historyTableWrap";
    var target = document.getElementById(targetId);
    if (!state.championsData || !league) return;
    var entries = state.championsData[league] || [];
    if (!entries.length) {
      target.innerHTML = '<p class="sport-loading">No data for this competition</p>';
      return;
    }

    var champEmoji = "🏆";

    function teamCell(t, bg, season, preRated) {
      if (!t) return '<td class="' + bg + '" colspan="4" style="text-align:center;color:var(--muted)">-</td>';
      var countStr = "";
      if (t.title_count) countStr = ' <span class="dim-pct">(' + t.title_count + " " + champEmoji + ")</span>";
      else if (t.runner_up_count) countStr = ' <span class="dim-pct">(' + t.runner_up_count + " 🥈)</span>";
      else if (t.third_count) countStr = ' <span class="dim-pct">(' + t.third_count + " 🥉)</span>";
      var disputedTag = t.disputed
        ? ' <span class="sport-note-warn" style="font-size:9px;font-weight:700;border:1px solid currentColor;padding:1px 5px;border-radius:3px;margin-left:4px;letter-spacing:0.5px" title="' + t.disputed.replace(/"/g, "&quot;") + '">DISPUTED</span>'
        : "";
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + (t.display_name || t.team) + countStr + disputedTag;
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
        ? '<td class="' + bg + ' team-cell linked" data-team-slug="' + slug + '" data-season="' + season + '"' + (league === "FIFA World Cup" ? ' data-ts-view="worldcup"' : "") + ' style="white-space:nowrap">' + cellInner + "</td>"
        : '<td class="' + bg + ' team-cell" style="white-space:nowrap">' + cellInner + "</td>";
      return (
        teamTd +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + ovrRank + "</td>" +
        '<td class="' + bg + ' col-hide-mobile" style="font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted);font-size:0.85em;text-align:center">' + confRank + "</td>" +
        '<td class="' + bg + ' rating-cell">' + rating + "</td>"
      );
    }

    var targetConf = tournamentConf(league);

    var anyPreRated = false;
    var rows = entries.map(function (e) {
      var preRated = !!e.pre_rated;
      if (preRated) anyPreRated = true;
      var hostStr = e.host_flags ? ' <span style="font-size:0.85em">' + e.host_flags + "</span>" : "";
      var sbSuffix = preRated ? ' <sup class="sport-dagger">†</sup>' : "";
      var yearTd = preRated
        ? '<td class="season-cell" style="white-space:nowrap">' + e.season + hostStr + sbSuffix + "</td>"
        : league === "FIFA World Cup"
        ? '<td class="season-cell linked" data-wc-edition="' + e.season + '" style="white-space:nowrap">' + e.season + hostStr + "</td>"
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
      ? '<p class="sport-note"><sup>†</sup> Pre-1990 editions. Results shown for completeness; ratings aren\'t shown before 1990, where the model\'s rolling window is still too thin to rate teams reliably.</p>'
      : "";

    target.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      "<th>Year</th>" +
      '<th class="col-champ">Champion</th>' +
      '<th class="col-champ col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-champ col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-champ">Rating</th>' +
      '<th class="col-ru">Runner-Up</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-ru">Rating</th>' +
      '<th class="col-ru">3rd Place</th>' +
      '<th class="col-ru col-hide-mobile col-rank">OVR #</th>' +
      '<th class="col-ru col-hide-mobile col-rank">Conf #</th>' +
      '<th class="col-ru">Rating</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
    attachLinks(target);
  }

  var onHistoryPick = function (v) { state.historyTourny = v; renderLeagueHistory(v, "historyTableWrap"); };
  buildPillsFromOpts("historyContinentalPills", HISTORY_CONTINENTAL, state.historyTourny, onHistoryPick, ["historyNationsPills"]);
  buildPillsFromOpts("historyNationsPills", HISTORY_NATIONS, state.historyTourny, onHistoryPick, ["historyContinentalPills"]);

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
    var teams = state.goatConf === "all" ? state.goatData : state.goatData.filter(function (t) { return t.confederation === state.goatConf; });

    var activeField = GOAT_FIELD[state.goatMetric];
    var barSc = barScale(teams.map(function (t) { return t[activeField]; }));
    var rows = teams.map(function (t) {
      var slug = state.nameToSlug[t.team];
      var confB = t.confederation ? '<span style="margin-left:6px">' + confederationBadge(t.confederation, !!t.continental_winner) + "</span>" : "";
      var cellInner = '<span class="sport-flag">' + (t.flag || "") + "</span>" + (t.display_name || t.team) + confB;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-season="' + t.season + '">' + cellInner + "</td>"
        : '<td class="team-cell">' + cellInner + "</td>";
      var targetConf = (state.goatConf !== "all" ? state.goatConf : t.confederation) || "";
      var metricCells = GOAT_METRICS.map(function (m) {
        return m.field === activeField
          ? '<td class="col-od">' + ratingBar(t[m.field], barSc) + "</td>"
          : '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t[m.field], null) + "</td>";
      }).join("");
      return (
        "<tr>" +
        '<td class="col-rank">' + t.rank + "</td>" +
        '<td class="season-cell linked" data-season-link="' + t.season + '" data-target-conf="' + targetConf + '" style="text-align:center">' + t.season + "</td>" +
        teamTd + metricCells +
        '<td class="col-hide-mobile" style="font-size:11px">' + finishBadge(t.tournament_finishes) + "</td>" +
        "</tr>"
      );
    }).join("");

    var metricHeaders = GOAT_METRICS.map(function (m) {
      return '<th class="col-od' + (m.field === activeField ? "" : " col-hide-mobile") + '"' + (m.title ? ' title="' + m.title + '"' : "") + ">" + m.label + "</th>";
    }).join("");

    goatTableWrap.innerHTML =
      '<table class="sport-table"><thead><tr>' +
      '<th style="text-align:center">All time rank</th>' +
      '<th style="text-align:center">Year</th>' +
      "<th>Country</th>" + metricHeaders +
      '<th class="col-hide-mobile">Honors</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(goatTableWrap);
  }

  buildConfPills("goatConfPills", true, state.goatConf, function (v) { state.goatConf = v; renderGoat(); });
  buildPillsFromOpts("goatMetricPills", [
    { value: "overall", label: "Rating (overall)" },
    { value: "offense", label: "Offense only" },
    { value: "defense", label: "Defense only" },
  ], state.goatMetric, function (v) { state.goatMetric = v; loadGoat(); });

  // ═══════════════════════════════ FIFA World Cup ═══════════════════════════════

  var wcSubviewPills = document.getElementById("wcSubviewPills");
  var wcOddsView = document.getElementById("wcOddsView");
  var wcUpsetsView = document.getElementById("wcUpsetsView");
  var wcHistoryView = document.getElementById("wcHistoryView");
  var wcBycountryView = document.getElementById("wcBycountryView");
  var wcOddsWrap = document.getElementById("wcOddsWrap");
  var wcUpsetsWrap = document.getElementById("wcUpsetsWrap");
  var wcOddsTitle = document.getElementById("wcOddsTitle");
  var wcOddsNote = document.getElementById("wcOddsNote");
  var wcOddsStamp = document.getElementById("wcOddsStamp");
  var wcCalibNote = document.getElementById("wcCalibNote");
  var wcUpsetsNote = document.getElementById("wcUpsetsNote");
  var wcControls = document.getElementById("wcControls");
  var wcTournamentSelect = document.getElementById("wcTournamentSelect");
  var wcDateSelect = document.getElementById("wcDateSelect");
  var wcCountrySelect = document.getElementById("wcCountrySelect");
  var wcBycountryWrap = document.getElementById("wcBycountryWrap");
  var wcNav = document.getElementById("msWcNav");

  function loadWcOdds() {
    var p1 = fetch(BASE + "/wc_odds.json").then(function (r) { return r.json(); }).then(function (d) { state.wcOddsData = d; }).catch(function () { state.wcOddsData = null; });
    var p2 = fetch(BASE + "/wc_odds_history.json").then(function (r) { return r.json(); }).then(function (d) { state.wcHistory = d; }).catch(function () { state.wcHistory = null; });
    var p3 = fetch(BASE + "/wc_upsets.json").then(function (r) { return r.json(); }).then(function (d) { state.wcUpsets = d; }).catch(function () { state.wcUpsets = null; });
    var p4 = fetch(BASE + "/wc_calibration.json").then(function (r) { return r.json(); }).then(function (d) { state.wcCalib = d; }).catch(function () { state.wcCalib = null; });
    return Promise.all([p1, p2, p3, p4]).then(function () {
      if (wcCalibNote && state.wcCalib) {
        wcCalibNote.textContent = "These predictions have been validated against historical World Cups going back to " + state.wcCalib.first_year;
      }
      renderWcOdds();
    });
  }

  // FIFA World Cup tab sub-pills.
  function setWcSubview(v) {
    document.querySelectorAll("#wcSubviewPills .pill").forEach(function (b) { b.classList.toggle("active", b.dataset.wcview === v); });
    wcOddsView.hidden = v !== "odds";
    wcUpsetsView.hidden = v !== "upsets";
    wcHistoryView.hidden = v !== "history";
    wcBycountryView.hidden = v !== "bycountry";
    if (v === "upsets") renderUpsets();
    if (v === "history") renderLeagueHistory("FIFA World Cup", "wcHistoryWrap");
  }
  wcSubviewPills.addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    setWcSubview(btn.dataset.wcview);
  });

  function populateWcCountries() {
    if (!wcCountrySelect || !state.teamsIndex) return;
    wcCountrySelect.innerHTML = '<option value="">- Select a country -</option>';
    state.teamsIndex.filter(function (t) { return t.wc; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.slug;
      opt.textContent = t.flag ? t.flag + " " + t.name : t.name;
      wcCountrySelect.appendChild(opt);
    });
    wcCountrySelect.disabled = false;
  }
  wcCountrySelect.addEventListener("change", function () { renderWcByCountry(wcCountrySelect.value); });

  function renderWcByCountry(slug) {
    if (!slug) { wcBycountryWrap.innerHTML = '<p class="sport-loading">Select a country above</p>'; return; }
    wcBycountryWrap.innerHTML = '<p class="sport-loading">Loading...</p>';
    ensureTeamData(slug).then(function () {
      wcCountrySelect.value = slug;
      renderTeamTable({ view: "worldcup", selectId: "wcCountrySelect", wrapId: "wcBycountryWrap", noChart: true });
    }).catch(function () {
      wcBycountryWrap.innerHTML = '<p class="sport-error">Could not load team data</p>';
    });
  }

  function showWcByCountry(slug) {
    activateWcTab();
    setWcSubview("bycountry");
    renderWcByCountry(slug);
  }

  function showWcOddsEdition(year) {
    activateWcTab();
    setWcSubview("odds");
    state.wcSelectedEdition = parseInt(year, 10);
    state.wcViewKey = null;
    wcBuildControls();
    renderWcView();
  }

  // Knockout Upsets: every knockout match the model gave the winner <50%,
  // biggest shock (lowest pre-match win probability) first. All pink - the
  // gradient carries shock magnitude, alpha floored so even near-coin-flips stay visible.
  function renderUpsets() {
    var ups = ((state.wcUpsets && state.wcUpsets.upsets) || []).filter(function (u) { return u.win_prob < 0.5; }).slice(0, 25);
    if (!ups.length) { wcUpsetsWrap.innerHTML = '<p class="sport-loading">No upsets yet</p>'; return; }
    wcUpsetsNote.textContent = "The biggest knockout upsets across every World Cup since 1990 - matches the model gave the winner less than an even chance, sorted by the winner's pre-match win probability (lower = bigger shock)";
    function teamHtml(name, flag) {
      var slug = state.nameToSlug[name];
      return slug ? '<span class="team-link linked" data-team-slug="' + slug + '" data-ts-view="worldcup">' + (flag || "") + " " + name + "</span>" : (flag || "") + " " + name;
    }
    function pct(v) { return v * 100 < 1 ? "&lt;1%" : Math.round(v * 100) + "%"; }
    var A_LO = 0.16, A_HI = 0.70;
    var vs = ups.map(function (u) { return u.win_prob; });
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    function heat(v) {
      var t = hi <= lo ? 1 : Math.max(0, Math.min(1, (hi - v) / (hi - lo)));
      var a = A_LO + t * (A_HI - A_LO);
      return "background:color-mix(in srgb, var(--accent-2) " + (a * 100).toFixed(1) + "%, #fff)";
    }
    var rows = ups.map(function (u, i) {
      return (
        "<tr>" +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        '<td style="text-align:center;font-variant-numeric:tabular-nums">' + u.edition + "</td>" +
        '<td style="text-align:center">' + u.round + "</td>" +
        '<td class="team-cell" style="text-align:right">' + teamHtml(u.winner, u.winner_flag) + "</td>" +
        '<td class="rating-cell col-od">' + fmtOD(u.winner_rating, u.winner_rank) + "</td>" +
        '<td style="text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap">' + u.gf + "-" + u.ga + (u.pens ? ' <span class="wc-so">p</span>' : "") + "</td>" +
        '<td class="team-cell">' + teamHtml(u.loser, u.loser_flag) + "</td>" +
        '<td class="rating-cell col-od">' + fmtOD(u.loser_rating, u.loser_rank) + "</td>" +
        '<td class="col-od wc-heat wc-champ-cell" style="' + heat(u.win_prob) + '">' + pct(u.win_prob) + "</td>" +
        "</tr>"
      );
    }).join("");
    wcUpsetsWrap.innerHTML =
      '<table class="sport-table sport-table-narrow">' +
      '<thead><tr>' +
      '<th class="col-rank">Rank</th><th style="text-align:center">Year</th><th style="text-align:center">Round</th>' +
      '<th style="text-align:right">Winner (underdog)</th>' +
      '<th class="col-od">Rating</th>' +
      '<th style="text-align:center">Score</th>' +
      "<th>Loser (favorite)</th>" +
      '<th class="col-od">Rating</th>' +
      '<th class="col-od" title="The winner\'s pre-match win probability from the Poisson goals model + the as-of-date ratings. Lower = bigger upset.">Winner\'s odds</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(wcUpsetsWrap);
  }

  // Snapshots for the currently-shown edition (selected, else the live edition).
  function wcEditionBucket() {
    if (!state.wcHistory || !state.wcHistory.tournaments) return null;
    var ed = state.wcSelectedEdition != null ? state.wcSelectedEdition : (state.wcOddsData && state.wcOddsData.edition);
    var found = state.wcHistory.tournaments.filter(function (b) { return b.edition === ed; })[0];
    return found || state.wcHistory.tournaments[0] || null;
  }
  function wcIsLiveEdition() {
    var b = wcEditionBucket();
    return !!(b && state.wcOddsData && b.edition === state.wcOddsData.edition);
  }
  function wcSnapKey(s) { return s.phase + "-" + s.games_left; }
  function wcStageLabel(s) {
    if (!s) return "";
    if (s.phase === "group") return s.games_left + " group game" + (s.games_left === 1 ? "" : "s") + " left";
    if (s.complete || s.games_left === 0) return "Champion";
    var alive = s.games_left + 1;
    if (alive > 16) return "Round of 32";
    if (alive > 8) return "Round of 16";
    if (alive > 4) return "Quarterfinals";
    if (alive > 2) return "Semifinals";
    return "Final";
  }

  function wcBuildControls() {
    var buckets = (state.wcHistory && state.wcHistory.tournaments) || [];
    var bucket = wcEditionBucket();
    wcTournamentSelect.innerHTML = "";
    buckets.forEach(function (b) {
      var o = document.createElement("option");
      o.value = String(b.edition);
      o.textContent = String(b.edition);
      wcTournamentSelect.appendChild(o);
    });
    if (bucket) wcTournamentSelect.value = String(bucket.edition);
    wcTournamentSelect.hidden = buckets.length <= 1;
    wcTournamentSelect.onchange = function () {
      state.wcSelectedEdition = parseInt(wcTournamentSelect.value, 10);
      state.wcViewKey = null;
      wcBuildControls();
      renderWcView();
    };

    var snaps = (bucket || {}).snapshots || [];
    wcControls.hidden = !(snaps.length > 1 || buckets.length > 1);
    var live = wcIsLiveEdition();
    wcDateSelect.innerHTML = "";
    snaps.slice().reverse().forEach(function (s, i) {
      var o = document.createElement("option");
      o.value = (i === 0 && live) ? "" : wcSnapKey(s);
      o.textContent = s.date + " | " + wcStageLabel(s) + (i === 0 && live ? " · current" : "");
      wcDateSelect.appendChild(o);
    });
    wcDateSelect.value = state.wcViewKey != null ? state.wcViewKey
      : (live ? "" : (snaps.length ? wcSnapKey(snaps[snaps.length - 1]) : ""));
    wcDateSelect.onchange = function () { state.wcViewKey = wcDateSelect.value || null; renderWcView(); };
  }

  function renderWcOdds() {
    var teams = (state.wcOddsData && state.wcOddsData.teams) || [];
    if (!teams.length) { wcNav.hidden = true; return; }
    wcNav.hidden = false;
    // Land on the FIFA World Cup tab by default when an edition is live/just
    // finished, unless the visitor has already navigated elsewhere.
    if (!state.userPickedTab) activateTab("wc-odds");
    wcBuildControls();
    renderWcView();
  }

  // Render the currently-selected view: live odds, or a historical snapshot
  // from the date dropdown. Snapshots carry full team rows, so a past date
  // renders identically to live.
  function renderWcView() {
    var bucket = wcEditionBucket();
    var snaps = (bucket || {}).snapshots || [];
    var live = wcIsLiveEdition();
    var view, isLatest;
    if (state.wcViewKey != null) {
      view = snaps.filter(function (s) { return wcSnapKey(s) === state.wcViewKey; })[0] || (live ? state.wcOddsData : snaps[snaps.length - 1]);
      isLatest = false;
    } else {
      view = live ? state.wcOddsData : (snaps[snaps.length - 1] || state.wcOddsData);
      isLatest = true;
    }
    var teams = (view && view.teams) || [];
    if (!teams.length) return;

    // R32 column only exists for 48-team editions (2026+); 16-team editions
    // (1990-2022) start at R16.
    var koSize = Math.max(0, (view.games_left || 0) + 1, Math.max.apply(null, [0].concat(snaps.map(function (s) { return (s.games_left || 0) + 1; }))));
    var showR32 = koSize > 16;

    function niceDate(ds) { return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    var sims = (view.n_sims || (state.wcOddsData && state.wcOddsData.n_sims) || 0).toLocaleString();
    var edition = view.edition || (bucket && bucket.edition) || (state.wcOddsData && state.wcOddsData.edition) || "";
    var tournament = (bucket && bucket.tournament) || "FIFA World Cup";
    // Header is constant across editions/dates - completion is conveyed by
    // the date dropdown ("Champion") and the W/L grid, not by changing the header.
    wcOddsTitle.textContent = edition + " " + tournament + " 🏆 Win Probability";
    wcOddsNote.textContent = sims + " Monte Carlo simulations · each column is the chance to advance past that round";

    var koPlayed = teams.some(function (t) { return (t.ko_path || []).some(function (k) { return !k.pending; }); });
    var stampHtml = "";
    if (view.phase === "knockout" && !koPlayed) {
      stampHtml = '<span class="wc-md-label">End of group stage</span>';
    } else {
      var md = view.latest_matchday;
      if (md && md.games && md.games.length) {
        var chips = md.games.map(function (g) {
          var so = g.so ? ' <span class="wc-so">(' + g.so + " pens)</span>" : "";
          return '<span class="wc-result">' + (g.hflag || "") + " " + g.home + " <b>" + g.hg + "-" + g.ag + "</b> " + g.away + " " + (g.aflag || "") + so + "</span>";
        }).join("");
        var label = isLatest ? "Newest results" : "Previous day's results";
        stampHtml = '<span class="wc-md-label">' + label + " · " + niceDate(md.date) + "</span>" + chips;
      }
    }
    wcOddsStamp.innerHTML = stampHtml;

    function pct(v) { return v * 100 < 1 ? "&lt;1%" : Math.round(v * 100) + "%"; }
    var MAXA = 0.70;
    var KO_COL = { R32: "r16", R16: "qf", QF: "sf", SF: "final", Final: "champ" };
    teams.forEach(function (t) {
      var kr = {};
      (t.ko_path || []).forEach(function (k) {
        if (k.pending) return;
        var col = KO_COL[k.round];
        if (col) kr[col] = k.won ? "W" : "L";
      });
      t._kr = kr;
      t._depth = (t.ko_path || []).filter(function (k) { return !k.pending; }).length;
    });
    var ordered = teams.slice().sort(function (a, b) {
      if (!a.eliminated !== !b.eliminated) return a.eliminated ? 1 : -1;
      if (!a.eliminated) return b.champ - a.champ;
      return (b._depth - a._depth) || (b.rating - a.rating);
    });

    var STAGES = ["champ", "final", "sf", "qf", "r16"];
    var alive = teams.filter(function (t) { return !t.eliminated; });
    var range = {};
    STAGES.forEach(function (k) {
      var vs = alive.filter(function (t) { return !t._kr[k]; }).map(function (t) { return t[k]; });
      range[k] = [vs.length ? Math.min.apply(null, vs) : Infinity, vs.length ? Math.max.apply(null, vs) : -Infinity];
    });
    function heat(v, r) {
      var lo = r[0], hi = r[1];
      if (!isFinite(lo) || hi <= lo) return "background:color-mix(in srgb, var(--accent) 6%, #fff)";
      var t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      if (t >= 0.5) {
        var a = (t - 0.5) * 2 * MAXA;
        return "background:color-mix(in srgb, var(--accent) " + (a * 100).toFixed(1) + "%, #fff)";
      }
      var a2 = (0.5 - t) * 2 * MAXA;
      return "background:color-mix(in srgb, var(--accent-2) " + (a2 * 100).toFixed(1) + "%, #fff)";
    }
    function wlCell(r, cls) {
      return '<td class="col-od wc-heat ' + (cls || "") + '"><span class="' + (r === "W" ? "wc-w" : "wc-l") + ' wc-wl">' + r + "</span></td>";
    }
    function heatCell(t, k, cls) {
      if (t._kr[k]) return wlCell(t._kr[k], cls);
      if (t.eliminated) return '<td class="col-od wc-heat ' + (cls || "") + '"><span style="color:var(--muted)">-</span></td>';
      return '<td class="col-od wc-heat ' + (cls || "") + '" style="' + heat(t[k], range[k]) + '">' + pct(t[k]) + "</td>";
    }
    // Newest-first (fleet convention): latest knockout round on top, group
    // stage (always the earliest) last. ko_path itself arrives chronological
    // (R32 -> Final), so it's reversed here rather than at the data layer.
    // One match per row - not inline-wrapped spans, which read as a run-on
    // sentence in a dense grid.
    function resultsCell(t) {
      var lines = [];
      (t.ko_path || []).slice().reverse().forEach(function (k) {
        var rd = '<span class="wc-rd">' + k.round + "</span>";
        var opp = '<span class="wc-vs">vs. ' + (k.opp_flag || "") + " " + k.opp + "</span>";
        if (k.pending) {
          var when = k.date ? ' <span class="wc-when">(' + k.date.slice(5) + ")</span>" : "";
          lines.push(rd + " " + opp + when);
        } else {
          var pens = k.pens ? ' <span class="wc-so">p</span>' : "";
          lines.push(rd + ' <span class="' + (k.won ? "wc-w" : "wc-l") + '">' + (k.won ? "W" : "L") + " " + k.gf + "-" + k.ga + pens + "</span> " + opp);
        }
      });
      if (t.grp) {
        var out = (t.eliminated && !(t.ko_path || []).length) ? ' <span class="wc-out">OUT</span>' : "";
        lines.push('<span class="wc-grp">' + t.grp + "</span>" + (t.grp_rec ? '<span class="wc-rec">(' + t.grp_rec + ")</span>" : "") + out);
      }
      var body = lines.length
        ? lines.map(function (p) { return '<div class="wc-seg">' + p + "</div>"; }).join("")
        : '<span style="color:var(--muted)">-</span>';
      return '<td class="wc-results"><div class="wc-results-inner">' + body + "</div></td>";
    }
    function champCell(t) {
      if (t._kr.champ) return '<td class="col-od wc-heat wc-champ-cell"><span class="' + (t._kr.champ === "W" ? "wc-w" : "wc-l") + ' wc-wl">' + t._kr.champ + "</span></td>";
      if (t.eliminated) return '<td class="col-od wc-heat wc-champ-cell"><span style="color:var(--muted)">-</span></td>';
      return '<td class="col-od wc-heat wc-champ-cell" style="' + heat(t.champ, range.champ) + '">' + pct(t.champ) + "</td>";
    }
    var rows = ordered.map(function (t, i) {
      var slug = state.nameToSlug[t.team];
      var conf = state.nameToConf[t.team];
      var confB = conf ? '<div style="margin-top:2px">' + confederationBadge(conf) + "</div>" : "";
      var inner = '<span style="margin-right:5px">' + (t.flag || "") + "</span>" + t.team + confB;
      var teamTd = slug
        ? '<td class="team-cell linked" data-team-slug="' + slug + '" data-ts-view="worldcup">' + inner + "</td>"
        : '<td class="team-cell">' + inner + "</td>";
      return (
        '<tr>' +
        '<td class="col-rank">' + (i + 1) + "</td>" +
        teamTd +
        '<td class="col-od rating-cell col-od">' + fmtOD(t.rating, t.rank) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_o, t.rank_o) + "</td>" +
        '<td class="rating-cell col-od col-hide-mobile">' + fmtOD(t.rating_d, t.rank_d) + "</td>" +
        resultsCell(t) +
        (showR32 ? heatCell(t, "r16", "col-hide-mobile") : "") + heatCell(t, "qf", "col-hide-mobile") + heatCell(t, "sf", "") + heatCell(t, "final", "") +
        champCell(t) +
        "</tr>"
      );
    }).join("");

    wcOddsWrap.innerHTML =
      '<table class="sport-table wc-odds-table"><thead><tr>' +
      '<th style="text-align:center;width:80px">🏆 Rank</th><th style="width:152px">Country</th>' +
      '<th class="col-od" style="width:60px">Rating</th>' +
      '<th class="col-hide-mobile col-od" style="width:56px">OFF</th>' +
      '<th class="col-hide-mobile col-od" style="width:56px">DEF</th>' +
      "<th>Results</th>" +
      (showR32 ? '<th class="col-od wc-col col-hide-mobile">R32</th>' : "") + '<th class="col-od wc-col col-hide-mobile">R16</th>' +
      '<th class="col-od wc-col">QF</th><th class="col-od wc-col">Semi</th>' +
      '<th class="col-od wc-col">Final 🏆</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
    attachLinks(wcOddsWrap);
  }

  // ═══════════════════════════════ init ═══════════════════════════════

  Promise.all([
    fetch(BASE + "/seasons_index.json").then(function (r) { return r.json(); }),
    loadTeamsIndex(),
  ]).then(function (results) {
    var data = results[0];
    dateRangeEl.textContent = "Ratings include matches from " + fmtDate(data.first_date) + " to " + fmtDate(data.last_date);
    if (data.generated_at) {
      var refreshed = new Date(data.generated_at);
      refreshedEl.textContent = "Last refreshed: " + refreshed.toLocaleString(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    }
    seasonSelect.innerHTML = data.seasons.map(function (y) { return '<option value="' + y + '">' + y + "</option>"; }).join("");
    seasonSelect.value = String(data.seasons[0]);
    populateTeams(state.tsConf);
    renderLeagueHistory(state.historyTourny, "historyTableWrap");
    loadSeason(data.seasons[0]);
    loadChampions();
    loadGoat();
    loadWcOdds();
  }).catch(function () {
    standingsTableWrap.innerHTML = '<p class="sport-error">Could not load ratings</p>';
  });

  buildConfPills("msConfPills", true, state.standingsConf, function (v) { state.standingsConf = v; renderStandings(); });
  buildConfPills("tsConfPills", true, state.tsConf, function (v) {
    state.tsConf = v;
    populateTeams(v);
    tsChartWrap.hidden = true;
    tsTableWrap.innerHTML = '<p class="sport-loading">Select a country above</p>';
    tsSeasonSelect.innerHTML = "";
  });
  buildPillsFromOpts("tsViewPills", [
    { value: "cross", label: "Yearly summary" },
    { value: "single", label: "All matches within one year" },
  ], state.tsView, function (v) {
    state.tsView = v;
    tsSeasonSelect.hidden = v !== "single";
    tsDateTypeSelect.hidden = v !== "cross";
    renderTeamTable({});
  });
  tsSeasonSelect.hidden = true;
})();
