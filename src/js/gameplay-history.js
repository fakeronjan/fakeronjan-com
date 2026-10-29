// Gameplay History (/video-games/gameplay-history/) and its game pages
// (/video-games/gameplay-history/game/?id=...). Data comes from the
// gameplay-tracking repo (refreshed daily) and the gameplay-screenshots repo.
(function () {
  var page = document.getElementById("ghPage") || document.getElementById("ghGamePage");
  if (!page) return;
  var BASE = page.dataset.source;
  var SHOTS = page.dataset.shots;
  // Alphabetical everywhere platforms are listed: legends, pills, lanes, and table cells
  var FAMILIES = ["Nintendo", "PlayStation", "Steam", "Xbox"];
  var LANE = { Nintendo: 0, PlayStation: 1, Steam: 2, Xbox: 3 };
  var MONTHS = "JFMAMJJASOND";
  var KIND_ORDER = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
  var GAME_URL = "/video-games/gameplay-history/game/?id=";

  // ── helpers ─────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // "2024-06-03" -> "6/3/2024"
  function fmtDay(d) {
    if (!d) return "-";
    var p = d.slice(0, 10).split("-");
    return +p[1] + "/" + +p[2] + "/" + p[0];
  }

  // A UTC timestamp as an Eastern date, "2024-06-03"
  function etDay(iso) {
    if (!iso) return null;
    if (iso.indexOf("T") === -1 || !/(Z|[+-]\d\d:?\d\d)$/.test(iso)) return iso.slice(0, 10);
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(iso));
    var o = {};
    parts.forEach(function (x) { o[x.type] = x.value; });
    return o.year + "-" + o.month + "-" + o.day;
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function hours(h, estimated) {
    if (h == null) return "-";
    return (estimated ? "~" : "") + h;
  }

  // A game's cover art, small, from the gameplay-tracking repo's stored copies
  function thumb(img, cls) {
    return img ? '<img class="gh-thumb ' + (cls || "") + '" src="' + BASE + "/" + img + '" alt="" loading="lazy">'
      : '<span class="gh-thumb ' + (cls || "") + '" aria-hidden="true"></span>';
  }

  function gameLink(id, name) {
    return '<a class="gh-glink" href="' + GAME_URL + encodeURIComponent(id) + '">' + esc(name) + "</a>";
  }

  function dots(families) {
    return '<span class="gh-dots">' + families.map(function (f) {
      return '<i class="gh-dot gh-' + f.toLowerCase() + '" title="' + f + '"></i>';
    }).join("") + "</span>";
  }

  function legend(el) {
    el.innerHTML = FAMILIES.map(function (f) {
      return '<span><i class="gh-dot gh-' + f.toLowerCase() + '"></i>' + f + "</span>";
    }).join("");
  }

  function kindLabel(k) {
    if (k === "achievement") return "Achievement";
    if (/G$/.test(k)) return k;
    return k.charAt(0).toUpperCase() + k.slice(1);
  }

  // The exact system (and Xbox gamertag) an entry was played on, worded the same everywhere:
  // "PS5", "PS3, PS4", "Xbox (rogerage)", "PC", "Switch, Switch 2"
  // Two significant digits: "42%", "4.2%", "0.42%"
  function fmtRarity(r) {
    if (r == null) return "-";
    if (r >= 9.95) return Math.round(r) + "%";
    if (r >= 0.995) return r.toFixed(1) + "%";
    return (r >= 0.005 ? r.toFixed(2) : "<0.01") + "%";
  }

  function platformLabel(e) {
    return e.platform.replace(/,(?! )/g, ", ") + (e.gamertag ? " (" + e.gamertag + ")" : "");
  }

  // Trophies earned across entries, "of" a total only when every list that has some earned
  // reports its total (a split collection's per-game share has no total of its own)
  function unlockCount(entries) {
    var earned = 0, total = 0, known = true;
    entries.forEach(function (e) {
      earned += e.earned || 0;
      total += e.total || 0;
      if (e.earned && !e.total) known = false;
    });
    if (!earned && !total) return null;
    return known ? earned + " of " + total : String(earned);
  }

  function platKey(e) { return e.family + "|" + e.platform + "|" + (e.gamertag || ""); }

  // The entries a game page counts: those with activity, plus any list with nothing earned
  // (Vice City's 0 of 68) on a platform that has activity. Owned-but-unplayed platforms don't count.
  function countedEntries(row) {
    var active = row.entries.filter(function (e) { return e.first || e.earned || e.minutes; });
    var keys = {};
    active.forEach(function (e) { keys[platKey(e)] = 1; });
    return row.entries.filter(function (e) { return active.indexOf(e) !== -1 || keys[platKey(e)]; });
  }

  // One line per platform family, with its platforms at the same detail as a game page's
  // Platforms table ("PS4, PS5"; "360 (rogerage), Xbox (fakeronjan)"), oldest first
  function platformLines(row) {
    var entries = countedEntries(row).slice().sort(function (a, b) { return (a.first || "9") < (b.first || "9") ? -1 : 1; });
    return row.families.map(function (f) {
      var labels = [];
      entries.forEach(function (e) {
        if (e.family !== f) return;
        platformLabel(e).split(", ").forEach(function (l) { if (labels.indexOf(l) === -1) labels.push(l); });
      });
      return '<span class="gh-plat-line">' + dots([f]) + " " + labels.map(function (l) { return '<span class="gh-nowrap">' + esc(l) + "</span>"; }).join(", ") + "</span>";
    }).join("");
  }

  function familyOfEntry(entryId) {
    return { psn: "PlayStation", xbox: "Xbox", steam: "Steam" }[entryId.split(":")[0]];
  }

  var cache = {};
  function getJSON(url) {
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(url + ": " + r.status);
        return r.json();
      });
    }
    return cache[url];
  }

  function showError() { document.getElementById("ghError").hidden = false; }

  function allDays(row) {
    var s = {};
    Object.keys(row.days_by_family || {}).forEach(function (f) { row.days_by_family[f].forEach(function (d) { s[d] = 1; }); });
    return s;
  }

  // ── year strips: every year at once, or one game's years ────────────────
  // Each strip is January to December with a lane per platform family; each
  // mark is a day with activity on that platform.

  function yearStrip(year, daysByFamily) {
    var a = Date.UTC(+year, 0, 1), span = Date.UTC(+year + 1, 0, 1) - a;
    var grid = "", marks = "";
    for (var i = 1; i < 12; i++) {
      grid += '<line x1="' + (i / 12 * 100) + '" x2="' + (i / 12 * 100) + '" y1="0" y2="22" class="gh-grid" vector-effect="non-scaling-stroke"/>';
    }
    Object.keys(daysByFamily).forEach(function (f) {
      Object.keys(daysByFamily[f]).forEach(function (d) {
        var x = (Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + 43200000 - a) / span * 100;
        marks += '<rect x="' + (x - 0.14) + '" y="' + (2 + LANE[f] * 5) + '" width="0.28" height="4" class="gh-fill-' + f.toLowerCase() + '"><title>' + f + ": " + fmtDay(d) + "</title></rect>";
      });
    });
    return '<svg class="gh-strip" viewBox="0 0 100 22" preserveAspectRatio="none" role="img" aria-label="' + year + '">' + grid + marks + "</svg>";
  }

  function monthHeader() {
    var h = '<div class="gh-months">';
    for (var i = 0; i < 12; i++) h += '<span style="left:' + ((i + 0.5) / 12 * 100) + '%">' + MONTHS[i] + "</span>";
    return h + "</div>";
  }

  // rows: game rows; summary(year, games, days) -> html for the right column (or null)
  function yearStrips(rows, years, opts) {
    var h = '<div class="gh-years' + (opts.compact ? " gh-years-compact" : "") + '"><div></div>' + monthHeader() +
      (opts.header ? '<div class="gh-sum-head">' + opts.header + "</div>" : "<div></div>");
    years.forEach(function (y) {
      var byFam = {}, games = [], daySet = {};
      rows.forEach(function (r) {
        var n = 0;
        Object.keys(r.days_by_family || {}).forEach(function (f) {
          r.days_by_family[f].forEach(function (d) {
            if (d.slice(0, 4) !== y) return;
            (byFam[f] = byFam[f] || {})[d] = 1;
            daySet[d] = 1;
            n++;
          });
        });
        if (n) games.push({ n: n, row: r });
      });
      if (!games.length) return;
      games.sort(function (p, q) { return q.n - p.n; });
      var label = opts.zoom ? '<button type="button" class="gh-year" data-year="' + y + '">' + y + "</button>" : '<span class="gh-year">' + y + "</span>";
      h += label + yearStrip(y, byFam) + '<div class="gh-year-sum">' + opts.summary(y, games, Object.keys(daySet).length) + "</div>";
    });
    return h + "</div>";
  }

  // ── sortable, filterable tables ─────────────────────────────────────────
  // Rows render in batches as the reader scrolls, so the 3,000+ unlock table
  // stays quick.

  function table(o) {
    var fam = "All", key = o.sortKey, dir = o.desc ? -1 : 1, shown = 0, list = [];
    var BATCH = 100;
    if (o.pills) {
      o.pills.hidden = !o.families.length;
      o.pills.innerHTML = ["All"].concat(o.families).map(function (f) {
        return '<button type="button" class="pill' + (f === "All" ? " active" : "") + '" data-value="' + f + '">' + f + "</button>";
      }).join("");
      o.pills.addEventListener("click", function (e) {
        var b = e.target.closest(".pill");
        if (!b) return;
        fam = b.dataset.value;
        o.pills.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("active", p === b); });
        draw();
      });
    }
    if (o.search) o.search.addEventListener("input", function () { draw(); });

    function value(col, r) { return col.v(r); }
    function compare(a, b) {
      var col = o.cols.filter(function (c) { return c.k === key; })[0];
      var va = value(col, a), vb = value(col, b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    }

    function rowsHtml(from, to) {
      return list.slice(from, to).map(function (r) {
        return "<tr>" + o.cols.map(function (c) { return "<td" + (c.cls ? ' class="' + c.cls + '"' : "") + ">" + c.r(r) + "</td>"; }).join("") + "</tr>";
      }).join("");
    }

    function more() {
      if (shown >= list.length) return;
      var tbody = o.el.querySelector("tbody");
      tbody.insertAdjacentHTML("beforeend", rowsHtml(shown, shown + BATCH));
      shown = Math.min(list.length, shown + BATCH);
    }

    var observer = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) more();
    }, { rootMargin: "600px" }) : null;

    function draw() {
      var q = o.search ? o.search.value.trim().toLowerCase() : "";
      list = o.rows.filter(function (r) { return o.filter(r, fam, q); }).sort(compare);
      if (o.count) o.count.textContent = list.length.toLocaleString() + " of " + o.rows.filter(function (r) { return o.filter(r, "All", ""); }).length.toLocaleString();
      o.el.innerHTML = '<table class="sport-table gh-table"><thead><tr>' + o.cols.map(function (c) {
        var arrow = c.k === key ? '<span class="gh-arrow">' + (dir > 0 ? "&#9650;" : "&#9660;") + "</span>" : "";
        if (c.nosort) return "<th" + (c.cls ? ' class="' + c.cls + '"' : "") + ">" + c.h + "</th>";
        return '<th class="gh-sort' + (c.cls ? " " + c.cls : "") + '" data-k="' + c.k + '" tabindex="0" aria-sort="' + (c.k === key ? (dir > 0 ? "ascending" : "descending") : "none") + '">' + c.h + arrow + "</th>";
      }).join("") + "</tr></thead><tbody>" + rowsHtml(0, BATCH) + "</tbody></table>" + '<div class="gh-more"></div>';
      shown = Math.min(list.length, BATCH);
      o.el.querySelectorAll("th.gh-sort").forEach(function (th) {
        function sortBy() {
          if (key === th.dataset.k) dir = -dir;
          else { key = th.dataset.k; dir = o.cols.filter(function (c) { return c.k === key; })[0].desc ? -1 : 1; }
          draw();
        }
        th.addEventListener("click", sortBy);
        th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortBy(); } });
      });
      var sentinel = o.el.querySelector(".gh-more");
      if (observer) { observer.disconnect(); observer.observe(sentinel); }
      else { while (shown < list.length) more(); }
    }
    draw();
    return draw;
  }

  function momentButton(u) {
    return u.moment ? '<button type="button" class="gh-moment" data-img="' + esc(u.moment.img) + '" data-time="' + esc(u.moment.time) + '" data-name="' + esc(u.name) + '" aria-label="' + esc(u.name) + ': the moment it popped">' +
      '<img src="' + SHOTS + "/t/" + u.moment.img + '" alt="" loading="lazy"></button>' : "";
  }

  function unlockCols(withGame, withMoments) {
    var cols = [
      { k: "n", h: "Unlock", cls: "gh-wrap gh-unlock-col", v: function (u) { return (u.name || "").toLowerCase(); }, r: function (u) {
        return '<div class="gh-unlock">' + (u.img ? '<img src="' + BASE + "/" + u.img + '" alt="" loading="lazy">' : '<span class="gh-unlock-blank"></span>') +
          "<div><b>" + esc(u.name) + '</b><span class="gh-desc">' + esc(u.detail) + "</span>" + momentButton(u) + "</div></div>";
      } },
    ];
    // The picture the PS5 took when it popped, in its own column so rows stay one block tall.
    // Phones have no room for the column and show it under the unlock's name instead.
    if (withMoments) cols.push({ k: "m", h: "", cls: "gh-moment-col gh-hide-m", nosort: true, v: function () { return 0; }, r: momentButton });
    if (withGame) cols.push({ k: "g", h: "Game", cls: "gh-wrap gh-name", v: function (u) { return u.gameName.toLowerCase(); }, r: function (u) { return '<div class="gh-with-thumb">' + thumb(u.gameImg, "gh-thumb-s") + "<span>" + gameLink(u.game, u.gameName) + "</span></div>"; } });
    return cols.concat([
      { k: "f", h: "Platform", cls: "gh-hide-m", v: function (u) { return u.family + " " + u.platform; }, r: function (u) { return '<span class="gh-nowrap">' + dots([u.family]) + " " + esc(u.platform) + "</span>"; } },
      { k: "t", h: "Type", cls: "gh-hide-t", desc: true, v: function (u) { return KIND_ORDER[u.kind] || parseInt(u.kind, 10) || 0; }, r: function (u) { return '<span class="gh-nowrap">' + kindLabel(u.kind) + "</span>"; } },
      { k: "r", h: "Rarity", cls: "gh-c gh-hide-m", v: function (u) { return u.rarity; }, r: function (u) { return fmtRarity(u.rarity); } },
      { k: "e", h: "Earned", desc: true, v: function (u) { return u.day; }, r: function (u) { return fmtDay(u.day); } },
    ]);
  }

  function prepUnlocks(unlocks, gamesById, moments) {
    unlocks.forEach(function (u) {
      u.moment = (moments || {})[u.entry + "|" + u.earned + "|" + u.name] || null;
      u.family = familyOfEntry(u.entry);
      var entry = ((gamesById[u.game] || {}).entries || []).filter(function (e) { return e.id === u.entry; })[0];
      u.platform = entry ? platformLabel(entry) : u.family;
      u.day = etDay(u.earned);
      u.gameName = (gamesById[u.game] || {}).name || "";
      u.gameImg = (gamesById[u.game] || {}).img;
    });
    return unlocks;
  }

  // ── Gameplay History page ───────────────────────────────────────────────

  function historyPage() {
    var minSel = document.getElementById("ghMin");
    var yearSel = document.getElementById("ghYear");
    var sortPills = document.getElementById("ghYearSort"), yearSort = "last";
    var games = [], gamesById = {}, years = [];
    var drawGames = null, drawUnlocks = null, unlocksLoaded = null;

    // Game of the Year winner, runner-up, and third place by year (decade picks left out), and the game page
    // each pick belongs to, matched by name the same way a game page finds its badges
    var gotyYears = null, pickIndex = null;
    function gotyByYear() {
      if (!gotyYears) {
        gotyYears = {};
        (window.GOTY || []).forEach(function (g) {
          if (!/^\d{4}$/.test(g.year)) return;
          (gotyYears[g.year] = gotyYears[g.year] || []).push(g);
        });
        var RANK = { "Game of the Year": 0, "Runner-up": 1, "Third place": 2 };
        Object.keys(gotyYears).forEach(function (y) { gotyYears[y].sort(function (a, b) { return RANK[a.place] - RANK[b.place]; }); });
      }
      return gotyYears;
    }
    function gameForPick(name) {
      if (!pickIndex) {
        pickIndex = {};
        games.forEach(function (r) {
          [r.name].concat(r.name.split(" + ")).concat(r.entries.map(function (e) { return e.name; })).forEach(function (n) { pickIndex[norm(n)] = pickIndex[norm(n)] || r; });
        });
      }
      var k = norm(name);
      return pickIndex[k] || pickIndex[GOTY_ALIASES[k]] || null;
    }

    function minOK(r) {
      var n = +minSel.value;
      return r.days.length >= n || (r.hours || 0) >= n;
    }

    function activateTab(name) {
      document.querySelectorAll("#ghTabs .sport-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
      document.querySelectorAll(".gh-page .sport-view").forEach(function (v) {
        var on = v.id === name;
        v.hidden = !on;
        v.classList.toggle("active", on);
      });
      document.getElementById("ghMinBar").hidden = name === "data-summary";
      if (name === "trophy-room") loadUnlocks();
    }

    function renderTimeline() {
      var y = yearSel.value;
      var rows = games.filter(minOK);
      var out = document.getElementById("ghTimeline");
      var count = document.getElementById("ghYearCount");
      if (!y) {
        count.textContent = "Choose a year to see all games played";
        sortPills.hidden = true;
        count.classList.add("gh-hint");
        out.innerHTML = yearStrips(rows, years, {
          zoom: true,
          header: "<span></span><span>Most played</span><span>Game of the Year</span>",
          summary: function (yr, gs, nDays) {
            var picks = gotyByYear()[yr] || [];
            return '<div class="gh-sum-counts"><span>' + plural(gs.length, "game", "games") + "</span><span>" + plural(nDays, "day", "days") + "</span></div>" +
              '<div class="gh-sum-tops">' + gs.slice(0, 3).map(function (g) { return "<span>" + gameLink(g.row.id, g.row.name) + "</span>"; }).join("") + "</div>" +
              '<div class="gh-sum-goty">' + (picks.length ? picks.map(function (p) {
                var row = gameForPick(p.game);
                var medal = { "Runner-up": "&#129352; ", "Third place": "&#129353; " }[p.place] || "&#127942; ";
                return "<span>" + medal + (row ? gameLink(row.id, p.game) : esc(p.game)) + "</span>";
              }).join("") : "<span>-</span>") + "</div>";
          },
        });
        out.querySelectorAll("button.gh-year").forEach(function (b) {
          b.addEventListener("click", function () { yearSel.value = b.dataset.year; renderTimeline(); url.write(); });
        });
        return;
      }
      var a = Date.UTC(+y, 0, 1), span = Date.UTC(+y + 1, 0, 1) - a;
      function x(d) { return (Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + 43200000 - a) / span * 100; }
      var inYear = rows.map(function (r) {
        var fams = {}, all = [];
        Object.keys(r.days_by_family || {}).forEach(function (f) {
          var ds = r.days_by_family[f].filter(function (d) { return d.slice(0, 4) === y; });
          if (ds.length) { fams[f] = ds; all = all.concat(ds); }
        });
        all.sort();
        return { row: r, fams: fams, all: all.filter(function (d, i) { return all.indexOf(d) === i; }) };
      }).filter(function (o) { return o.all.length; })
        .sort(function (p, q) {
          // Last played that year (newest first), or most days played that year
          var by = yearSort === "most" ? q.all.length - p.all.length
            : q.all[q.all.length - 1] < p.all[p.all.length - 1] ? -1 : q.all[q.all.length - 1] > p.all[p.all.length - 1] ? 1 : 0;
          return by || p.row.name.localeCompare(q.row.name);
        });
      sortPills.hidden = false;
      count.classList.remove("gh-hint");
      count.innerHTML = plural(inYear.length, "game", "games") + " in " + y + ' <a href="#" id="ghAllYears" class="gh-all-years">All years</a>';
      document.getElementById("ghAllYears").addEventListener("click", function (e) {
        e.preventDefault(); yearSel.value = ""; renderTimeline(); url.write();
      });
      var w = 0.32, h = '<div class="gh-rows"><div></div>' + monthHeader();
      inYear.forEach(function (o) {
        var s = x(o.all[0]), e = Math.max(x(o.all[o.all.length - 1]), s + w);
        var tip = o.row.name + ": " + plural(o.all.length, "day", "days") + " in " + y + ", " + fmtDay(o.all[0]) + " to " + fmtDay(o.all[o.all.length - 1]);
        var ticks = Object.keys(o.fams).map(function (f) {
          return o.fams[f].map(function (d) {
            return '<rect x="' + (x(d) - w / 2) + '" y="2" width="' + w + '" height="12" class="gh-fill-' + f.toLowerCase() + '"><title>' + esc(o.row.name) + " (" + f + "): " + fmtDay(d) + "</title></rect>";
          }).join("");
        }).join("");
        h += '<div class="gh-row-name" title="' + esc(o.row.name) + '">' + thumb(o.row.img, "gh-thumb-xs") + dots(Object.keys(o.fams).sort()) + "<span>" + gameLink(o.row.id, o.row.name) + "</span></div>" +
          '<svg class="gh-row-svg" viewBox="0 0 100 16" preserveAspectRatio="none" role="img" aria-label="' + esc(tip) + '">' +
          '<line x1="' + s + '" x2="' + e + '" y1="8" y2="8" class="gh-span" vector-effect="non-scaling-stroke"><title>' + esc(tip) + "</title></line>" + ticks + "</svg>";
      });
      out.innerHTML = h + "</div>";
    }

    function renderGames() {
      drawGames = table({
        el: document.getElementById("ghGamesTable"), count: document.getElementById("ghGamesCount"),
        pills: document.getElementById("ghGamesPills"), families: FAMILIES, search: document.getElementById("ghGamesSearch"),
        rows: games, sortKey: "last", desc: true,
        filter: function (r, f, q) { return minOK(r) && (f === "All" || r.families.indexOf(f) !== -1) && (!q || r.name.toLowerCase().indexOf(q) !== -1); },
        cols: [
          { k: "n", h: "Game", cls: "gh-wrap gh-name", v: function (r) { return r.name.toLowerCase(); }, r: function (r) { return '<div class="gh-with-thumb">' + thumb(r.img) + "<b>" + gameLink(r.id, r.name) + "</b></div>"; } },
          { k: "f", h: "Platforms", cls: "gh-wrap gh-plat gh-hide-m", v: function (r) { return r.families.join(); }, r: function (r) { return platformLines(r); } },
          { k: "first", h: "First played", cls: "gh-hide-t", desc: true, v: function (r) { return r.first; }, r: function (r) { return fmtDay(r.first); } },
          { k: "last", h: "Last played", desc: true, v: function (r) { return r.last; }, r: function (r) { return fmtDay(r.last); } },
          { k: "d", h: "Days", desc: true, v: function (r) { return r.days.length || null; }, r: function (r) { return r.days.length || "-"; } },
          { k: "h", h: "Hours", desc: true, v: function (r) { return r.hours; }, r: function (r) { return hours(r.hours, r.hours_estimated); } },
          { k: "s", h: "Sessions", cls: "gh-hide-t", desc: true, v: function (r) { return r.sessions; }, r: function (r) { return r.sessions == null ? "-" : r.sessions; } },
          { k: "u", h: "Unlocks", cls: "gh-hide-m", desc: true, v: function (r) { return r.unlocks ? r.unlocks[0] : null; }, r: function (r) { return r.unlocks ? r.unlocks[1] : "-"; } },
        ],
      });
    }

    function loadUnlocks() {
      if (unlocksLoaded) return unlocksLoaded;
      var total = games.reduce(function (s, r) { return s + (r.unlocks ? r.unlocks[0] : 0); }, 0);
      document.getElementById("ghUnlockLoading").textContent = "Loading " + total.toLocaleString() + " trophies and achievements";
      unlocksLoaded = Promise.all([getJSON(BASE + "/data/unlocks.json"), getJSON(SHOTS + "/moments.json").catch(function () { return {}; })]).then(function (res) {
        var unlocks = prepUnlocks(res[0], gamesById, res[1]);
        drawUnlocks = table({
          el: document.getElementById("ghUnlockTable"), count: document.getElementById("ghUnlockCount"),
          pills: document.getElementById("ghUnlockPills"), families: ["PlayStation", "Steam", "Xbox"], search: document.getElementById("ghUnlockSearch"),
          rows: unlocks, sortKey: "e", desc: true,
          filter: function (u, f, q) {
            var g = gamesById[u.game];
            return g && minOK(g) && (f === "All" || u.family === f) &&
              (!q || (u.name || "").toLowerCase().indexOf(q) !== -1 || u.gameName.toLowerCase().indexOf(q) !== -1 || (u.detail || "").toLowerCase().indexOf(q) !== -1);
          },
          cols: unlockCols(true, unlocks.some(function (u) { return u.moment; })),
        });
      }).catch(showError);
      return unlocksLoaded;
    }

    function updateMinCount() {
      document.getElementById("ghMinCount").textContent = games.filter(minOK).length + " of " + games.length + " games";
    }

    var url = window.SportUrl.create({
      fallbackTab: "timeline",
      activateTab: activateTab,
      tabs: {
        "data-summary": { query: function () {}, apply: function () {} },
        timeline: {
          query: function (add) { if (yearSel.value) add("year", yearSel.value); if (yearSel.value && yearSort === "most") add("sort", "most"); },
          apply: function (p) {
            yearSel.value = years.indexOf(p.get("year")) !== -1 ? p.get("year") : "";
            yearSort = p.get("sort") === "most" ? "most" : "last";
            window.SportUrl.setPills("ghYearSort", yearSort);
            renderTimeline();
          },
        },
        games: { query: function () {}, apply: function () {} },
        "trophy-room": { query: function () {}, apply: function () { return loadUnlocks(); } },
      },
    });

    document.getElementById("ghTabs").addEventListener("click", function (e) {
      var b = e.target.closest(".sport-tab");
      if (!b) return;
      activateTab(b.dataset.tab);
      url.write(true);
    });
    yearSel.addEventListener("change", function () { renderTimeline(); url.write(); });
    sortPills.addEventListener("click", function (e) {
      var b = e.target.closest(".pill");
      if (!b) return;
      yearSort = b.dataset.value;
      window.SportUrl.setPills("ghYearSort", yearSort);
      renderTimeline();
      url.write();
    });
    minSel.addEventListener("change", function () {
      updateMinCount();
      renderTimeline();
      if (drawGames) drawGames();
      if (drawUnlocks) drawUnlocks();
    });
    legend(document.getElementById("ghLegend"));

    var loaded = Promise.all([getJSON(BASE + "/data/games.json"), getJSON(BASE + "/data/status.json")]).then(function (res) {
      games = res[0];
      games.forEach(function (r) {
        r.families.sort();
        gamesById[r.id] = r;
        var earned = 0;
        r.entries.forEach(function (e) { earned += e.earned || 0; });
        r.unlocks = unlockCount(countedEntries(r)) ? [earned, unlockCount(countedEntries(r))] : null;
      });
      var ys = {};
      games.forEach(function (r) { r.days.forEach(function (d) { ys[d.slice(0, 4)] = 1; }); });
      years = Object.keys(ys).sort().reverse();
      yearSel.innerHTML = '<option value="">All years</option>' + years.map(function (y) { return "<option>" + y + "</option>"; }).join("");
      var span = {};
      games.forEach(function (r) {
        r.entries.forEach(function (e) {
          var s = span[e.family] = span[e.family] || [];
          if (e.first) s.push(e.first);
          if (e.last) s.push(e.last);
        });
      });
      // Daily sources run to their last successful refresh, manual ones to their last day played
      document.querySelectorAll("[data-range]").forEach(function (td) {
        var s = (span[td.getAttribute("data-range")] || []).sort();
        var ok = res[1][td.getAttribute("data-updated")];
        td.textContent = s.length ? fmtDay(s[0]) + " - " + fmtDay(ok ? etDay(ok) : s[s.length - 1]) : "-";
      });
      updateMinCount();
      renderTimeline();
      renderGames();
    }).catch(showError);

    url.start({ timeline: loaded, games: loaded, "trophy-room": loaded }, [loaded]);
  }

  // ── game page ───────────────────────────────────────────────────────────

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[™®©]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "");
  }
  // Game of the Year names that differ from every platform's name for the game
  var GOTY_ALIASES = { valianthearts: "valiantheartsthegreatwar" };

  function gotyFor(row) {
    var names = {};
    [row.name].concat(row.name.split(" + ")).concat(row.entries.map(function (e) { return e.name; })).forEach(function (n) { names[norm(n)] = 1; });
    return (window.GOTY || []).filter(function (g) {
      var k = norm(g.game);
      return names[k] || names[GOTY_ALIASES[k]];
    });
  }

  function gamePage() {
    var id = new URLSearchParams(location.search).get("id");
    // The back link returns to the exact Gameplay History view you came from (tab, year,
    // filters); arriving from anywhere else, it opens the Games tab
    var back = document.querySelector(".gh-back");
    var from = document.referrer ? new URL(document.referrer) : null;
    if (back && from && from.origin === location.origin && from.pathname === "/video-games/gameplay-history/") {
      back.href = from.pathname + from.search;
      back.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
    } else if (back) {
      back.href = "/video-games/gameplay-history/?tab=games";
    }
    var out = document.getElementById("ghGame");
    Promise.all([
      getJSON(BASE + "/data/games.json"),
      getJSON(BASE + "/data/unlocks.json"),
      getJSON(BASE + "/data/miiverse.json"),
      getJSON(SHOTS + "/gallery.json").catch(function () { return {}; }),
      getJSON(SHOTS + "/moments.json").catch(function () { return {}; }),
    ]).then(function (res) {
      var games = res[0], gamesById = {};
      games.forEach(function (r) { r.families.sort(); gamesById[r.id] = r; });
      var row = gamesById[id];
      if (!row) { out.innerHTML = ""; showError(); return; }
      document.title = row.name + " | FAKE RONJAN!!";
      var unlocks = prepUnlocks(res[1].filter(function (u) { return u.game === id; }), gamesById, res[4]);
      var entryIds = row.entries.map(function (e) { return e.id; });
      var gallery = res[3];
      var mvNames = row.entries.filter(function (e) { return e.id.indexOf("miiverse:") === 0; }).map(function (e) { return e.id.slice(9); });
      var posts = res[2].posts.filter(function (p) { return mvNames.indexOf(p.game) !== -1; }).reverse();
      out.innerHTML = gameHtml(row, unlocks, entryIds, gallery, posts);
      wireGame(row, unlocks, entryIds, gallery);
    }).catch(function () { out.innerHTML = ""; showError(); });
  }

  function gameHtml(row, unlocks, entryIds, gallery, posts) {
    var facts = [];
    if (row.first) {
      facts.push("First played " + fmtDay(row.first));
      if (row.last !== row.first) facts.push("Last played " + fmtDay(row.last));
      facts.push(plural(row.days.length, "day", "days"));
    } else {
      facts.push("No play dates recorded");
    }
    if (row.hours != null) facts.push((row.hours_estimated ? "about " : "") + plural(row.hours, "hour", "hours"));
    if (row.sessions) facts.push(plural(row.sessions, "session", "sessions"));
    if (unlockCount(countedEntries(row))) facts.push(unlockCount(countedEntries(row)) + " trophies and achievements");

    var art = row.img ? '<img class="gh-art" src="' + BASE + "/" + row.img + '" alt="">' : '<span class="gh-art" aria-hidden="true"></span>';
    var badges = gotyFor(row).map(function (g) {
      var label = "&#127942; " + esc(g.place) + " " + esc(g.year);
      return g.url ? '<a class="gh-badge" href="' + esc(g.url) + '">' + label + "</a>" : '<span class="gh-badge">' + label + "</span>";
    }).join("");
    var h = '<div class="gh-head">' + art + '<div class="gh-head-text"><h1>' + esc(row.name) + "</h1>" +
      '<p class="gh-facts">' + dots(row.families) + " " + facts.map(esc).join('<span class="sport-updated-sep">|</span>') + "</p>" +
      (badges ? '<div class="gh-badges">' + badges + "</div>" : "") + "</div></div>";

    if (row.days.length) {
      var ys = {};
      row.days.forEach(function (d) { ys[d.slice(0, 4)] = 1; });
      h += '<h2 class="gh-h2">When I played</h2>' + yearStrips([row], Object.keys(ys).sort().reverse(), {
        compact: true,
        summary: function (y, gs, nDays) { return plural(nDays, "day", "days"); },
      });
    }

    // Platforms: one line per platform (and Xbox gamertag), entries with activity only
    var groups = {}, order = [];
    countedEntries(row).forEach(function (e) {
      var k = platKey(e);
      if (!groups[k]) { groups[k] = { entries: [], family: e.family, label: platformLabel(e), gamertag: e.gamertag, minutes: 0, sessions: 0, earned: 0, total: 0, first: null, last: null, captures: 0, estimated: false }; order.push(k); }
      var g = groups[k];
      g.entries.push(e);
      g.minutes += e.minutes || 0;
      g.sessions += e.sessions || 0;
      g.earned += e.earned || 0;
      g.total += e.total || 0;
      g.captures += e.captures || (e.id.indexOf("miiverse") === 0 && gallery[e.id] ? gallery[e.id].total : 0);
      g.estimated = g.estimated || !!e.estimated;
      if (e.first && (!g.first || e.first < g.first)) g.first = e.first;
      if (e.last && (!g.last || e.last > g.last)) g.last = e.last;
    });
    // PlayStation screenshots are filed under one of the game's lists; they belong to the
    // platform whose play dates hold them (Mass Effect's 2026 shots are the PS4 Legendary Edition)
    entryIds.forEach(function (eid) {
      if (eid.indexOf("psn") !== 0 || !gallery[eid]) return;
      var ps = order.map(function (k) { return groups[k]; }).filter(function (g) { return g.family === "PlayStation"; });
      var held = function (g) {
        return gallery[eid].shots.filter(function (x) { var d = x.time.slice(0, 10); return g.first && d >= g.first && d <= g.last; }).length;
      };
      var best = ps.sort(function (a, b) { return held(b) - held(a) || ((b.last || "") < (a.last || "") ? -1 : 1); })[0];
      if (best) best.captures += gallery[eid].total;
    });
    // Most recently played first, like every time-ordered list on the site
    var plats = order.map(function (k) { return groups[k]; }).sort(function (a, b) { return (b.last || "") < (a.last || "") ? -1 : 1; });
    h += '<h2 class="gh-h2">Platforms</h2><div class="sport-table-wrap"><table class="sport-table gh-table"><thead><tr><th class="gh-wrap">Platform</th><th class="gh-hide-m">First played</th><th>Last played</th><th>Hours</th><th class="gh-hide-t">Sessions</th><th class="gh-hide-m">Unlocks</th><th class="gh-hide-t">Screenshots</th></tr></thead><tbody>' +
      plats.map(function (g) {
        return '<tr><td class="gh-wrap">' + dots([g.family]) + " " + esc(g.label) + "</td>" +
          '<td class="gh-hide-m">' + fmtDay(g.first) + "</td><td>" + fmtDay(g.last) + "</td>" +
          "<td>" + (g.minutes ? hours(Math.round(g.minutes / 6) / 10, g.estimated) : "-") + "</td>" +
          '<td class="gh-hide-t">' + (g.sessions || "-") + "</td>" +
          '<td class="gh-hide-m">' + (unlockCount(g.entries) || "-") + "</td>" +
          '<td class="gh-hide-t">' + (g.captures || "-") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    if (row.hours_estimated) {
      h += '<p class="sport-note gh-after">Includes an estimate: ' + row.estimated_from.map(function (c) { return esc(c) + "'s"; }).join(" and ") + " hours are shared across its games by days played.</p>";
    }

    // Screenshots: Switch, PlayStation, and Miiverse, from the gallery repo, drawn by wireGame
    // (with Nintendo / PlayStation pills when there are both). A Miiverse screenshot carries
    // its post's text as the caption under it.
    var shots = row._shots = gameShots(entryIds, gallery, posts);
    row._shotTotals = {};
    entryIds.forEach(function (eid) {
      if (!gallery[eid]) return;
      var f = eid.indexOf("psn") === 0 ? "PlayStation" : "Nintendo";
      row._shotTotals[f] = (row._shotTotals[f] || 0) + gallery[eid].total;
    });
    if (shots.length) {
      h += '<h2 class="gh-h2">Screenshots</h2><div class="sport-controls"><div class="pill-group" id="ghShotPills" hidden></div></div>' +
        '<p class="gh-caption" id="ghShotCap"></p><div class="gh-shots" id="ghShots"></div>';
    }

    if (unlocks.length) {
      var fams = FAMILIES.filter(function (f) { return unlocks.some(function (u) { return u.family === f; }); });
      h += '<h2 class="gh-h2">Trophies and achievements (' + unlocks.length + ')</h2>' +
        '<div class="sport-controls"><div class="pill-group" id="ghGameUnlockPills"' + (fams.length > 1 ? "" : " hidden") + "></div></div>" +
        '<div class="sport-table-wrap" id="ghGameUnlocks"></div>';
      row._fams = fams;
    }
    return h;
  }

  function wireGame(row, unlocks, entryIds, gallery) {
    if (unlocks.length) {
      table({
        el: document.getElementById("ghGameUnlocks"), pills: document.getElementById("ghGameUnlockPills"),
        families: row._fams.length > 1 ? row._fams : [], rows: unlocks, sortKey: "e", desc: true,
        filter: function (u, f) { return f === "All" || u.family === f; },
        cols: unlockCols(false, unlocks.some(function (u) { return u.moment; })),
      });
    }
    var grid = document.getElementById("ghShots");
    if (!grid) return;
    var shots = [];
    var fams = FAMILIES.filter(function (f) { return row._shotTotals[f]; });

    // One family's screenshots, or all of them; the caption says how many of how many
    function drawShots(fam) {
      shots = row._shots.filter(function (s) { return fam === "All" || s.family === fam; });
      var total = 0;
      fams.forEach(function (f) { if (fam === "All" || f === fam) total += row._shotTotals[f]; });
      document.getElementById("ghShotCap").textContent = shots.length === total ? (total > 1 ? "All " : "") + plural(total, "screenshot", "screenshots")
        : shots.length + " of " + total + " screenshots, chosen at random from across the time I played";
      grid.dataset.n = shots.length;
      grid.innerHTML = shots.map(function (s, i) {
        var tile = '<button type="button" class="gh-shot" data-i="' + i + '" aria-label="Screenshot from ' + fmtDay(s.time) + '"><img src="' + SHOTS + "/t/" + s.img + '" alt="" loading="lazy"><span>' + fmtDay(s.time) + "</span></button>";
        return s.text ? '<figure class="gh-shot-fig">' + tile + "<figcaption>" + esc(s.text) + "</figcaption></figure>" : tile;
      }).join("");
      balance(grid);
    }

    var pills = document.getElementById("ghShotPills");
    if (fams.length > 1) {
      pills.hidden = false;
      pills.innerHTML = ["All"].concat(fams).map(function (f) {
        return '<button type="button" class="pill' + (f === "All" ? " active" : "") + '" data-value="' + f + '">' + f + "</button>";
      }).join("");
      pills.addEventListener("click", function (e) {
        var b = e.target.closest(".pill");
        if (!b) return;
        pills.querySelectorAll(".pill").forEach(function (p) { p.classList.toggle("active", p === b); });
        drawShots(b.dataset.value);
      });
    }
    drawShots("All");
    window.addEventListener("resize", function () { balance(grid); });
    grid.addEventListener("click", function (e) {
      var b = e.target.closest(".gh-shot");
      if (!b) return;
      openLightbox(shots, +b.dataset.i, function (x, i) {
        return (x.text ? x.text + " | " : "") + when(x.time) + " (" + (i + 1) + " of " + shots.length + ")";
      });
    });
  }

  function gameShots(entryIds, gallery, posts) {
    var text = {};
    posts.forEach(function (p) { text[p.id] = (p.body || "").replace(/\s*\n\s*/g, " ").trim(); });
    var shots = [];
    entryIds.forEach(function (eid) {
      if (!gallery[eid]) return;
      var family = eid.indexOf("psn") === 0 ? "PlayStation" : "Nintendo";
      shots = shots.concat(gallery[eid].shots.map(function (s) {
        return { time: s.time, img: s.img, text: s.post ? text[s.post] || "" : "", family: family };
      }));
    });
    return shots.sort(function (a, b) { return a.time < b.time ? -1 : 1; });
  }

  // "2024-06-03T19:51:00" -> "6/3/2024 at 7:51 pm"
  function when(t) {
    var hh = +t.slice(11, 13);
    return fmtDay(t) + " at " + (hh % 12 || 12) + ":" + t.slice(14, 16) + " " + (hh < 12 ? "am" : "pm");
  }

  // One larger-view dialog for screenshot galleries and trophy moments
  var LB = { list: [], at: 0, caption: null };
  function openLightbox(list, i, caption) {
    var lb = document.getElementById("ghLightbox");
    if (!lb) return;
    if (!lb.dataset.wired) {
      lb.dataset.wired = "1";
      document.getElementById("ghLightboxPrev").addEventListener("click", function () { showAt(LB.at - 1); });
      document.getElementById("ghLightboxNext").addEventListener("click", function () { showAt(LB.at + 1); });
      lb.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") showAt(LB.at - 1);
        if (e.key === "ArrowRight") showAt(LB.at + 1);
      });
      lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    }
    LB.list = list; LB.caption = caption;
    document.getElementById("ghLightboxPrev").hidden = document.getElementById("ghLightboxNext").hidden = list.length < 2;
    showAt(i);
    lb.showModal();
  }
  function showAt(i) {
    LB.at = (i + LB.list.length) % LB.list.length;
    document.getElementById("ghLightboxImg").src = SHOTS + "/f/" + LB.list[LB.at].img;
    document.getElementById("ghLightboxCap").textContent = LB.caption(LB.list[LB.at], LB.at);
  }

  // A trophy's moment: the picture the PS5 took the instant it popped
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".gh-moment");
    if (!b) return;
    openLightbox([{ img: b.dataset.img, time: b.dataset.time }], 0, function (x) { return b.dataset.name + " | " + when(x.time); });
  });

  // Every tile is the same size: as wide as one of the most columns the width fits (2 to 6),
  // whatever the count or filter. Use that many columns unless the last row would hold a single
  // orphan tile; then drop a column or two to avoid it (5 on a 4-wide grid = 3 over 2). A short
  // row leaves space at the end, never bigger tiles.
  function balance(grid) {
    var n = +grid.dataset.n, width = grid.clientWidth || 800, GAP = 6;
    var max = Math.max(2, Math.min(6, Math.floor(width / 150)));
    var cols = Math.min(n, max);
    for (var c = max; n > max && c >= Math.max(2, max - 2); c--) {
      if (n % c !== 1) { cols = c; break; }
    }
    grid.style.setProperty("--cols", Math.max(1, cols));
    grid.style.setProperty("--tile", Math.floor((width - GAP * (max - 1)) / max) + "px");
  }

  if (document.getElementById("ghPage")) historyPage();
  else gamePage();
})();
