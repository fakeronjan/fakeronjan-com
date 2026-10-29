// Gameplay Stats (/video-games/gameplay-stats/) and its game pages
// (/video-games/gameplay-stats/game/?id=...). Data comes from the
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
  var GAME_URL = "/video-games/gameplay-stats/game/?id=";

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

  // A game's most complete trophy or achievement list (Balatro: PC 26 of 31, ahead of PS5
  // 13 of 32), which the Games tab shows and sorts by
  function bestList(row) {
    var best = null;
    countedEntries(row).forEach(function (e) {
      if (!e.total) return;
      var pct = (e.earned || 0) / e.total;
      if (!best || pct > best.pct || (pct === best.pct && e.total > best.entry.total)) best = { entry: e, pct: pct };
    });
    return best;
  }

  function unlockCell(r) {
    if (!r.best) return r.unlocks ? r.unlocks[1] : "-";
    var e = r.best.entry, lists = countedEntries(r).filter(function (x) { return x.total; }).length;
    var tip = lists > 1 ? ' title="Best: ' + esc(platformLabel(e)) + ". All lists: " + esc(r.unlocks[1]) + '"' : "";
    var plat = countedEntries(r).some(function (x) { return x.platinum; }) ? ' <span class="gh-pill gh-platinum">Platinum</span>' : "";
    return '<span class="gh-nowrap"' + tip + ">" + (e.earned || 0) + " of " + e.total + ' <i class="gh-pct">' + Math.floor(r.best.pct * 100) + "%</i></span>" + plat;
  }

  // "26 of 31 83%" for a platform's lists, the count alone when a list has no total
  function unlockShare(entries) {
    var c = unlockCount(entries);
    if (!c) return "-";
    var earned = 0, total = 0;
    entries.forEach(function (e) { earned += e.earned || 0; total += e.total || 0; });
    return /of/.test(c) && total ? '<span class="gh-nowrap">' + c + ' <i class="gh-pct">' + Math.floor(earned / total * 100) + "%</i></span>" : c;
  }

  // A Total row under a game's Platforms table when it was played on two or more: first and
  // last played across them, and summed hours, sessions, unlocks, and screenshots
  function platformTotals(plats) {
    if (plats.length < 2) return "";
    var first = null, last = null, mins = 0, est = false, sessions = 0, captures = 0, all = [];
    plats.forEach(function (g) {
      if (g.first && (!first || g.first < first)) first = g.first;
      if (g.last && (!last || g.last > last)) last = g.last;
      mins += g.minutes; est = est || g.estimated; sessions += g.sessions; captures += g.captures;
      all = all.concat(g.entries);
    });
    return '<tfoot><tr class="gh-total"><td class="gh-wrap">Total</td>' +
      '<td class="gh-hide-m">' + fmtDay(first) + "</td><td>" + fmtDay(last) + "</td>" +
      "<td>" + (mins ? hours(Math.round(mins / 6) / 10, est) : "-") + "</td>" +
      '<td class="gh-hide-t">' + (sessions || "-") + "</td>" +
      '<td class="gh-hide-m">' + (unlockCount(all) || "-") + "</td>" +
      '<td class="gh-hide-t">' + (captures || "-") + "</td></tr></tfoot>";
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
        var mine = {};  // days played that year, each counted once across platforms
        Object.keys(r.days_by_family || {}).forEach(function (f) {
          r.days_by_family[f].forEach(function (d) {
            if (d.slice(0, 4) !== y) return;
            (byFam[f] = byFam[f] || {})[d] = 1;
            daySet[d] = 1;
            mine[d] = 1;
          });
        });
        var n = Object.keys(mine).length;
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

  // Small pills after a game's name in the Games and Trophy Room tables: the medal and the
  // year of each Game of the Year pick, linking to its write-up ("2024: Runner-up" on hover)
  var MEDAL_CLASS = { "Runner-up": " gh-silver", "3rd place": " gh-bronze" };  // gold otherwise
  var PILL_MEDALS = { "Game of the Year": "&#127942;", "Game of the Decade": "&#127942;", "Runner-up": "&#129352;", "3rd place": "&#129353;" };
  function pills(row) {
    if (!row) return "";
    if (row._pills == null) {
      row._pills = gotyFor(row).map(function (g) {
        var label = PILL_MEDALS[g.place] + " " + esc(g.year), tip = esc(g.year) + ": " + esc(g.place);
        var cls = "gh-pill" + (MEDAL_CLASS[g.place] || "");
        return g.url ? ' <a class="' + cls + '" href="' + esc(g.url) + '" title="' + tip + '">' + label + "</a>" : ' <span class="' + cls + '" title="' + tip + '">' + label + "</span>";
      }).join("");
    }
    return row._pills;
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
    if (withGame) cols.push({ k: "g", h: "Game", cls: "gh-wrap gh-name", v: function (u) { return u.gameName.toLowerCase(); }, r: function (u) { return '<div class="gh-with-thumb">' + thumb(u.gameImg, "gh-thumb-s") + "<span>" + gameLink(u.game, u.gameName) + pills(u.gameRow) + "</span></div>"; } });
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
      u.gameRow = gamesById[u.game] || null;
      u.gameImg = (gamesById[u.game] || {}).img;
    });
    return unlocks;
  }

  // ── Gameplay Stats page ───────────────────────────────────────────────

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
        (window.GOTY || []).concat(window.GOTY_MORE || []).forEach(function (g) {
          if (!/^\d{4}$/.test(g.year)) return;
          (gotyYears[g.year] = gotyYears[g.year] || []).push(g);
        });
        var RANK = { "Game of the Year": 0, "Runner-up": 1, "3rd place": 2, "4th place": 3, "5th place": 4 };
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

    // A dotted line from a most-played game to the same game among that year's picks, drawn
    // only when the two lists sit side by side
    // Short names for the Timeline lists, so the longest titles don't set the page's layout.
    // A curated short name wins (and may run a few characters past the cap). Otherwise, in
    // order: a combined row ("Street Fighter IV + Super Street Fighter IV + ...") keeps its
    // first game; "The Legend of Zelda" becomes "Zelda"; a "Remastered" tag drops; a numbered
    // game drops its subtitle when no other game shares the number (Uncharted 2, Danganronpa V3);
    // anything still past MAX_TITLE characters ends at its last whole word with "…". The full
    // title shows on hover. Game pages and the other tabs keep full titles.
    var MAX_TITLE = 26;
    var SHORT_NAMES = {
      "Animal Crossing: New Horizons": "Animal Crossing: New Horizons",
      "Bloodstained: Ritual of the Night": "Bloodstained: RotN",
      "Shovel Knight: Treasure Trove": "Shovel Knight",
      "Valiant Hearts: The Great War": "Valiant Hearts",
      "Ni no Kuni: Wrath of the White Witch": "Ni no Kuni",
      "Clair Obscur: Expedition 33": "Expedition 33",
      "Like a Dragon: Infinite Wealth": "Like a Dragon: Infinite Wealth",
      "Like a Dragon: Pirate Yakuza in Hawaii": "Like a Dragon: Pirate Yakuza",
      "Paper Mario: The Thousand-Year Door": "Paper Mario: TTYD",
      "Castlevania: Symphony of the Night": "Symphony of the Night",
      "Danganronpa: Trigger Happy Havoc": "Danganronpa 1",
      "Big Brain Academy: Brain vs. Brain": "Big Brain Academy",
      "LEGO Star Wars: The Skywalker Saga": "LEGO Skywalker Saga",
      "Phoenix Wright: Ace Attorney Trilogy": "Ace Attorney Trilogy",
      "The Great Ace Attorney Chronicles": "The Great Ace Attorney",
      "South Park: The Stick of Truth": "The Stick of Truth",
      "Klonoa Phantasy Reverie Series": "Klonoa Phantasy Reverie",
      "Street Fighter 30th Anniversary Collection": "SF 30th Anniversary",
      "Life is Strange: True Colors": "Life is Strange: True Colors",
      "Life is Strange: Before the Storm": "Life is Strange: BtS",
      "EA Sports College Football 25": "College Football 25",
      "EA Sports College Football 26": "College Football 26",
      "Teenage Mutant Ninja Turtles: Shredder's Revenge": "TMNT: Shredder's Revenge",
      "The Legend of Zelda: Tears of the Kingdom": "Zelda: Tears of the Kingdom",
      "The Legend of Zelda: A Link Between Worlds": "Zelda: A Link Between Worlds",
    };
    var prefixCount = null;
    function shortTitle(name) {
      var key = name.replace(/’/g, "'");
      if (SHORT_NAMES[key]) return SHORT_NAMES[key];
      if (!prefixCount) {
        prefixCount = {};
        games.forEach(function (g) {
          g.name.split(" + ").forEach(function (n) {
            var k = norm(n.split(": ")[0]);
            prefixCount[k] = (prefixCount[k] || 0) + 1;
          });
        });
      }
      var t = name.split(" + ")[0];
      if (SHORT_NAMES[t.replace(/’/g, "'")]) return SHORT_NAMES[t.replace(/’/g, "'")];
      if (t.indexOf("The Legend of Zelda: ") === 0) t = "Zelda: " + t.slice(21);
      t = t.replace(/ Remastered$/, "");
      var i = t.indexOf(": "), head = i > 0 ? t.slice(0, i) : "";
      if (head && head !== "Zelda" && /(\d+|\b[IVX]+|V\d)$/.test(head) && prefixCount[norm(head)] === 1) t = head;
      if (t.length > MAX_TITLE) {
        var cut = t.slice(0, MAX_TITLE - 1), sp = cut.lastIndexOf(" ");
        t = (sp > 8 ? cut.slice(0, sp) : cut).replace(/[\s:,.+\-]+$/, "") + "\u2026";
      }
      return t;
    }
    function listLink(id, name) {
      var t = shortTitle(name);
      if (t === name) return gameLink(id, name);
      return '<a class="gh-glink" href="' + GAME_URL + encodeURIComponent(id) + '" title="' + esc(name) + '">' + esc(t) + "</a>";
    }
    function listText(name) {
      var t = shortTitle(name);
      return t === name ? esc(name) : '<span title="' + esc(name) + '">' + esc(t) + "</span>";
    }

    // A game's estimated hours in one year. Each platform family's lifetime hours are spread
    // evenly over that family's recorded days, then the year's days are added up, so Xbox
    // hours never ride on Nintendo screenshot days (and Nintendo, with no hours, adds none)
    function yearHours(row, yr) {
      var total = 0, any = false;
      Object.keys(row.days_by_family || {}).forEach(function (f) {
        var mins = 0;
        row.entries.forEach(function (e) { if (e.family === f) mins += e.minutes || 0; });
        var days = row.days_by_family[f];
        if (!mins || !days.length) return;
        var inYear = days.filter(function (d) { return d.slice(0, 4) === yr; }).length;
        if (inYear) { total += mins / 60 * inYear / days.length; any = true; }
      });
      return any ? total : null;
    }

    function linkMatches() {
      document.querySelectorAll("#ghTimeline .gh-year-sum").forEach(function (sum) {
        var old = sum.querySelector("svg.gh-match");
        if (old) old.remove();
        var lists = sum.querySelectorAll(".gh-sum-list");
        if (lists.length < 3) return;
        var box = sum.getBoundingClientRect(), r = [];
        for (var i = 0; i < 3; i++) r.push(lists[i].getBoundingClientRect());
        if (r[1].left < r[0].right || r[2].left < r[1].right) return;  // stacked lists: no gaps to draw in
        // A column of nodes in each gap, one per title, level with it; a dotted line joins the
        // node of a game to the node of the same game in the next column. Game of the Year in
        // the middle has nodes on both sides, so both lines of agreement run through the picks.
        var INSET = 10, svg = "";
        function nodes(list, x) {
          return Array.prototype.filter.call(list.querySelectorAll(":scope > span"), function (sp) {
            return sp.textContent.trim() !== "-";  // an empty year has nothing to point to
          }).map(function (sp) {
            var q = sp.getBoundingClientRect();
            return { gid: sp.dataset.gid, x: x - box.left, y: q.top + q.height / 2 - box.top };
          });
        }
        function gap(from, fromX, to, toX) {
          var a = nodes(from, fromX), b = nodes(to, toX), joined = {};
          a.forEach(function (n) {
            var m = n.gid && b.filter(function (o) { return o.gid === n.gid; })[0];
            if (!m) return;
            joined[n.gid] = 1;
            svg += '<line x1="' + n.x + '" y1="' + n.y + '" x2="' + m.x + '" y2="' + m.y + '"/>';
          });
          a.concat(b).forEach(function (n) {
            svg += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (joined[n.gid] ? 3 : 2) + '"' + (joined[n.gid] ? ' class="on"' : "") + "/>";
          });
        }
        gap(lists[0], r[0].right + INSET, lists[1], r[1].left - INSET);
        gap(lists[1], r[1].right + INSET, lists[2], r[2].left - INSET);
        sum.insertAdjacentHTML("afterbegin", '<svg class="gh-match" aria-hidden="true">' + svg + "</svg>");
      });
    }

    // Titles never wrap. Measure the longest title in each list, size the three columns to
    // fit, then lay them out beside the strip (the strip narrows, down to MIN_STRIP), under
    // it, or stacked, whichever is the first that fits
    // The three lists always sit in line with the year's strip. When the row is short of room
    // the strip narrows first (to MIN_STRIP), then the list text shrinks (to 10px), then the
    // days, hours, and percentages drop out (to 9px). Narrower than that, only the strips show.
    var MIN_STRIP = 160;
    function layoutLists() {
      var tl = document.getElementById("ghTimeline"), grid = tl.querySelector(".gh-years:not(.gh-years-compact)");
      tl.classList.remove("gh-tl-nostats", "gh-tl-strips");
      tl.style.removeProperty("--gh-fs");
      if (!grid || !grid.querySelector(".gh-sum-list")) return;
      // Natural widths at full size: each list's longest line, with and without its numbers
      tl.classList.add("gh-tl-measure");
      var w = [0, 0, 0], bare = [0, 0, 0], cols = { "gh-sum-tops": 0, "gh-sum-goty": 1, "gh-sum-done": 2 };
      grid.querySelectorAll(".gh-sum-list").forEach(function (l) {
        var i = cols[l.classList[1]];
        l.querySelectorAll(":scope > span").forEach(function (sp) {
          var full = sp.getBoundingClientRect().width, pct = sp.querySelector(".gh-pct");
          w[i] = Math.max(w[i], Math.ceil(full) + 2);
          bare[i] = Math.max(bare[i], Math.ceil(full - (pct ? pct.getBoundingClientRect().width + 4 : 0)) + 2);
        });
      });
      tl.classList.remove("gh-tl-measure");
      var em = parseFloat(getComputedStyle(grid).fontSize), GAP = 4.5, EDGE = 12;
      var rowGaps = parseFloat(getComputedStyle(grid).columnGap) * 2, yearCol = 3.2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      function need(widths, f) { return (widths[0] + widths[1] + widths[2]) * f + 2 * GAP * em * f + EDGE; }
      function apply(widths, f) {
        ["--gh-c1", "--gh-c2", "--gh-c3"].forEach(function (v, i) { tl.style.setProperty(v, Math.ceil(widths[i] * f) + "px"); });
        tl.style.setProperty("--gh-sum-w", Math.ceil(need(widths, f)) + "px");
        if (f < 1) tl.style.setProperty("--gh-fs", f.toFixed(3));
      }
      apply(w, 1);
      if (innerWidth <= 640) return;  // phones show the strips only
      var room = grid.clientWidth - yearCol - rowGaps - MIN_STRIP;  // what the lists can have
      var f = Math.min(1, (room - EDGE) / (need(w, 1) - EDGE));
      if (f * em >= 10) return apply(w, f);
      f = Math.min(1, (room - EDGE) / (need(bare, 1) - EDGE));
      if (f * em >= 9) { apply(bare, f); tl.classList.add("gh-tl-nostats"); return; }
      tl.classList.add("gh-tl-strips");
    }
    var relink = null;
    window.addEventListener("resize", function () { clearTimeout(relink); relink = setTimeout(function () { layoutLists(); linkMatches(); }, 150); });
    // Titles measured before the web font arrives come out the wrong width: measure again
    if (document.fonts) document.fonts.ready.then(function () { layoutLists(); linkMatches(); });

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
          header: "<span>Most played</span><span class=\"gh-head-goty\">Game of the Year</span><span>Most completed</span>",
          summary: function (yr, gs) {
            var picks = gotyByYear()[yr] || [], RANKS = ["1&#65039;&#8419; ", "2&#65039;&#8419; ", "3&#65039;&#8419; ", "4&#65039;&#8419; ", "5&#65039;&#8419; "];
            // Most completed: the share of a trophy or achievement list unlocked by the end of the
            // year, among games with an unlock that year (best list when a game has several)
            var done = gs.map(function (g) {
              var best = null, plat = false;
              g.row.entries.forEach(function (e) {
                var n = (e.earned_by_year || {})[yr];
                if (n && e.total && (!best || n / e.total > best.pct)) best = { pct: n / e.total, n: n };
                if (e.platinum && e.platinum.slice(0, 4) <= yr) plat = true;  // earned by then
              });
              return best && { row: g.row, pct: best.pct, n: best.n, plat: plat };
            }).filter(Boolean).sort(function (p, q) { return q.pct - p.pct || q.n - p.n; }).slice(0, 5);
            // Most played: days that year or hours that year, whichever is more (the page's own
            // "N days or N hours" test). Platforms only report lifetime hours, so a year's share
            // is estimated from the days played that year (see yearHours)
            var played = gs.map(function (g) {
              var hrs = yearHours(g.row, yr);
              return { row: g.row, days: g.n, hrs: hrs, score: Math.max(g.n, hrs || 0) };
            }).sort(function (p, q) { return q.score - p.score || q.days - p.days; }).slice(0, 5);
            return '<div class="gh-sum-list gh-sum-tops" data-label="Most played">' + played.map(function (g, i) {
                return '<span data-gid="' + esc(g.row.id) + '">' + RANKS[i] + listLink(g.row.id, g.row.name) + ' <i class="gh-pct">' +
                  (g.hrs ? "~" + plural(Math.round(g.hrs), "hr", "hrs") + ", " : "") + plural(g.days, "day", "days") + "</i></span>";
              }).join("") + "</div>" +
              (picks.length ? '<div class="gh-sum-band"></div>' : "") +  // no picks yet: an empty cell
              '<div class="gh-sum-list gh-sum-goty" data-label="Game of the Year">' + (picks.length ? picks.map(function (p) {
                var row = gameForPick(p.game);
                var medal = { "Runner-up": "&#129352; ", "3rd place": "&#129353; ", "4th place": "&#127808; ", "5th place": "&#9995; " }[p.place] || "&#127942; ";
                return (row ? '<span data-gid="' + esc(row.id) + '">' : "<span>") + medal + (row ? listLink(row.id, p.game) : listText(p.game)) + "</span>";
              }).join("") : "") + "</div>" +
              '<div class="gh-sum-list gh-sum-done" data-label="Most completed">' + (done.length ? done.map(function (d, i) {
                return '<span data-gid="' + esc(d.row.id) + '">' + RANKS[i] + listLink(d.row.id, d.row.name) + ' <i class="gh-pct">' + Math.floor(d.pct * 100) + "%</i>" +
                  (d.plat ? ' <span class="gh-pill gh-platinum">Platinum</span>' : "") + "</span>";
              }).join("") : "<span>-</span>") + "</div>" ;
          },
        });
        layoutLists();
        linkMatches();
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
          { k: "n", h: "Game", cls: "gh-wrap gh-name", v: function (r) { return r.name.toLowerCase(); }, r: function (r) { return '<div class="gh-with-thumb">' + thumb(r.img) + "<span><b>" + gameLink(r.id, r.name) + "</b>" + pills(r) + "</span></div>"; } },
          { k: "f", h: "Platforms", cls: "gh-wrap gh-plat gh-hide-m", v: function (r) { return r.families.join(); }, r: function (r) { return platformLines(r); } },
          { k: "first", h: "First played", cls: "gh-hide-t", desc: true, v: function (r) { return r.first; }, r: function (r) { return fmtDay(r.first); } },
          { k: "last", h: "Last played", desc: true, v: function (r) { return r.last; }, r: function (r) { return fmtDay(r.last); } },
          { k: "d", h: "Days", desc: true, v: function (r) { return r.days.length || null; }, r: function (r) { return r.days.length || "-"; } },
          { k: "h", h: "Hours", desc: true, v: function (r) { return r.hours; }, r: function (r) { return hours(r.hours, r.hours_estimated); } },
          { k: "s", h: "Sessions", cls: "gh-hide-t", desc: true, v: function (r) { return r.sessions; }, r: function (r) { return r.sessions == null ? "-" : r.sessions; } },
          { k: "u", h: "Unlocks", cls: "gh-hide-m", desc: true, v: function (r) { return r.best ? r.best.pct : null; }, r: unlockCell },
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
        r.best = bestList(r);
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
  var GOTY_ALIASES = { valianthearts: "valiantheartsthegreatwar", pokemonswordshield: "pokemonsword" };

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
    // "Back to previous page" returns to whatever page on the site you came from, in the
    // exact view you left it; arriving from outside the site, it opens the Games tab
    var back = document.querySelector(".gh-back");
    var from = document.referrer ? new URL(document.referrer) : null;
    if (back && from && from.origin === location.origin) {
      back.href = from.pathname + from.search;
      back.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
    } else if (back) {
      back.href = "/video-games/gameplay-stats/?tab=games";
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
    // Unlocks as on the Games tab: the most complete list, with its share ("on PC" when the game
    // has more than one list; the Platforms table below has each list and the total)
    var best = bestList(row), lists = countedEntries(row).filter(function (e) { return e.total; }).length;
    if (best) facts.push((best.entry.earned || 0) + " of " + best.entry.total + " trophies and achievements" +
      (lists > 1 ? " on " + platformLabel(best.entry) : "") + " (" + Math.floor(best.pct * 100) + "%)");
    else if (unlockCount(countedEntries(row))) facts.push(unlockCount(countedEntries(row)) + " trophies and achievements");

    var art = row.img ? '<img class="gh-art" src="' + BASE + "/" + row.img + '" alt="">' : '<span class="gh-art" aria-hidden="true"></span>';
    var badges = gotyFor(row).map(function (g) {
      var label = PILL_MEDALS[g.place] + " " + esc(g.year) + ": " + esc(g.place);  // "🥈 2024: Runner-up", "🏆 2010s: Game of the Decade"
      var cls = "gh-badge" + (MEDAL_CLASS[g.place] || "");
      return g.url ? '<a class="' + cls + '" href="' + esc(g.url) + '">' + label + "</a>" : '<span class="' + cls + '">' + label + "</span>";
    }).join("");
    // An earned platinum: not tied to a year, so just the word
    if (row.entries.some(function (e) { return e.platinum; })) badges += '<span class="gh-badge gh-platinum">Platinum</span>';
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
          '<td class="gh-hide-m">' + unlockShare(g.entries) + "</td>" +
          '<td class="gh-hide-t">' + (g.captures || "-") + "</td></tr>";
      }).join("") + "</tbody>" + platformTotals(plats) + "</table></div>";

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
