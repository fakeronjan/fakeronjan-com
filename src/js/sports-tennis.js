(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var state = {
    DATA: { m: [], w: [] },
    PLAYERS: { m: {}, w: {} },
    mwState: { slamchase: "m", tournament: "m" },
  };

  var SLAM_ORDER = ["AO", "FO", "Wim", "US"];
  var SLAM_FLAG = { AO: "🇦🇺", FO: "🇫🇷", Wim: "🇬🇧", US: "🇺🇸" };

  // Cohorts: ordered groups; first pill is the default. Ported 1:1 from CHANG-CAPRIATI.
  var COHORTS = {
    m: [
      { key: "all", label: "Full Open Era", sub: "Every player with at least 8 Open Era slams (1968 to today)", filter: "top", threshold: 8 },
      { key: "borg", label: "Borg / McEnroe / Lendl", sub: "The 1970s-80s peer set", players: ["Björn Borg", "Jimmy Connors", "John McEnroe", "Ivan Lendl", "Mats Wilander"] },
      { key: "90s", label: "Sampras / Agassi", sub: "The defining 90s rivalry - Sampras rising from 1990, Edberg, Becker, Courier as peers", players: ["Pete Sampras", "Andre Agassi", "Stefan Edberg", "Boris Becker", "Jim Courier"] },
      { key: "sampras", label: "Federer / Nadal / Djokovic", sub: "From Wimbledon 2003 (Federer's 1st): Sampras as the bar at 14 (dashed), then the Big 3 running it down", players: ["Roger Federer", "Rafael Nadal", "Novak Djokovic"], startFromPlayer: "Roger Federer" },
      { key: "nextgen", label: "Next gen", sub: "Alcaraz and Sinner chasing the all-time Open Era leader (Djokovic at 24)", players: ["Carlos Alcaraz", "Jannik Sinner"] },
    ],
    w: [
      { key: "all", label: "Full Open Era", sub: "Every player with at least 7 Open Era slams (1968 to today)", filter: "top", threshold: 7 },
      { key: "court", label: "The Court / King era", sub: "The first Open Era leaders. Court reset the bar at 11 Open Era slams.", players: ["Margaret Smith Court", "Billie Jean Moffitt King", "Evonne Goolagong Cawley", "Virginia Wade", "Chris Evert"] },
      { key: "evert", label: "Evert / Navratilova", sub: "The defining rivalry of the late 70s and 80s", players: ["Chris Evert", "Martina Navratilova", "Hana Mandlíková", "Tracy Austin"] },
      { key: "graf", label: "The Graf era", sub: "Graf passing Evert in 1996; Seles, Sabatini, Sánchez Vicario, Hingis as peers", players: ["Steffi Graf", "Monica Seles", "Gabriela Sabatini", "Arantxa Sánchez Vicario", "Martina Hingis"] },
      { key: "serena", label: "The Williams era", sub: "Serena passing Graf in 2017; Henin, Clijsters, Sharapova, Venus as peers", players: ["Serena Williams", "Venus Williams", "Justine Henin", "Kim Clijsters", "Maria Sharapova"] },
      { key: "current", label: "Current generation", sub: "The post-Serena cohort with no clear leader yet", players: ["Iga Świątek", "Aryna Sabalenka", "Coco Gauff", "Elena Rybakina", "Madison Keys", "Naomi Osaka", "Barbora Krejčíková", "Markéta Vondroušová", "Jeļena Ostapenko", "Sofia Kenin", "Bianca Andreescu"] },
    ],
  };

  var PALETTE = ["#1a6b8a", "#ff6eb4", "#ef6c00", "#2e7d32", "#6a1b9a", "#c62828", "#00838f", "#5d4037", "#455a64", "#827717", "#0277bd", "#ad1457"];

  // ── formatting helpers ─────────────────────────────────────────────────────

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function flagEmoji(iso) {
    if (!iso || iso.length !== 2) return "";
    var A = 0x1F1E6;
    return String.fromCodePoint(A + iso.charCodeAt(0) - 65, A + iso.charCodeAt(1) - 65);
  }

  function playerFlag(tour, name) {
    var iso = state.PLAYERS[tour] && state.PLAYERS[tour][name];
    return iso ? flagEmoji(iso) : "";
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

  document.getElementById("tnTabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".sport-tab");
    if (!btn) return;
    activateTab(btn.dataset.tab);
    if (btn.dataset.tab === "slamchase") refreshSlamChase(state.mwState.slamchase);
  });

  // ── M/W pill handling ───────────────────────────────────────────────────

  function applyMW(tabId, mw) {
    state.mwState[tabId] = mw;
    document.querySelectorAll('.pill-group[data-mw-target="' + tabId + '"] .pill').forEach(function (b) {
      b.classList.toggle("active", b.dataset.mw === mw);
    });
    document.querySelectorAll('.mw-section[data-tab="' + tabId + '"]').forEach(function (sec) {
      sec.hidden = sec.dataset.mw !== mw;
    });
    if (tabId === "slamchase") refreshSlamChase(mw);
  }

  document.querySelectorAll(".pill-group[data-mw-target]").forEach(function (wrap) {
    var tabId = wrap.dataset.mwTarget;
    wrap.querySelectorAll(".pill[data-mw]").forEach(function (btn) {
      btn.addEventListener("click", function () { applyMW(tabId, btn.dataset.mw); });
    });
  });

  // ── data loading ─────────────────────────────────────────────────────────

  // Loads the slam-champions bundle (data + players flag map) from
  // docs/data/slams.json - published there specifically for this port
  // (previously only existed baked into CHANG-CAPRIATI's own HTML).
  function loadSlamsBundle() {
    return fetch(BASE + "/slams.json")
      .then(function (r) { return r.json(); })
      .then(function (bundle) {
        state.DATA = bundle.data || { m: [], w: [] };
        state.PLAYERS = bundle.players || { m: {}, w: {} };
      });
  }

  // ═══════════════════════════════ Champions ═══════════════════════════════

  function renderTournamentGrid(tour) {
    var tbodyId = tour === "m" ? "tournamentTableMWrap" : "tournamentTableWWrap";
    var wrap = document.getElementById(tbodyId);
    var slams = state.DATA[tour];
    var totalCount = {}, perTourney = {};
    var enriched = slams.map(function (r) {
      totalCount[r.w] = (totalCount[r.w] || 0) + 1;
      perTourney[r.w] = perTourney[r.w] || { AO: 0, FO: 0, Wim: 0, US: 0 };
      perTourney[r.w][r.s] += 1;
      return Object.assign({}, r, { total: totalCount[r.w], inTourney: perTourney[r.w][r.s] });
    });
    var byYear = {};
    enriched.forEach(function (r) {
      if (!byYear[r.y]) byYear[r.y] = { AO: [], FO: [], Wim: [], US: [] };
      byYear[r.y][r.s].push(r);
    });
    var years = Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; });

    function cellFor(winners) {
      if (!winners || winners.length === 0) return '<td class="empty">-</td>';
      function renderOne(r) {
        var flag = playerFlag(tour, r.w);
        var flagPart = flag ? '<span class="winner-flag">' + flag + "</span> " : "";
        var counts = "(" + r.inTourney + " " + SLAM_FLAG[r.s] + ", " + r.total + " total)";
        return '<div class="winner-entry"><div class="winner-name">' + flagPart + escapeHtml(r.w) + '</div><div class="winner-num">' + counts + "</div></div>";
      }
      if (winners.length === 1) return "<td>" + renderOne(winners[0]) + "</td>";
      return '<td><div class="winner-stack">' + winners.map(renderOne).join("") + "</div></td>";
    }

    var rows = years.map(function (y) {
      var row = byYear[y];
      var hasDouble = Object.keys(row).some(function (s) { return row[s].length > 1; });
      var yearLabel = hasDouble ? y + '<sup class="year-flag">*</sup>' : String(y);
      return (
        "<tr><td class=\"year-cell\">" + yearLabel + "</td>" +
        cellFor(row.AO) + cellFor(row.FO) + cellFor(row.Wim) + cellFor(row.US) +
        "</tr>"
      );
    }).join("");

    wrap.innerHTML =
      '<table class="grid-table sport-table"><thead><tr>' +
      '<th class="col-rank">Year</th>' +
      "<th>" + SLAM_FLAG.AO + " Australian Open</th>" +
      "<th>" + SLAM_FLAG.FO + " French Open</th>" +
      "<th>" + SLAM_FLAG.Wim + " Wimbledon</th>" +
      "<th>" + SLAM_FLAG.US + " US Open</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  // ═══════════════════════════════ Slam Chase ═══════════════════════════════

  function buildSeries(tour, cohort) {
    var slams = state.DATA[tour];
    var players;
    if (cohort.filter === "top") {
      var counts = {};
      slams.forEach(function (r) { counts[r.w] = (counts[r.w] || 0) + 1; });
      players = Object.keys(counts).filter(function (n) { return counts[n] >= cohort.threshold; })
        .sort(function (a, b) { return counts[b] - counts[a]; });
    } else {
      players = cohort.players.slice();
    }

    var series = {};
    players.forEach(function (p) { series[p] = []; });
    var leader = [];
    var xLabels = [];
    var counts2 = {};
    var maxName = null, maxCount = 0;

    slams.forEach(function (r, i) {
      counts2[r.w] = (counts2[r.w] || 0) + 1;
      if (counts2[r.w] > maxCount) { maxCount = counts2[r.w]; maxName = r.w; }
      if (players.indexOf(r.w) !== -1) series[r.w].push({ i: i, count: counts2[r.w] });
      leader.push({ i: i, count: maxCount, name: maxName });
      xLabels.push({ i: i, year: r.y, slam: r.s });
    });

    var xStart, xEnd;
    if (cohort.filter === "top") {
      xStart = 0;
      xEnd = slams.length - 1;
    } else {
      var hits = [];
      players.forEach(function (p) { series[p].forEach(function (pt) { hits.push(pt.i); }); });
      if (hits.length === 0) {
        xStart = 0; xEnd = slams.length - 1;
      } else {
        xStart = Math.max(0, Math.min.apply(null, hits) - 1);
        xEnd = Math.min(slams.length - 1, Math.max.apply(null, hits) + 1);
        if (cohort.startFromPlayer && series[cohort.startFromPlayer] && series[cohort.startFromPlayer].length) {
          xStart = Math.max(0, series[cohort.startFromPlayer][0].i - 1);
        }
      }
    }

    return { players: players, series: series, leader: leader, xLabels: xLabels, xStart: xStart, xEnd: xEnd, totalSlams: slams.length };
  }

  function renderChart1(svgId, legendId, legendId2, tour, cohort) {
    var built = buildSeries(tour, cohort);
    var players = built.players, series = built.series, leader = built.leader, xLabels = built.xLabels, xStart = built.xStart, xEnd = built.xEnd;
    var svg = document.getElementById(svgId);
    var W = svg.parentElement.clientWidth - 32;
    var H = 360;
    var padL = 36, padR = 12, padT = 12, padB = 30;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    var yMax = 1;
    players.forEach(function (p) {
      series[p].forEach(function (pt) { if (pt.i >= xStart && pt.i <= xEnd) yMax = Math.max(yMax, pt.count); });
    });
    for (var i = xStart; i <= xEnd; i++) yMax = Math.max(yMax, leader[i].count);
    yMax = Math.ceil((yMax + 1) / 5) * 5;

    function px(i) { return padL + (i - xStart) / (xEnd - xStart) * (W - padL - padR); }
    function py(c) { return padT + (1 - c / yMax) * (H - padT - padB); }

    var grid = "", ylab = "";
    for (var v = 0; v <= yMax; v += 5) {
      var y = py(v);
      grid += '<line class="chart-grid" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke-width="1"/>';
      ylab += '<text class="chart-ticklabel" x="' + (padL - 4) + '" y="' + (y + 3).toFixed(1) + '" font-size="10" text-anchor="end">' + v + "</text>";
    }

    var xtick = "", xlab = "";
    var yearsSeen = {};
    var lastLabelX = -999;
    for (var i2 = xStart; i2 <= xEnd; i2++) {
      var yr = xLabels[i2].year;
      if (yearsSeen[yr]) continue;
      yearsSeen[yr] = true;
      if (yr % 5 !== 0) continue;
      var x = px(i2);
      if (x - lastLabelX < 40) continue;
      lastLabelX = x;
      xtick += '<line class="chart-axis" x1="' + x.toFixed(1) + '" y1="' + (H - padB) + '" x2="' + x.toFixed(1) + '" y2="' + (H - padB + 4) + '" stroke-width="1"/>';
      xlab += '<text class="chart-ticklabel" x="' + x.toFixed(1) + '" y="' + (H - padB + 16) + '" font-size="10" text-anchor="middle">' + yr + "</text>";
    }

    var leaderPts = [];
    for (var i3 = xStart; i3 <= xEnd; i3++) leaderPts.push(px(i3).toFixed(1) + "," + py(leader[i3].count).toFixed(1));
    var leaderLine = '<polyline class="chart-leader-line" points="' + leaderPts.join(" ") + '" fill="none" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.75"/>';

    var lines = "", endLabels = "", legendHTML = "";
    players.forEach(function (p, idx) {
      var pts = [];
      var lastPt = null;
      var firstI = null;
      var cnt = 0;
      series[p].forEach(function (pt) { if (pt.i < xStart) cnt = pt.count; });
      var slamIdxs = {};
      var slamCount = {};
      series[p].forEach(function (pt) { slamIdxs[pt.i] = true; slamCount[pt.i] = pt.count; });
      var firstSlamPt = null;
      for (var k = 0; k < series[p].length; k++) { if (series[p][k].i >= xStart) { firstSlamPt = series[p][k]; break; } }
      var firstSlamI = firstSlamPt ? firstSlamPt.i : null;
      var anchorI = (cnt === 0 && firstSlamI !== null && firstSlamI > xStart) ? firstSlamI - 1 : null;
      for (var i4 = xStart; i4 <= xEnd; i4++) {
        if (slamIdxs[i4]) cnt = slamCount[i4];
        if (cnt === 0 && firstI === null && i4 !== anchorI) continue;
        if (firstI === null) firstI = i4;
        pts.push(px(i4).toFixed(1) + "," + py(cnt).toFixed(1));
        lastPt = { x: px(i4), y: py(cnt), v: cnt };
      }
      var col = PALETTE[idx % PALETTE.length];
      var flag = playerFlag(tour, p);
      var flagPart = flag ? flag + " " : "";
      if (pts.length === 0) {
        legendHTML += '<span class="legend-item" style="color:' + col + '"><span class="legend-swatch" style="background:' + col + '"></span>' + flagPart + escapeHtml(p) + " (0)</span>";
        return;
      }
      lines += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>';
      if (lastPt) endLabels += '<circle cx="' + lastPt.x.toFixed(1) + '" cy="' + lastPt.y.toFixed(1) + '" r="3" fill="' + col + '"/>';
      legendHTML += '<span class="legend-item" style="color:' + col + '"><span class="legend-swatch" style="background:' + col + '"></span>' + flagPart + escapeHtml(p) + " (" + (lastPt ? lastPt.v : 0) + ")</span>";
    });
    legendHTML += '<span class="legend-item" style="color:var(--fg)"><span class="legend-swatch dashed"></span>Active Open Era leader (dashed)</span>';

    svg.innerHTML = grid + ylab + xtick + xlab + leaderLine + lines + endLabels;
    document.getElementById(legendId).innerHTML = legendHTML;
    if (legendId2) document.getElementById(legendId2).innerHTML = legendHTML;
  }

  function renderChart2(svgId, tour, cohort) {
    var built = buildSeries(tour, cohort);
    var players = built.players, series = built.series, leader = built.leader, xLabels = built.xLabels, xStart = built.xStart, xEnd = built.xEnd;
    var svg = document.getElementById(svgId);
    var W = svg.parentElement.clientWidth - 32;
    var H = 260;
    var padL = 36, padR = 12, padT = 12, padB = 30;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    var yMin = -1;
    players.forEach(function (p) {
      var cnt = 0;
      series[p].forEach(function (pt) { if (pt.i < xStart) cnt = pt.count; });
      var slamCount = {}, slamIdxs = {};
      series[p].forEach(function (pt) { slamCount[pt.i] = pt.count; slamIdxs[pt.i] = true; });
      var firstI = null;
      for (var i = xStart; i <= xEnd; i++) {
        if (slamIdxs[i]) cnt = slamCount[i];
        if (cnt === 0 && firstI === null) continue;
        if (firstI === null) firstI = i;
        var def = cnt - leader[i].count;
        if (def < yMin) yMin = def;
      }
    });
    yMin = Math.floor(yMin / 5) * 5;

    function px(i) { return padL + (i - xStart) / (xEnd - xStart) * (W - padL - padR); }
    function py(d) { return padT + (1 - (d - yMin) / (0 - yMin)) * (H - padT - padB); }

    var grid = "", ylab = "";
    for (var v = 0; v >= yMin; v -= 5) {
      var y = py(v);
      grid += '<line class="' + (v === 0 ? "chart-zero" : "chart-grid") + '" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke-width="' + (v === 0 ? 1.2 : 1) + '"' + (v === 0 ? ' stroke-dasharray="4,3"' : "") + "/>";
      ylab += '<text class="chart-ticklabel" x="' + (padL - 4) + '" y="' + (y + 3).toFixed(1) + '" font-size="10" text-anchor="end">' + v + "</text>";
    }

    var xtick = "", xlab = "";
    var yearsSeen = {};
    var lastLabelX = -999;
    for (var i2 = xStart; i2 <= xEnd; i2++) {
      var yr = xLabels[i2].year;
      if (yearsSeen[yr]) continue;
      yearsSeen[yr] = true;
      if (yr % 5 !== 0) continue;
      var x = px(i2);
      if (x - lastLabelX < 40) continue;
      lastLabelX = x;
      xtick += '<line class="chart-axis" x1="' + x.toFixed(1) + '" y1="' + (H - padB) + '" x2="' + x.toFixed(1) + '" y2="' + (H - padB + 4) + '" stroke-width="1"/>';
      xlab += '<text class="chart-ticklabel" x="' + x.toFixed(1) + '" y="' + (H - padB + 16) + '" font-size="10" text-anchor="middle">' + yr + "</text>";
    }

    var lines = "", endLabels = "";
    players.forEach(function (p, idx) {
      var pts = [];
      var cnt = 0;
      series[p].forEach(function (pt) { if (pt.i < xStart) cnt = pt.count; });
      var slamCount = {}, slamIdxs = {};
      series[p].forEach(function (pt) { slamCount[pt.i] = pt.count; slamIdxs[pt.i] = true; });
      var firstSlamPt = null;
      for (var k = 0; k < series[p].length; k++) { if (series[p][k].i >= xStart) { firstSlamPt = series[p][k]; break; } }
      var firstSlamI = firstSlamPt ? firstSlamPt.i : null;
      var anchorI = (cnt === 0 && firstSlamI !== null && firstSlamI > xStart) ? firstSlamI - 1 : null;
      var firstI = null;
      var lastPt = null;
      for (var i3 = xStart; i3 <= xEnd; i3++) {
        if (slamIdxs[i3]) cnt = slamCount[i3];
        if (cnt === 0 && firstI === null && i3 !== anchorI) continue;
        if (firstI === null) firstI = i3;
        var def = cnt - leader[i3].count;
        pts.push(px(i3).toFixed(1) + "," + py(def).toFixed(1));
        lastPt = { x: px(i3), y: py(def), v: def };
      }
      if (pts.length === 0) return;
      var col = PALETTE[idx % PALETTE.length];
      lines += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>';
      if (lastPt) endLabels += '<circle cx="' + lastPt.x.toFixed(1) + '" cy="' + lastPt.y.toFixed(1) + '" r="3" fill="' + col + '"/>';
    });

    svg.innerHTML = grid + ylab + xtick + xlab + lines + endLabels;
  }

  function renderTable(tbodyId, tour, cohort) {
    var totals = {}, bySlam = {}, last = {}, firstYear = {};
    state.DATA[tour].forEach(function (r) {
      totals[r.w] = (totals[r.w] || 0) + 1;
      if (!bySlam[r.w]) bySlam[r.w] = { AO: 0, FO: 0, Wim: 0, US: 0 };
      bySlam[r.w][r.s] = (bySlam[r.w][r.s] || 0) + 1;
      last[r.w] = r;
      if (firstYear[r.w] === undefined || r.y < firstYear[r.w]) firstYear[r.w] = r.y;
    });
    var sortedAll = Object.keys(totals).map(function (n) { return [n, totals[n]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var rows;
    if (!cohort || cohort.filter === "top") {
      rows = sortedAll.slice(0, 15).map(function (pair, i) { return [pair[0], pair[1], i + 1]; });
    } else {
      var inCohort = {};
      cohort.players.forEach(function (p) { inCohort[p] = true; });
      rows = sortedAll.map(function (pair, i) { return [pair[0], pair[1], i + 1]; }).filter(function (r) { return inCohort[r[0]]; });
    }
    function cell(v) { return '<td class="col-od' + (v === 0 ? " sport-dim-dash" : "") + '">' + (v === 0 ? "-" : v) + "</td>"; }
    var tbody = document.getElementById(tbodyId);
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.1rem;color:var(--muted)">No cohort members have Open Era slams yet</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var n = r[0], c = r[1], rank = r[2];
      var s = bySlam[n];
      var lr = last[n];
      var flag = playerFlag(tour, n);
      var flagPart = flag ? '<span class="sport-flag">' + flag + "</span> " : "";
      var fy = firstYear[n], ly = lr.y;
      var rangeLabel = fy === ly ? String(fy) : fy + "-" + ly;
      var nameHTML = flagPart + escapeHtml(n) + ' <span class="pill-range">(' + rangeLabel + ")</span>";
      return (
        '<tr><td class="col-rank">' + rank + "</td>" +
        '<td class="team-cell">' + nameHTML + "</td>" +
        '<td class="rating-cell">' + c + "</td>" +
        cell(s.AO) + cell(s.FO) + cell(s.Wim) + cell(s.US) +
        '<td class="col-hide-mobile" style="color:var(--muted)">' + SLAM_FLAG[lr.s] + " " + lr.y + " " + lr.s + "</td></tr>"
      );
    }).join("");
  }

  function cohortRange(tour, cohort) {
    var slams = state.DATA[tour];
    if (cohort.filter === "top") return [slams[0].y, slams[slams.length - 1].y];
    var set = {};
    cohort.players.forEach(function (p) { set[p] = true; });
    var lo = Infinity, hi = -Infinity;
    slams.forEach(function (r) { if (set[r.w]) { if (r.y < lo) lo = r.y; if (r.y > hi) hi = r.y; } });
    if (lo === Infinity) return [slams[0].y, slams[slams.length - 1].y];
    return [lo, hi];
  }

  function renderCohortPills(tour) {
    var wrap = document.getElementById(tour === "m" ? "menCohortPills" : "womenCohortPills");
    var decorated = COHORTS[tour].map(function (c) { return Object.assign({}, c, { _range: cohortRange(tour, c) }); });
    decorated.sort(function (a, b) {
      if (a.filter === "top") return -1;
      if (b.filter === "top") return 1;
      return a._range[0] - b._range[0];
    });
    COHORTS[tour] = decorated;
    wrap.innerHTML = decorated.map(function (c, i) {
      var rangeLabel = c._range[0] + "-" + c._range[1];
      return '<button type="button" class="pill' + (i === 0 ? " active" : "") + '" data-key="' + c.key + '">' + escapeHtml(c.label) + ' <span class="pill-range">' + rangeLabel + "</span></button>";
    }).join("");
    wrap.querySelectorAll(".pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        wrap.querySelectorAll(".pill").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var cohort = COHORTS[tour].filter(function (c) { return c.key === btn.dataset.key; })[0];
        var slug = tour === "m" ? "men" : "women";
        document.getElementById(slug + "Chart1Sub").textContent = cohort.sub;
        renderChart1(slug + "Chart1", slug + "Legend1", slug + "Legend2", tour, cohort);
        renderChart2(slug + "Chart2", tour, cohort);
        renderTable(slug + "Table", tour, cohort);
      });
    });
  }

  function refreshSlamChase(tour) {
    var slug = tour === "m" ? "men" : "women";
    var activeBtn = document.querySelector("#" + slug + "CohortPills .pill.active");
    if (!activeBtn) return;
    var cohort = COHORTS[tour].filter(function (c) { return c.key === activeBtn.dataset.key; })[0];
    document.getElementById(slug + "Chart1Sub").textContent = cohort.sub;
    renderChart1(slug + "Chart1", slug + "Legend1", slug + "Legend2", tour, cohort);
    renderChart2(slug + "Chart2", tour, cohort);
    renderTable(slug + "Table", tour, cohort);
  }

  window.addEventListener("resize", function () { refreshSlamChase(state.mwState.slamchase); });

  // ═══════════════════════════════ init ═══════════════════════════════

  loadSlamsBundle().then(function () {
    ["m", "w"].forEach(function (tour) {
      renderCohortPills(tour);
      var cohort = COHORTS[tour][0];
      var slug = tour === "m" ? "men" : "women";
      document.getElementById(slug + "Chart1Sub").textContent = cohort.sub;
      renderChart1(slug + "Chart1", slug + "Legend1", slug + "Legend2", tour, cohort);
      renderChart2(slug + "Chart2", tour, cohort);
      renderTable(slug + "Table", tour, cohort);
      renderTournamentGrid(tour);
    });
    // Deep link from the portal's Women's card (?mw=w) - default both m/w
    // pill groups to Women's so whichever tab loads first shows it.
    if (new URLSearchParams(location.search).get("mw") === "w") {
      applyMW("slamchase", "w");
      applyMW("tournament", "w");
    }
  }).catch(function () {
    document.getElementById("menCohortPills").innerHTML = '<p class="sport-error">Could not load Grand Slam data</p>';
  });
})();
