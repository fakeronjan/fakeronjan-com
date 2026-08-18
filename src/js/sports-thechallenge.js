(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var state = {
    seasonsIndex: null,
    playersIndex: null,
    playerSet: null,
    playerGender: "all",
    playerScope: "3plus",
    goatView: "career",
    goatSort: "era_rating",
    goatData: null,
    championsData: null,
  };

  var cache = {};
  function fetchJSON(path) {
    if (cache[path]) return Promise.resolve(cache[path]);
    return fetch(BASE + "/" + path).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + path);
      return r.json();
    }).then(function (data) {
      cache[path] = data;
      return data;
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── formatting helpers, ported 1:1 from LAVIN's docs/index.html ───────────

  // No leading "+" on positive ratings - fleet convention (DUNCAN/ZIDANE/etc
  // all show plain "1.23"/"-0.45"; the minus sign is the only indicator).
  function fmtRating(r) {
    if (r === null || r === undefined) return "-";
    return r.toFixed(2);
  }
  function fmtEra(v) {
    if (v === null || v === undefined) return "-";
    return v.toFixed(1);
  }

  // Rating bar is clipped to a fixed [-2, 2] range - wide enough for LAVIN's
  // typical spread, narrow enough that small differences stay visible
  // (LAVIN's ratings sit in a tighter band than DUNCAN's NBA scale, which
  // this bar's CSS is shared with).
  var RATING_BAR_MIN = -2, RATING_BAR_MAX = 2, RATING_BAR_RANGE = 4;
  function ratingBar(rating) {
    if (rating === null || rating === undefined) {
      return '<div class="rating-bar-wrap"><span class="rating-cell">-</span></div>';
    }
    var clipped = Math.max(RATING_BAR_MIN, Math.min(RATING_BAR_MAX, rating));
    var leftPct, widthPct;
    if (clipped >= 0) {
      leftPct = 50;
      widthPct = (clipped / RATING_BAR_RANGE) * 100;
    } else {
      widthPct = (-clipped / RATING_BAR_RANGE) * 100;
      leftPct = 50 - widthPct;
    }
    return (
      '<div class="rating-bar-wrap"><span class="rating-cell">' + fmtRating(rating) + '</span>' +
      '<div class="rating-bar-track"><div class="rating-bar-center-line"></div>' +
      '<div class="rating-bar-fill ' + (rating >= 0 ? "bar-pos" : "bar-neg") + '" style="left:' + leftPct.toFixed(1) + "%;width:" + widthPct.toFixed(1) + '%"></div></div></div>'
    );
  }

  // Compact "W-L" elim record. "-" when no elim activity (dailies-only
  // player, DQ'd before their first elim, or a season predating elim-chart
  // coverage). `survived`: player lost an elim round but didn't end the
  // season as Eliminated (Redemption/Mercenary/Purgatory comeback, or a
  // multi-elim mechanic like BotE2's double-cross) - flagged with an asterisk.
  function fmtElim(w, l, survived) {
    w = w || 0; l = l || 0;
    if (w === 0 && l === 0) return '<span class="sport-dim-dash">-</span>';
    var star = survived
      ? '<sup class="elim-survived" title="Lost an elim round but did not end the season as Eliminated (comeback mechanic, mercenary role, or multi-elim format).">*</sup>'
      : "";
    return w + "-" + l + star;
  }

  function fmtRank(rank, total) {
    if (rank == null) return '<span class="sport-dim-dash">-</span>';
    if (!total) return String(rank);
    return rank + ' <span class="finish-sub">(of ' + total + ")</span>";
  }

  // Player-partner context for a season row: `partners_history` (rotating
  // partner chains, preserves X->Y->X transitions), else a single `partner`,
  // else a `team` label.
  function renderPartnerContext(s) {
    var ctx = "";
    var ph = s.partners_history || [];
    if (ph.length > 1) {
      ctx = "with " + ph.map(playerLink).join('<span class="finish-sub"> &rarr; </span>');
    } else if (s.partner) {
      ctx = "with " + playerLink(s.partner);
    } else if (s.team) {
      ctx = escapeHtml(s.team);
    }
    if (s.forced_exit) {
      ctx += ' <span class="footnote-marker" title="Shared exit - partner had the same DQ/quit. Attribution uncertain.">&#9888;&#65039;</span>';
    }
    return ctx;
  }

  // Standardized finish: medal badge for top-3 + a short label (Champion/
  // Runner-up/3rd/Eliminated/etc). `entry` is a season-row dict (finish_label/
  // finish_episode/finish, or elim_position/elim_total/eliminated_by).
  function fmtFinish(entry) {
    if (!entry) return "";
    var label = entry.finish_label || "", episode = entry.finish_episode || "", raw = entry.finish || "";
    var elimPos = entry.elim_position, elimTot = entry.elim_total, elimBy = entry.eliminated_by || [];
    if (!label && raw) {
      if (/^Winners?\b/i.test(raw)) label = "Champion";
      else if (/^Runners?[- ]?Up/i.test(raw)) label = "Runner-up";
      else if (/^Third Place/i.test(raw)) label = "3rd";
      else if (/^Fourth Place/i.test(raw)) label = "4th";
      else if (/^Fifth Place/i.test(raw)) label = "5th";
      else if (/medically/i.test(raw)) label = "Medical DQ";
      else if (/disqualif/i.test(raw)) label = "Disqualified";
      else if (/^Quit/i.test(raw)) label = "Quit";
      else if (/withdrew|removed/i.test(raw)) label = "Removed";
      else if (/^Eliminated/i.test(raw)) label = "Eliminated";
      else label = raw;
      if (!episode) {
        var m = raw.match(/\bin\s+(.+?)\s*$/i);
        if (m) episode = m[1];
      }
    }
    var badge = "";
    if (label === "Champion") badge = '<span class="finish-badge finish-champion">&#129351;</span>';
    else if (label === "Runner-up") badge = '<span class="finish-badge finish-runner">&#129352;</span>';
    else if (label === "3rd") badge = '<span class="finish-badge finish-bronze">&#129353;</span>';

    var ord = function (n) {
      var suf = ["st", "nd", "rd"][((n + 90) % 100 - 10) % 10 - 1] || "th";
      return n + suf;
    };
    var subBits = [];
    if (label === "Eliminated" && elimBy.length) {
      subBits.push("by " + elimBy.map(playerLink).join(" &amp; "));
    }
    if (elimPos && elimTot) subBits.push(ord(elimPos) + " of " + elimTot);
    if (episode) subBits.push(escapeHtml(episode));
    var subHtml = subBits.length ? ' <span class="finish-sub">' + subBits.join(" &middot; ") + "</span>" : "";
    return badge + escapeHtml(label) + subHtml;
  }

  // ── player/season deep-linking ─────────────────────────────────────────

  // Only render as a clickable link if the player is indexed (recent
  // first-season cast often aren't yet, due to the rating eligibility
  // threshold) - avoids dead clicks.
  function playerLink(name) {
    if (!name) return "";
    if (state.playerSet && state.playerSet.has(name)) {
      return '<span class="team-cell linked" data-jump-player="' + escapeHtml(name) + '">' + escapeHtml(name) + "</span>";
    }
    return escapeHtml(name);
  }

  function seasonLink(seasonId, label, preAnchor) {
    if (preAnchor) {
      return '<td class="season-cell">' + escapeHtml(label) + ' <sup class="footnote-marker" title="Pre-S5 team-format season. Title counts toward career totals but the season is not modeled in ratings.">&dagger;</sup></td>';
    }
    return '<td class="season-cell linked" data-jump-season="' + escapeHtml(seasonId) + '">' + escapeHtml(label) + "</td>";
  }

  document.addEventListener("click", function (e) {
    var playerEl = e.target.closest("[data-jump-player]");
    if (playerEl) { jumpToPlayer(playerEl.dataset.jumpPlayer); return; }
    var seasonEl = e.target.closest("[data-jump-season]");
    if (seasonEl) { jumpToSeason(seasonEl.dataset.jumpSeason); return; }
  });

  function jumpToPlayer(name) {
    if (!state.playersIndex) return;
    var p = state.playersIndex.filter(function (x) { return x.player === name; })[0];
    if (!p) return;
    state.playerGender = p.gender;
    document.querySelectorAll("#playerGenderPills .pill").forEach(function (b) {
      b.classList.toggle("active", b.dataset.gender === p.gender);
    });
    // A 1-season deep-link target (e.g. an S41 newcomer) would be hidden by
    // the default "3+ seasons" scope filter - auto-flip to "All players" so
    // the dropdown stays in sync with the rendered view.
    if ((p.n_seasons || 0) < 3 && state.playerScope === "3plus") {
      state.playerScope = "all";
      document.querySelectorAll("#playerScopePills .pill").forEach(function (b) {
        b.classList.toggle("active", b.dataset.scope === "all");
      });
    }
    populatePlayerDropdown();
    document.getElementById("playerSelect").value = p.safe_name;
    activateTab("player-summary");
    renderPlayer(p.safe_name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToSeason(sid) {
    document.getElementById("tcSeasonSelect").value = sid;
    renderStandings(sid);
    activateTab("standings");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  document.getElementById("tcTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  // ═══════════════════════════════ Standings ═══════════════════════════════

  function loadStandings() {
    return fetchJSON("seasons_index.json").then(function (idx) {
      state.seasonsIndex = idx;
      var sel = document.getElementById("tcSeasonSelect");
      sel.innerHTML = idx.map(function (s) { return '<option value="' + s.season_id + '">' + escapeHtml(s.label) + "</option>"; }).join("");
      sel.addEventListener("change", function () { renderStandings(sel.value); });
      return renderStandings(idx[0].season_id);
    });
  }

  function renderStandings(sid) {
    if (!sid) return Promise.resolve();
    return fetchJSON("seasons/" + sid + ".json").then(function (data) {
      ["M", "F"].forEach(function (g) {
        var standings = data.standings_at_end[g] || [];
        var wrap = document.getElementById(g === "M" ? "standingsTableM" : "standingsTableF");
        if (!standings.length) {
          wrap.innerHTML = '<p class="sport-loading">No ratings published</p>';
          return;
        }
        var rows = standings.map(function (s) {
          var ctx = renderPartnerContext(s);
          var ctxHtml = ctx ? '<div class="partner-context">' + ctx + "</div>" : "";
          var isMerc = s.finish === "Champion Mercenary";
          var dagger = isMerc ? ' <sup class="footnote-marker" title="Champion Mercenary cameo">&dagger;</sup>' : "";
          var rankCell = s.rank == null ? '<span class="sport-dim-dash">-</span>' : s.rank;
          return (
            '<tr class="' + (isMerc ? "mercenary-row" : "") + '">' +
            '<td class="col-rank">' + rankCell + "</td>" +
            '<td class="player-cell">' + playerLink(s.player) + ctxHtml + "</td>" +
            '<td class="num stat-narrow col-hide-mobile">' + (s.daily_wins || 0) + "</td>" +
            '<td class="num stat-narrow col-hide-mobile">' + fmtElim(s.elim_wins, s.elim_losses, s.elim_loss_survived) + "</td>" +
            '<td class="finish-cell">' + fmtFinish(s) + dagger + "</td>" +
            "<td>" + ratingBar(s.rating) + "</td>" +
            "</tr>"
          );
        }).join("");
        var anyMerc = standings.some(function (s) { return s.finish === "Champion Mercenary"; });
        var footnote = anyMerc
          ? '<p class="data-note footnote"><sup>&dagger;</sup> Champion Mercenary cameos. Vets brought in for one Arena elimination, not full-season cast - excluded from this season\'s rank/rating and from career PEAK/ERA totals.</p>'
          : "";
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">Rank</th><th>Player</th>' +
          '<th class="stat-narrow col-hide-mobile">Daily</th><th class="stat-narrow col-hide-mobile">Elim</th>' +
          "<th>Finish</th><th>Rating</th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
      });
    });
  }

  // ═══════════════════════════════ Player Summary ═══════════════════════════════

  function populatePlayerDropdown() {
    var sel = document.getElementById("playerSelect");
    var scopeFilter = state.playerScope === "3plus"
      ? function (p) { return (p.n_seasons || 0) >= 3; }
      : function () { return true; };
    var filtered = state.playersIndex
      .filter(scopeFilter)
      .filter(function (p) { return state.playerGender === "all" || p.gender === state.playerGender; })
      .slice()
      .sort(function (a, b) { return a.player.localeCompare(b.player); });
    var labelFor = state.playerGender === "all"
      ? function (p) { return p.player + " · " + (p.gender === "M" ? "M" : "F"); }
      : function (p) { return p.player; };
    sel.innerHTML = '<option value="">- Select a player -</option>' +
      filtered.map(function (p) { return '<option value="' + p.safe_name + '">' + escapeHtml(labelFor(p)) + "</option>"; }).join("");
  }

  function loadPlayer() {
    return fetchJSON("players_index.json").then(function (idx) {
      state.playersIndex = idx;
      state.playerSet = new Set(idx.map(function (p) { return p.player; }));
      populatePlayerDropdown();
      var sel = document.getElementById("playerSelect");
      sel.addEventListener("change", function () { renderPlayer(sel.value); });
    });
  }

  document.querySelectorAll("#playerGenderPills .pill").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#playerGenderPills .pill").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.playerGender = btn.dataset.gender;
      populatePlayerDropdown();
    });
  });
  document.querySelectorAll("#playerScopePills .pill").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#playerScopePills .pill").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.playerScope = btn.dataset.scope;
      populatePlayerDropdown();
    });
  });

  function renderPlayer(safe) {
    var contentEl = document.getElementById("playerContent");
    if (!safe) {
      contentEl.innerHTML = '<p class="sport-loading">Select a player above</p>';
      return Promise.resolve();
    }
    return fetchJSON("players/" + safe + ".json").then(function (p) {
      var c = p.career;
      var header =
        '<div class="player-card"><h2>' + escapeHtml(p.player) + "</h2>" +
        '<p class="player-meta">' + (p.gender === "M" ? "Men's" : "Women's") + " bracket</p>" +
        '<div class="stats-row">' +
        '<div class="stat-tile"><div class="stat-label">Seasons</div><div class="stat-value">' + c.n_seasons + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Daily Wins</div><div class="stat-value">' + c.daily_wins + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Elim Record</div><div class="stat-value">' + c.elim_wins + "-" + c.elim_losses + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Finals</div><div class="stat-value">' + c.finals_reached + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Championships</div><div class="stat-value">' + c.championships + "</div></div>" +
        '<div class="stat-tile headline"><div class="stat-label">ERA</div><div class="stat-value">' + fmtEra(c.era_rating) + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Peak Rating</div><div class="stat-value">' + fmtRating(c.peak_rating) + "</div></div>" +
        "</div></div>";

      var chartCard = '<div class="sport-chart-wrap"><p class="sport-subhead">fakeronjan WLS rating &middot; season-by-season</p><svg id="playerChart" class="sport-lavin-chart"></svg></div>';

      var rows = p.seasons.map(function (s) {
        var ctx = renderPartnerContext(s);
        var seasonCell = (s.season_num != null && s.season_num < 5)
          ? '<td class="season-cell">' + escapeHtml(s.label) + "</td>"
          : '<td class="season-cell linked" data-jump-season="' + escapeHtml(s.season_id) + '">' + escapeHtml(s.label) + "</td>";
        return (
          "<tr>" + seasonCell +
          '<td class="finish-sub">' + (ctx || '<span class="sport-dim-dash">-</span>') + "</td>" +
          '<td class="num col-hide-mobile">' + (s.daily_wins || 0) + "</td>" +
          '<td class="num col-hide-mobile">' + fmtElim(s.elim_wins, s.elim_losses, s.elim_loss_survived) + "</td>" +
          '<td class="finish-cell">' + fmtFinish(s) + "</td>" +
          '<td class="col-rank">' + fmtRank(s.rank, s.rank_total) + "</td>" +
          "<td>" + ratingBar(s.rating_at_end) + "</td>" +
          "</tr>"
        );
      }).join("");
      var table =
        '<div class="sport-table-wrap"><table class="sport-table"><thead><tr>' +
        "<th>Season</th><th>Partner / Team</th>" +
        '<th class="col-hide-mobile">Daily Wins</th><th class="col-hide-mobile">Eliminations</th>' +
        "<th>Finish</th><th>Rank</th><th>Rating</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>";

      contentEl.innerHTML = header + chartCard + table;
      drawTimeline(p);
    });
  }

  // Fixed Y-axis range so every player's graph is visually comparable;
  // -1.3..+1.3 covers the spread of GOAT > Best Single Seasons peak ratings.
  var TIMELINE_MIN = -1.3, TIMELINE_MAX = 1.3;

  function drawTimeline(p) {
    var svg = document.getElementById("playerChart");
    if (!p.timeline.length) { svg.innerHTML = ""; return; }
    var W = svg.parentElement.clientWidth - 32;
    var H = 200;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var padL = 32, padR = 12, padT = 16, padB = 28;
    var innerW = W - padL - padR, innerH = H - padT - padB;

    var minR = TIMELINE_MIN, maxR = TIMELINE_MAX;
    function ys(r) {
      var clipped = Math.max(TIMELINE_MIN, Math.min(TIMELINE_MAX, r));
      return padT + innerH - innerH * ((clipped - minR) / (maxR - minR));
    }

    // Single-snapshot players (one-and-done seasons) can't form a polyline -
    // render a single dot centered in the chart instead of an empty graph.
    if (p.timeline.length === 1) {
      var t0 = p.timeline[0];
      var zero0 = ys(0);
      var cx = padL + innerW / 2;
      var cy = ys(t0.rating);
      svg.innerHTML =
        '<line class="chart-zero" x1="' + padL + '" y1="' + zero0.toFixed(1) + '" x2="' + (W - padR).toFixed(1) + '" y2="' + zero0.toFixed(1) + '" stroke-width="1" stroke-dasharray="4,3"/>' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + (t0.rating >= 0 ? "var(--accent)" : "var(--accent-2)") + '"/>' +
        '<text class="chart-ticklabel" x="4" y="' + (padT + 4).toFixed(1) + '" font-size="10">' + maxR.toFixed(1) + "</text>" +
        '<text class="chart-ticklabel" x="4" y="' + (zero0 + 3).toFixed(1) + '" font-size="10">0</text>' +
        '<text class="chart-ticklabel" x="4" y="' + (H - padB + 2).toFixed(1) + '" font-size="10">' + minR.toFixed(1) + "</text>";
      return;
    }

    function xs(i) { return padL + innerW * (i / (p.timeline.length - 1 || 1)); }

    var transitions = [];
    var prevSid = null;
    p.timeline.forEach(function (t, i) {
      if (t.season_id !== prevSid) { transitions.push({ idx: i, season_id: t.season_id }); prevSid = t.season_id; }
    });

    var points = p.timeline.map(function (t, i) { return xs(i).toFixed(1) + "," + ys(t.rating).toFixed(1); }).join(" ");
    var zero = ys(0);
    var zeroFrac = zero / H;

    var minLabelGap = 28;
    var lastLabelX = -Infinity;
    var ticks = transitions.map(function (t) {
      var x = xs(t.idx);
      var m = t.season_id.match(/^s(\d+)/);
      var label = m ? "S" + parseInt(m[1], 10) : "";
      var showLabel = x - lastLabelX >= minLabelGap;
      if (showLabel) lastLabelX = x;
      return (
        '<line class="chart-grid" x1="' + x.toFixed(1) + '" y1="' + padT + '" x2="' + x.toFixed(1) + '" y2="' + (padT + innerH) + '" stroke-width="1"/>' +
        (showLabel ? '<text class="chart-ticklabel" x="' + x.toFixed(1) + '" y="' + (H - 8) + '" font-size="9" text-anchor="middle">' + label + "</text>" : "")
      );
    }).join("");

    // Gradient split at the zero line: var(--accent) above, var(--accent-2)
    // below, resolving per-theme same as everywhere else on the page (this
    // reference site's own hex WAS the fleet's light-mode accent pair, but
    // resolving through the CSS vars keeps it correct in dark mode too).
    svg.innerHTML =
      '<defs><linearGradient id="playerLineGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
      '<stop offset="' + (zeroFrac - 0.0001).toFixed(4) + '" stop-color="var(--accent)"/>' +
      '<stop offset="' + (zeroFrac + 0.0001).toFixed(4) + '" stop-color="var(--accent-2)"/>' +
      "</linearGradient></defs>" +
      '<line class="chart-zero" x1="' + padL + '" y1="' + zero.toFixed(1) + '" x2="' + (W - padR).toFixed(1) + '" y2="' + zero.toFixed(1) + '" stroke-width="1" stroke-dasharray="4,3"/>' +
      ticks +
      '<polyline points="' + points + '" fill="none" stroke="url(#playerLineGrad)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<text class="chart-ticklabel" x="4" y="' + (padT + 4).toFixed(1) + '" font-size="10">' + maxR.toFixed(1) + "</text>" +
      '<text class="chart-ticklabel" x="4" y="' + (zero + 3).toFixed(1) + '" font-size="10">0</text>' +
      '<text class="chart-ticklabel" x="4" y="' + (H - padB + 2).toFixed(1) + '" font-size="10">' + minR.toFixed(1) + "</text>";
  }

  // ═══════════════════════════════ Champions ═══════════════════════════════

  function loadChampions() {
    return fetchJSON("champions.json").then(function (data) {
      state.championsData = data;
      renderChampions();
    });
  }

  function renderChampions() {
    var data = state.championsData;
    if (!data) return;
    var bySeason = {};
    var anyPreAnchor = false;
    ["M", "F"].forEach(function (g) {
      (data[g] || []).forEach(function (c) {
        if (!bySeason[c.season_id]) {
          bySeason[c.season_id] = {
            season_id: c.season_id, label: c.label, season_num: c.season_num, pre_anchor: !!c.pre_anchor,
            M: { winners: [], runners_up: [] }, F: { winners: [], runners_up: [] },
          };
        }
        if (c.pre_anchor) anyPreAnchor = true;
        var bucket = c.role === "winner" ? "winners" : "runners_up";
        bySeason[c.season_id][g][bucket].push(c);
      });
    });
    var seasons = Object.keys(bySeason).map(function (k) { return bySeason[k]; })
      .sort(function (a, b) { return b.season_num - a.season_num; });

    function champCell(arr) {
      if (!arr.length) return '<span class="sport-dim-dash">-</span>';
      return arr.map(function (c) {
        var total = c.championship_no ? ' <span class="finish-sub">(' + c.championship_no + " &#129351;)</span>" : "";
        return playerLink(c.player) + total;
      }).join("<br>");
    }
    function ruCell(arr) {
      if (!arr.length) return '<span class="sport-dim-dash">-</span>';
      return arr.map(function (c) {
        var total = c.runner_up_no ? ' <span class="finish-sub">(' + c.runner_up_no + " &#129352;)</span>" : "";
        return playerLink(c.player) + total;
      }).join("<br>");
    }

    var rows = seasons.map(function (s) {
      return (
        '<tr class="' + (s.pre_anchor ? "pre-anchor-row" : "") + '">' +
        seasonLink(s.season_id, s.label, s.pre_anchor) +
        '<td class="col-champ">' + champCell(s.M.winners) + "</td>" +
        '<td class="col-champ">' + champCell(s.F.winners) + "</td>" +
        '<td class="col-ru">' + ruCell(s.M.runners_up) + "</td>" +
        '<td class="col-ru">' + ruCell(s.F.runners_up) + "</td>" +
        "</tr>"
      );
    }).join("");
    var footnote = anyPreAnchor
      ? '<p class="data-note footnote"><sup>&dagger;</sup> Pre-S5 team-format seasons. Titles count toward career totals but these seasons aren\'t modeled in ratings (LAVIN starts at S5, the first pair-format season).</p>'
      : "";
    document.getElementById("championsTableWrap").innerHTML =
      '<table class="sport-table"><thead><tr>' +
      "<th>Season</th>" +
      '<th class="col-champ">Men\'s Champion <span class="finish-badge finish-champion">&#129351;</span></th>' +
      '<th class="col-champ">Women\'s Champion <span class="finish-badge finish-champion">&#129351;</span></th>' +
      '<th class="col-ru">Men\'s Runner-Up <span class="finish-badge finish-runner">&#129352;</span></th>' +
      '<th class="col-ru">Women\'s Runner-Up <span class="finish-badge finish-runner">&#129352;</span></th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table>" + footnote;
  }

  // ═══════════════════════════════ GOAT ═══════════════════════════════

  function loadGoat() {
    return Promise.all([fetchJSON("goat_players.json"), fetchJSON("goat_player_seasons.json")]).then(function (results) {
      state.goatData = { career: results[0], seasons: results[1] };
      renderGoat();
    });
  }

  function renderGoat() {
    if (!state.goatData) return;
    ["M", "F"].forEach(function (g) {
      var wrap = document.getElementById(g === "M" ? "goatTableM" : "goatTableF");
      if (state.goatView === "career") {
        var list = state.goatData.career[g] || [];
        var rows = list.map(function (p) {
          return (
            '<tr><td class="col-rank">' + p.rank + "</td>" +
            "<td>" + playerLink(p.player) + "</td>" +
            '<td class="rating-cell">' + fmtEra(p.era_rating) + "</td>" +
            '<td class="rating-cell">' + fmtRating(p.peak_rating) + "</td>" +
            '<td class="num">' + p.n_seasons + "</td>" +
            '<td class="num">' + p.finals_reached + "</td>" +
            '<td class="num">' + p.championships + (p.championships ? " &#129351;" : "") + "</td></tr>"
          );
        }).join("");
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">Rank</th><th>Player</th><th>ERA</th><th>Peak</th><th>Sn</th><th>Finals</th><th>Champs</th>' +
          "</tr></thead><tbody>" + rows + "</tbody></table>";
      } else if (state.goatView === "components") {
        var dim = state.goatSort;
        var list2 = (state.goatData.career[g] || []).slice().sort(function (a, b) {
          return (b[dim] || 0) - (a[dim] || 0);
        });
        function dimCell(p, key) {
          var v = p[key] || 0;
          var isCurrent = key === dim;
          var pct = "";
          if (key !== "era_rating") {
            var sum = (p.era_daily || 0) + (p.era_elim || 0) + (p.era_within || 0) + (p.era_field || 0);
            if (sum > 0) pct = '<div class="finish-sub">' + Math.round((v / sum) * 100) + "%</div>";
          }
          return '<td class="rating-cell' + (isCurrent ? " sort-active" : "") + '">' + fmtEra(v) + pct + "</td>";
        }
        var rows2 = list2.map(function (p) {
          return (
            '<tr><td class="col-rank">' + p.rank + "</td>" +
            "<td>" + playerLink(p.player) + "</td>" +
            dimCell(p, "era_rating") + dimCell(p, "era_daily") + dimCell(p, "era_elim") + dimCell(p, "era_within") + dimCell(p, "era_field") +
            "</tr>"
          );
        }).join("");
        function dimHeader(label, key) {
          return '<th class="' + (key === dim ? "sort-active" : "") + '">' + label + "</th>";
        }
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">Rank</th><th>Player</th>' +
          dimHeader("Total", "era_rating") + dimHeader("Daily", "era_daily") + dimHeader("Elim", "era_elim") +
          dimHeader("Won Final", "era_within") + dimHeader("Made Final", "era_field") +
          "</tr></thead><tbody>" + rows2 + "</tbody></table>";
      } else {
        var list3 = state.goatData.seasons[g] || [];
        var rows3 = list3.map(function (p) {
          return (
            '<tr><td class="col-rank">' + p.rank + "</td>" +
            "<td>" + playerLink(p.player) + "</td>" +
            '<td class="season-cell linked" data-jump-season="' + escapeHtml(p.season_id) + '">' + escapeHtml(p.season_label) + "</td>" +
            '<td class="rating-cell">' + fmtRating(p.rating_at_end) + "</td></tr>"
          );
        }).join("");
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">Rank</th><th>Player</th><th>Season</th><th>Rating</th>' +
          "</tr></thead><tbody>" + rows3 + "</tbody></table>";
      }
    });
  }

  document.getElementById("goatViewPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#goatViewPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.goatView = btn.dataset.view;
    document.getElementById("goatSortPills").hidden = state.goatView !== "components";
    var notes = {
      career: "Top 50 careers by sum of positive end-of-season ratings. Rewards quality × longevity.",
      components: "Same Top 50 as Best Careers, but each ERA column is computed from an isolation run (only that event type counts). Columns are NOT additive - they show which dimension drives each player.",
      seasons: "Top 50 single-season ratings (end-of-season rating, filtered to that season's cast).",
    };
    document.getElementById("goatNote").textContent = notes[state.goatView];
    renderGoat();
  });
  document.getElementById("goatSortPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#goatSortPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.goatSort = btn.dataset.sort;
    renderGoat();
  });

  // ── Init ──
  fetchJSON("seasons_index.json").then(function (seasonIdx) {
    var latest = seasonIdx[0];
    var stamp = latest.finale_aired || String(latest.year);
    document.getElementById("tcUpdated").textContent = "Last updated: S" + latest.season_num + " " + stamp;
  });

  loadPlayer().then(function () {
    return Promise.all([loadStandings(), loadChampions(), loadGoat()]);
  }).catch(function () {
    document.getElementById("standingsTableM").innerHTML = '<p class="sport-error">Could not load ratings</p>';
  });

  window.addEventListener("resize", function () {
    var safe = document.getElementById("playerSelect").value;
    if (safe && document.getElementById("player-summary").classList.contains("active")) {
      fetchJSON("players/" + safe + ".json").then(drawTimeline);
    }
  });
})();
