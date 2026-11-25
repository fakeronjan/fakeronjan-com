// Gameplay Stats (/video-games/gameplay-stats/) and its game pages
// (/video-games/gameplay-stats/game/?id=...). Data comes from the
// gameplay-tracking repo (refreshed daily) and the gameplay-screenshots repo.
(function () {
  var page = document.getElementById("ghPage") || document.getElementById("ghGamePage") || document.getElementById("ghSeriesPage") || document.getElementById("ghSystemPage");
  if (!page) return;
  var BASE = page.dataset.source;
  var SHOTS = page.dataset.shots;
  // Alphabetical everywhere platforms are listed: legends, pills, lanes, and table cells
  var FAMILIES = ["Apple", "Meta", "Nintendo", "PlayStation", "Steam", "Xbox"];
  var LANE = { Apple: 0, Meta: 1, Nintendo: 2, PlayStation: 3, Steam: 4, Xbox: 5 };
  // Meta has no achievement names: no Trophy Room pill. Apple has Game Center achievements
  // from the 2026-11-24 data export (no rarity, descriptions, or icons)
  var UNLOCK_FAMILIES = FAMILIES.filter(function (f) { return f !== "Meta"; });
  var MONTHS = "JFMAMJJASOND";
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var KIND_ORDER = { platinum: 4, master: 3.5, gold: 3, silver: 2, bronze: 1 };  // master: Zelda Notes medals
  var GAME_URL = "/video-games/gameplay-stats/game/?id=";
  var SERIES_URL = "/video-games/gameplay-stats/series/?id=";
  var SYSTEM_URL = "/video-games/gameplay-stats/system/?id=";

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

  // Hours always to the tenth ("136.0", "2.4"); a few minutes that round to 0.0 show "<0.1"
  function fmtHours(h) { return h < 0.05 ? "<0.1" : (Math.round(h * 10) / 10).toFixed(1); }
  // null means no play time at all
  function hours(h, estimated) {
    if (h == null) return "-";
    return (estimated ? "~" : "") + fmtHours(h);
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
  // last played across them, the game's days played, and summed hours, unlocks, and screenshots
  function platformTotals(plats, row) {
    if (plats.length < 2) return "";
    var first = null, last = null, mins = 0, est = false, captures = 0, all = [];
    plats.forEach(function (g) {
      if (g.first && (!first || g.first < first)) first = g.first;
      if (g.last && (!last || g.last > last)) last = g.last;
      mins += g.minutes; est = est || g.estimated; captures += g.captures;
      all = all.concat(g.entries);
    });
    return '<tfoot><tr class="gh-total"><td class="gh-wrap">Total</td>' +
      '<td class="gh-hide-m">' + fmtDay(first) + "</td><td>" + fmtDay(last) + "</td>" +
      "<td>" + (daysPlayed(row) || "-") + "</td>" +
      "<td>" + (mins ? hours(Math.round(mins / 6) / 10, est) : "-") + "</td>" +
      '<td class="gh-hide-m">' + (unlockCount(all) || "-") + "</td>" +
      '<td class="gh-hide-t">' + (captures || "-") + "</td></tr></tfoot>";
  }

  function platKey(e) { return e.family + "|" + e.platform + "|" + (e.gamertag || ""); }

  // Days played on PlayStation, Steam, and Xbox count only days with a trophy or achievement: the
  // footnote for the Days played† column, in the Data Summary grid's own words
  var DAY_NOTES = [
    { test: function (g) { return g.family === "PlayStation" && /PS3|Vita/.test(g.label); }, text: "PS3, Vita: Counts days with a trophy" },
    { test: function (g) { return g.family === "PlayStation" && /PS4|PS5/.test(g.label); }, text: "PS4, PS5: Counts days with a trophy, plus first and last played" },
    { test: function (g) { return g.family === "Steam" || (g.family === "Xbox" && !/360/.test(g.label)); }, text: "Steam, Xbox One, Series X|S: Counts days with an achievement, plus last played" },
    { test: function (g) { return g.family === "Xbox" && /360/.test(g.label); }, text: "360: Counts days with an achievement" },
    { test: function (g) { return g.family === "Apple"; }, text: "iOS: Counts days with a screenshot, achievement, or Game Center launch, plus last played" },
    { test: function (g) { return g.family === "Meta"; }, text: "Quest: Counts days with a first save or a new Beat Saber song" },
  ];
  function dayNotes(groups) {
    var lines = DAY_NOTES.filter(function (n) { return groups.some(n.test); });
    return lines.length ? '<div class="gh-day-notes">' + lines.map(function (n) { return "<p>&dagger; " + esc(n.text) + "</p>"; }).join("") + "</div>" : "";
  }

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
      // Miiverse's "Wii U/3DS" says less than Nintendo's own play history when the row has it
      if (labels.length > 1) labels = labels.filter(function (l) { return l !== "Wii U/3DS"; });
      return '<span class="gh-plat-line">' + dots([f]) + " " + labels.map(function (l) { return '<span class="gh-nowrap">' + esc(l) + "</span>"; }).join(", ") + "</span>";
    }).join("");
  }

  // iOS achievements have no icons (Game Center's export and in-game screenshots): an Apple mark
  // stands in, in the Apple platform color (Ronjan 2026-11-24). Path: Simple Icons "apple", CC0
  var APPLE_MARK = '<span class="gh-unlock-blank gh-unlock-apple" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg></span>';

  function familyOfEntry(entryId) {
    return { psn: "PlayStation", xbox: "Xbox", steam: "Steam", nintendo: "Nintendo", ios: "Apple", gc: "Apple", meta: "Meta" }[entryId.split(":")[0]];  // nintendo: Zelda Notes medals
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

  // ── Nintendo play history: days played and hours, but only first and last played dated ──
  // Each Nintendo record carries its play spread over its first-to-last span by the play model
  // (build_games.py model_span): e.modeled = {"YYYY-MM": [days, minutes]}. Estimates.
  function ninRecords(row) { return row.entries.filter(function (e) { return e.modeled; }); }
  function modeledIn(row, prefix) {  // [days, minutes] modeled in a year ("2014") or month ("2014-03")
    var d = 0, m = 0;
    ninRecords(row).forEach(function (e) {
      Object.keys(e.modeled).forEach(function (k) { if (k.indexOf(prefix) === 0) { d += e.modeled[k][0]; m += e.modeled[k][1]; } });
    });
    return [d, m];
  }
  function spanYears(row) {
    var ys = {};
    ninRecords(row).forEach(function (e) { Object.keys(e.modeled).forEach(function (k) { ys[k.slice(0, 4)] = 1; }); });
    return Object.keys(ys);
  }
  // PlayStation, Steam, and Xbox play records carry modeled minutes by month (e.modeled_hours):
  // real total hours spread over first-to-last played around the trophy and achievement days
  function modeledMinutes(row, prefix, family) {
    var m = 0;
    row.entries.forEach(function (e) {
      if (!e.modeled_hours || (family && e.family !== family)) return;
      Object.keys(e.modeled_hours).forEach(function (k) { if (k.indexOf(prefix) === 0) m += e.modeled_hours[k]; });
    });
    return m;
  }
  function spanYears(row) {
    var ys = {};
    ninRecords(row).forEach(function (e) { Object.keys(e.modeled).forEach(function (k) { ys[k.slice(0, 4)] = 1; }); });
    row.entries.forEach(function (e) { Object.keys(e.modeled_hours || {}).forEach(function (k) { ys[k.slice(0, 4)] = 1; }); });
    return Object.keys(ys);
  }
  // Only Nintendo spans hold modeled days (other platforms model hours, not days)
  function inSpans(row, d) { return (row.spans || []).some(function (sp) { return sp[2] === "Nintendo" && sp[0] <= d && d <= sp[1]; }); }
  // How much a span's month holds: Nintendo by modeled days, other platforms by modeled minutes
  function spanAmount(row, f, month) { return f === "Nintendo" ? modeledIn(row, month)[0] : modeledMinutes(row, month, f); }
  // A year's span pieces, one per month, clipped to the span: [[start, end, opacity, family], ...],
  // opacity from that month's modeled play against the game's busiest month on that platform
  function spansIn(row, y) {
    var out = [], peak = {};
    (row.spans || []).forEach(function (sp) {
      var f = sp[2];
      if (peak[f] == null) {
        peak[f] = 0;
        var months = {};
        row.entries.forEach(function (e) {
          if (e.family !== f) return;
          Object.keys(e.modeled || e.modeled_hours || {}).forEach(function (k) { months[k] = 1; });
        });
        Object.keys(months).forEach(function (k) { peak[f] = Math.max(peak[f], spanAmount(row, f, k)); });
      }
      for (var mo = 1; mo <= 12; mo++) {
        var mm = y + "-" + (mo < 10 ? "0" : "") + mo, last = new Date(Date.UTC(+y, mo, 0)).getUTCDate();
        var s = mm + "-01", e = mm + "-" + last;
        if (s < sp[0]) s = sp[0];
        if (e > sp[1]) e = sp[1];
        if (s > e) continue;
        var amt = spanAmount(row, f, mm);
        out.push([s, e, peak[f] ? 0.15 + 0.85 * amt / peak[f] : 0.15, f]);  // shaded against the busiest month
      }
    });
    return out;
  }
  function ninDaysPlayed(row) {
    var n = 0;
    ninRecords(row).forEach(function (e) { n += e.span_days || 0; });
    return n;
  }
  // Days played in a year: dated days outside the spans, plus the modeled days (or the dated days
  // inside the spans, if there are more of those)
  function yearDays(row, y) {
    var outside = 0, inside = 0, seen = {};
    Object.keys(row.days_by_family || {}).forEach(function (f) {
      row.days_by_family[f].forEach(function (d) {
        if (d.slice(0, 4) !== y || seen[d]) return;
        seen[d] = 1;
        if (inSpans(row, d)) inside++; else outside++;
      });
    });
    var modeled = Math.round(modeledIn(row, y)[0]);
    return modeled > inside ? { n: outside + modeled, est: true } : { n: outside + inside, est: false };
  }
  function daysPlayed(row) { return row.days_played != null ? row.days_played : row.days.length; }
  // A game's estimated hours in one year. Each platform family's lifetime hours are spread
  // evenly over that family's recorded days, then the year's days are added up, so Xbox
  // hours never ride on Nintendo screenshot days (and Nintendo, with no hours, adds none)
  function yearHours(row, yr) {
    var total = 0, any = false;
    Object.keys(row.days_by_family || {}).forEach(function (f) {
      var mins = 0;
      row.entries.forEach(function (e) { if (e.family === f) mins += e.minutes || 0; });
      var days = row.days_by_family[f];
      var recs = row.entries.filter(function (e) { return e.id.indexOf("nintendo:") === 0; });
      if (f === "Nintendo" && recs.length) {
        // Nintendo's records: modeled minutes (see modeledIn) plus minutes on logged or dated days
        var m = modeledIn(row, yr)[1];
        recs.forEach(function (e) {
          Object.keys(e.day_minutes || {}).forEach(function (d) { if (d.slice(0, 4) === yr) m += e.day_minutes[d]; });
        });
        if (m) { total += m / 60; any = true; }
        return;
      }
      // Modeled records' minutes by month, then any other recorded minutes spread over the days
      var mod = modeledMinutes(row, yr, f), rest = 0;
      row.entries.forEach(function (e) { if (e.family === f && !e.modeled_hours) rest += e.minutes || 0; });
      if (mod) { total += mod / 60; any = true; }
      if (!rest || !days.length) return;
      var inYear = days.filter(function (d) { return d.slice(0, 4) === yr; }).length;
      if (inYear) { total += rest / 60 * inYear / days.length; any = true; }
    });
    return any ? total : null;
  }

  // Hand-picked games someone else in the family played a lot of (Ronjan, 2026-11-12)
  var FAMILY_NOTE = "Includes significant play time from other family members";
  function familyMark(row) { return row.family_play ? '<span class="gh-family" title="' + FAMILY_NOTE + '">*</span>' : ""; }

  // ── year strips: every year at once, or one game's years ────────────────
  // Each strip is January to December with a lane per platform family; each
  // mark is a day with activity on that platform.

  function yearStrip(year, daysByFamily, bands, shade) {
    var a = Date.UTC(+year, 0, 1), span = Date.UTC(+year + 1, 0, 1) - a;
    var grid = "", marks = "";
    for (var i = 1; i < 12; i++) {
      grid += '<line x1="' + (i / 12 * 100) + '" x2="' + (i / 12 * 100) + '" y1="0" y2="32" class="gh-grid" vector-effect="non-scaling-stroke"/>';
    }
    // First-to-last spans of modeled records, faint, under the day marks, in each platform's lane
    // One game: its monthly pieces, shaded by modeled play. Many games: one faint band per
    // stretch, so overlapping games don't stack into a solid bar
    var merged = [];
    if (shade) merged = bands || [];
    else (bands || []).slice().sort(function (p, q) { return p[3] < q[3] ? -1 : p[3] > q[3] ? 1 : p[0] < q[0] ? -1 : 1; }).forEach(function (b) {
      var last = merged[merged.length - 1];
      if (last && last[3] === b[3] && b[0] <= last[1]) { if (b[1] > last[1]) last[1] = b[1]; } else merged.push([b[0], b[1], 0, b[3]]);
    });
    merged.forEach(function (b) {
      var x0 = (Date.UTC(+b[0].slice(0, 4), +b[0].slice(5, 7) - 1, +b[0].slice(8, 10)) - a) / span * 100;
      var x1 = (Date.UTC(+b[1].slice(0, 4), +b[1].slice(5, 7) - 1, +b[1].slice(8, 10)) + 864e5 - a) / span * 100;
      marks += '<rect x="' + x0 + '" y="' + (2 + LANE[b[3]] * 5) + '" width="' + (x1 - x0) + '" height="4" class="gh-band gh-fill-' + b[3].toLowerCase() + '"' +
        (shade ? ' style="opacity:' + (b[2] * 0.75).toFixed(2) + '"' : "") + "/>";
    });
    Object.keys(daysByFamily).forEach(function (f) {
      Object.keys(daysByFamily[f]).forEach(function (d) {
        var x = (Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + 43200000 - a) / span * 100;
        marks += '<rect x="' + (x - 0.14) + '" y="' + (2 + LANE[f] * 5) + '" width="0.28" height="4" class="gh-fill-' + f.toLowerCase() + '"><title>' + f + ": " + fmtDay(d) + "</title></rect>";
      });
    });
    return '<svg class="gh-strip" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="' + year + '">' + grid + marks + "</svg>";
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
      var byFam = {}, games = [], daySet = {}, bands = [];
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
        var yd = yearDays(r, y);
        bands = bands.concat(spansIn(r, y));
        // A year with no dated days still counts when the model puts play time in it
        if (yd.n || modeledMinutes(r, y) >= 3) games.push({ n: yd.n, est: yd.est, row: r });
      });
      if (!games.length) return;
      games.sort(function (p, q) { return q.n - p.n; });
      var label = opts.zoom ? '<button type="button" class="gh-year" data-year="' + y + '">' + y + "</button>" : '<span class="gh-year">' + y + "</span>";
      if (opts.totals) {  // the year's games and hours, small under the year
        var t = opts.totals(y);
        label = '<div class="gh-year-cell">' + label + '<span class="gh-year-tot">' + plural(t.games, "game", "games") + "</span>" +
          (t.hours >= 0.5 ? '<span class="gh-year-tot">~' + Math.round(t.hours).toLocaleString() + " hrs</span>" : "") + "</div>";
      }
      h += label + yearStrip(y, byFam, bands, rows.length === 1) + '<div class="gh-year-sum">' + opts.summary(y, games, Object.keys(daySet).length) + "</div>";
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
  // Game of the Year is the gold medal; 🏆 means trophies on game pages
  var PILL_MEDALS = { "Game of the Year": "&#129351;", "Game of the Decade": "&#129351;", "Runner-up": "&#129352;", "3rd place": "&#129353;" };
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
        return '<div class="gh-unlock">' + (u.img ? '<img src="' + BASE + "/" + u.img + '" alt="" loading="lazy">' : familyOfEntry(u.entry) === "Apple" ? APPLE_MARK : '<span class="gh-unlock-blank"></span>') +
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
    // Games played under an hour (recorded or estimated) show unless unchecked; unchecked, games on
    // an awards list still show (Ronjan, 2026-11-14: replaced the "played at least" dropdown)
    var shortBtn = document.getElementById("ghShort"), showShort = true;
    function setShort(on) {
      showShort = on;
      shortBtn.checked = on;
    }
    var yearSel = document.getElementById("ghYear");
    var sortPills = document.getElementById("ghYearSort"), yearSort = "last";
    // Games marked * (others in the family played them a lot) stay off the Timeline unless asked
    // for, except ones on an awards list (see awarded) or picked to stay (timeline_always)
    var familyBtn = document.getElementById("ghFamily"), showFamily = false;
    function setFamily(on) {
      showFamily = on;
      familyBtn.checked = on;
    }
    var games = [], gamesById = {}, years = [];
    // Resolves once games.json is in gamesById. The Trophy Room can be opened (a direct
    // ?tab=trophy-room link) before that, and its unlocks need each game's name, art, and platform.
    var gamesReadyResolve, gamesReady = new Promise(function (r) { gamesReadyResolve = r; });
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
    // Games on any awards list (Game of the Year, its places, decade picks): the Timeline always
    // shows these, family play or not (Ronjan, 2026-11-12)
    var awardedIds = null;
    function awarded(r) {
      if (!awardedIds) {
        awardedIds = {};
        (window.GOTY || []).concat(window.GOTY_MORE || []).forEach(function (g) {
          var row = gameForPick(g.game, g.year);
          if (row) awardedIds[row.id] = 1;
        });
      }
      return !!awardedIds[r.id];
    }
    function gameForPick(name, year) {
      if (!pickIndex) {
        pickIndex = {};
        games.forEach(function (r) {
          awardNames(r).forEach(function (n) {
            var list = pickIndex[norm(n)] = pickIndex[norm(n)] || [];
            if (list.indexOf(r) < 0) list.push(r);
          });
        });
      }
      var k = norm(name);
      return (pickIndex[k] || pickIndex[GOTY_ALIASES[k]] || []).filter(function (r) { return pickFits(r, year); })[0] || null;
    }

    function minOK(r) {
      return showShort || (r.hours || 0) >= 1 || awarded(r);
    }

    function activateTab(name) {
      document.querySelectorAll("#ghTabs .sport-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
      document.querySelectorAll(".gh-page .sport-view").forEach(function (v) {
        var on = v.id === name;
        v.hidden = !on;
        v.classList.toggle("active", on);
      });
      // The <1 hour checkbox sits on the Timeline's control line, beside the year and family play;
      // the other tabs keep it in the bar above, with the game count
      var minBar = document.getElementById("ghMinBar"), shortLabel = shortBtn.closest("label");
      if (name === "timeline") document.querySelector(".gh-year-row").appendChild(shortLabel);
      else minBar.insertBefore(shortLabel, minBar.firstChild);
      minBar.hidden = name === "data-summary" || name === "timeline" || name === "series" || name === "systems";
      if (name === "trophy-room") loadUnlocks();
    }

    // A dotted line from a most-played game to the same game among that year's picks, drawn
    // only when the two lists sit side by side
    // Short names for the Timeline lists, so the longest titles don't set the page's layout.
    // A curated short name wins (and may run a few characters past the cap). Otherwise, in
    // order: a combined row ("Street Fighter IV + Super Street Fighter IV + ...") keeps its
    // first game; "The Legend of Zelda" becomes "Zelda"; a "Remastered" tag drops; a numbered
    // game drops its subtitle when no other game shares the number (Uncharted 2, Danganronpa V3);
    // anything still past MAX_TITLE characters (40 in a single year's rows, which have more
    // room) ends at its last whole word with "…". The full
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
      "Super Mario RPG: Legend of the Seven Stars": "Super Mario RPG (SNES)",
      "Super Mario RPG": "Super Mario RPG (Switch)",
      "Disney Classic Games: Aladdin and The Lion King": "Aladdin and The Lion King",
      "Castlevania Requiem: Symphony of the Night & Rondo of Blood": "Castlevania Requiem",
      "Star Wars: Knights of the Old Republic II: The Sith Lords": "KOTOR II",
      "Teenage Mutant Ninja Turtles: The Cowabunga Collection": "TMNT: The Cowabunga Collection",
      "The Matrix Awakens: An Unreal Engine 5 Experience": "The Matrix Awakens",
      "Life is Strange: Before the Storm": "Life is Strange: BtS",
      "EA Sports College Football 25": "College Football 25",
      "EA Sports College Football 26": "College Football 26",
      "Teenage Mutant Ninja Turtles: Shredder's Revenge": "TMNT: Shredder's Revenge",
      "The Legend of Zelda: Tears of the Kingdom": "Zelda: Tears of the Kingdom",
      "The Legend of Zelda: A Link Between Worlds": "Zelda: A Link Between Worlds",
    };
    var prefixCount = null;
    function shortTitle(name, max) {
      max = max || MAX_TITLE;
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
      t = t.replace(/ Remastered$/, "").replace(/( -|:) (The )?(Definitive|Console|Apocalypse|Ultimate|Complete|Deluxe|Game of the Year) Edition$/, "");
      var i = t.indexOf(": "), head = i > 0 ? t.slice(0, i) : "";
      if (head && head !== "Zelda" && /(\d+|\b[IVX]+|V\d)$/.test(head) && prefixCount[norm(head)] === 1) t = head;
      if (t.length > max) {
        var cut = t.slice(0, max - 1), sp = cut.lastIndexOf(" ");
        t = (sp > 8 ? cut.slice(0, sp) : cut).replace(/[\s:,.+\-]+$/, "") + "\u2026";
      }
      return t;
    }
    function listLink(id, name, max) {
      var t = shortTitle(name, max);
      if (t === name) return gameLink(id, name);
      return '<a class="gh-glink" href="' + GAME_URL + encodeURIComponent(id) + '" title="' + esc(name) + '">' + esc(t) + "</a>";
    }
    function listText(name) {
      var t = shortTitle(name);
      return t === name ? esc(name) : '<span title="' + esc(name) + '">' + esc(t) + "</span>";
    }

    // The Timeline tab rounds hours to the whole hour ("~62 hrs", "<1 hr"); everywhere else keeps
    // the tenth (fmtHours) (Ronjan, 2026-11-12)
    function timelineHours(h) { return h < 0.5 ? "<1 hr" : "~" + plural(Math.round(h), "hr", "hrs"); }

    // Most played: hours that year (recorded or modeled); a game with no hours at all goes after,
    // by its days. playedText shows the hours, or the days when there are no hours
    function byHours(p, q) {
      var a = (p.hrs || 0) >= 0.05 ? p.hrs : -1, b = (q.hrs || 0) >= 0.05 ? q.hrs : -1;
      return b - a || (q.days || q.n || 0) - (p.days || p.n || 0);
    }
    function playedText(g) {
      if ((g.hrs || 0) >= 0.05) return timelineHours(g.hrs);
      var n = g.days || g.n || 0;
      return n ? (g.est ? "~" : "") + plural(n, "day", "days") : "";
    }

    // A trophy or achievement list's progress in one year: share unlocked at the start of the year
    // and at the end, for the list that moved most (with a platinum only when earned that year)
    function progressIn(row, yr) {
      var best = null, plat = false;
      row.entries.forEach(function (e) {
        var by = e.earned_by_year || {};
        if (!e.total || by[yr] == null) return;
        var before = 0;
        Object.keys(by).forEach(function (k) { if (k < yr) before = Math.max(before, by[k]); });
        var c = { from: before / e.total, to: by[yr] / e.total };
        c.gain = c.to - c.from;
        if (!best || c.gain > best.gain || (c.gain === best.gain && c.to > best.to)) best = c;
        if (e.platinum && e.platinum.slice(0, 4) === yr) plat = true;
      });
      if (best) best.plat = plat;
      return best;
    }
    function progressText(d) { return Math.floor(d.from * 100) + "% \u2192 " + Math.floor(d.pct * 100) + "%"; }

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
      var rowGaps = parseFloat(getComputedStyle(grid).columnGap) * 2, yearCol = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
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
      var rows = games.filter(function (r) { return minOK(r) && (showFamily || !r.family_play || awarded(r) || r.timeline_always); });
      var out = document.getElementById("ghTimeline");
      var count = document.getElementById("ghYearCount");
      if (!y) {
        count.textContent = "Choose a year to see all games played";
        sortPills.hidden = true;
        count.classList.add("gh-hint");
        out.innerHTML = yearStrips(rows, years, {
          zoom: true,
          // Every game played that year, whatever the under-an-hour filter; family-play games
          // only when they're included (their hours are partly other people's) (Ronjan, 2026-11-12)
          totals: function (yr) {
            var n = 0, hrs = 0;
            games.forEach(function (r) {
              if (r.family_play && !showFamily && !awarded(r) && !r.timeline_always) return;
              // Every hour counts; a game counts as played that year with a real day in it, or
              // an hour or more of modeled play (a model's faint tail alone doesn't)
              var h = yearHours(r, yr) || 0;
              hrs += h;
              if (yearDays(r, yr).n || h >= 1) n++;
            });
            return { games: n, hours: hrs };
          },
          header: "<span>&#128338; Most played</span><span class=\"gh-head-goty\">Game of the Year</span><span>&#127942; Most progress</span>",
          summary: function (yr, gs) {
            var picks = gotyByYear()[yr] || [], RANKS = ["1&#65039;&#8419; ", "2&#65039;&#8419; ", "3&#65039;&#8419; ", "4&#65039;&#8419; ", "5&#65039;&#8419; "];
            // Most progress: how far a trophy or achievement list moved that year, start of year to
            // end (best list when a game has several), among games with an unlock that year
            var done = gs.map(function (g) {
              var best = progressIn(g.row, yr);
              return best && { row: g.row, from: best.from, pct: best.to, gain: best.gain, plat: best.plat };
            }).filter(Boolean).sort(function (p, q) { return q.gain - p.gain || q.pct - p.pct; }).slice(0, 5);
            // Most played: hours that year, recorded or modeled (see yearHours and byHours)
            var played = gs.map(function (g) {
              var hrs = yearHours(g.row, yr);
              return { row: g.row, days: g.n, est: g.est, hrs: hrs };
            }).sort(byHours).slice(0, 5);
            return '<div class="gh-sum-list gh-sum-tops" data-label="Most played">' + played.map(function (g, i) {
                return '<span data-gid="' + esc(g.row.id) + '">' + RANKS[i] + listLink(g.row.id, g.row.name) + familyMark(g.row) + ' <i class="gh-pct">' +
                  playedText(g) + "</i></span>";
              }).join("") + "</div>" +
              (picks.length ? '<div class="gh-sum-band"></div>' : "") +  // no picks yet: an empty cell
              '<div class="gh-sum-list gh-sum-goty" data-label="Game of the Year">' + (picks.length ? picks.map(function (p) {
                var row = gameForPick(p.game, p.year);
                var medal = { "Runner-up": "&#129352; ", "3rd place": "&#129353; ", "4th place": "&#127808; ", "5th place": "&#9995; " }[p.place] || "&#129351; ";
                return (row ? '<span data-gid="' + esc(row.id) + '">' : "<span>") + medal + (row ? listLink(row.id, p.game) : listText(p.game)) + "</span>";
              }).join("") : "") + "</div>" +
              '<div class="gh-sum-list gh-sum-done" data-label="Most progress">' + (done.length ? done.map(function (d, i) {
                return '<span data-gid="' + esc(d.row.id) + '">' + RANKS[i] + listLink(d.row.id, d.row.name) + ' <i class="gh-pct">' + progressText(d) + "</i>" +
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
        all = all.filter(function (d, i) { return all.indexOf(d) === i; });
        var yd = yearDays(r, y), sp = spansIn(r, y);
        // The same numbers as the year's summary: days or estimated hours, the best list's share
        // at the end of the year (and a platinum earned by then), and the year's pick, if any
        var hrs = yearHours(r, y), prog = progressIn(r, y), done = prog && prog.gain, plat = !!(prog && prog.plat);
        var pick = (gotyByYear()[y] || []).filter(function (p) { var g = gameForPick(p.game, p.year); return g && g.id === r.id; })[0];
        // The row's reach that year: its dated days and its Nintendo spans
        var reach = all.concat.apply(all, sp.map(function (b) { return [b[0], b[1]]; })).sort();
        sp.forEach(function (b) { if (!fams[b[3]]) fams[b[3]] = []; });
        return { row: r, fams: fams, all: all, reach: reach, sp: sp, n: yd.n, est: yd.est, hrs: hrs, done: done, prog: prog, plat: plat, pick: pick };
      }).filter(function (o) { return o.n || (o.hrs || 0) >= 0.05; })
        .sort(function (p, q) {
          // Last played that year (newest first), most played (hours that year, as in the
          // summary), or most progress that year (games without a list last)
          var lastP = p.reach[p.reach.length - 1], lastQ = q.reach[q.reach.length - 1];
          var by = yearSort === "most" ? byHours(p, q)
            : yearSort === "done" ? (q.done == null ? -1 : q.done) - (p.done == null ? -1 : p.done)
            : lastQ < lastP ? -1 : lastQ > lastP ? 1 : 0;
          return by || p.row.name.localeCompare(q.row.name);
        });
      sortPills.hidden = false;
      count.classList.remove("gh-hint");
      count.innerHTML = plural(inYear.length, "game", "games") + " in " + y + ' <a href="#" id="ghAllYears" class="gh-all-years">All years</a>';
      document.getElementById("ghAllYears").addEventListener("click", function (e) {
        e.preventDefault(); yearSel.value = ""; renderTimeline(); url.write();
      });
      var MEDAL = { "Game of the Year": "&#129351;", "Runner-up": "&#129352;", "3rd place": "&#129353;", "4th place": "&#127808;", "5th place": "&#9995;" };
      var w = 0.32, h = '<div class="gh-rows"><div></div>' + monthHeader() + '<div class="gh-row-head">Played</div><div class="gh-row-head">Progress</div>';
      inYear.forEach(function (o) {
        var s = x(o.reach[0]), e = Math.max(x(o.reach[o.reach.length - 1]), s + w);
        var tip = o.row.name + ": " + (o.est ? "about " : "") + plural(o.n, "day", "days") + " in " + y + ", " + fmtDay(o.reach[0]) + " to " + fmtDay(o.reach[o.reach.length - 1]);
        var bands = o.sp.map(function (b) {
          var mm = b[0].slice(0, 7), when = MONTH_NAMES[+mm.slice(5, 7) - 1] + " " + mm.slice(0, 4);
          var amt = b[3] === "Nintendo" ? "about " + plural(Math.round(modeledIn(o.row, mm)[0] * 10) / 10, "day", "days")
            : "about " + fmtHours(modeledMinutes(o.row, mm, b[3]) / 60) + " hours";
          return '<rect x="' + x(b[0]) + '" y="5" width="' + Math.max(w, x(b[1]) + 100 / 365 - x(b[0])) + '" height="6" class="gh-band gh-fill-' + b[3].toLowerCase() + '" style="opacity:' + (b[2] * 0.75).toFixed(2) + '"><title>' +
            esc(o.row.name) + " (" + b[3] + "): " + amt + " in " + when + ", estimated</title></rect>";
        }).join("");
        var ticks = Object.keys(o.fams).map(function (f) {
          return o.fams[f].map(function (d) {
            return '<rect x="' + (x(d) - w / 2) + '" y="2" width="' + w + '" height="12" class="gh-fill-' + f.toLowerCase() + '"><title>' + esc(o.row.name) + " (" + f + "): " + fmtDay(d) + "</title></rect>";
          }).join("");
        }).join("");
        var medal = o.pick ? ' <span class="gh-row-pick" title="' + esc(y + ": " + o.pick.place) + '">' + MEDAL[o.pick.place] + "</span>" : "";
        h += '<div class="gh-row-name">' + thumb(o.row.img, "gh-thumb-xs") + dots(Object.keys(o.fams).sort()) + "<span>" + listLink(o.row.id, o.row.name, 40) + familyMark(o.row) + medal + "</span></div>" +
          '<svg class="gh-row-svg" viewBox="0 0 100 16" preserveAspectRatio="none" role="img" aria-label="' + esc(tip) + '">' +
          '<line x1="' + s + '" x2="' + e + '" y1="8" y2="8" class="gh-span" vector-effect="non-scaling-stroke"><title>' + esc(tip) + "</title></line>" + bands + ticks + "</svg>" +
          '<div class="gh-row-stat">' + [(o.hrs || 0) >= 0.05 ? timelineHours(o.hrs) : "", o.n ? (o.est ? "~" : "") + plural(o.n, "day", "days") : ""].filter(Boolean).join(", ") + familyMark(o.row) + "</div>" +
          '<div class="gh-row-stat">' + (o.prog ? progressText({ from: o.prog.from, pct: o.prog.to }) : "") + (o.plat ? ' <span class="gh-pill gh-platinum">Platinum</span>' : "") + "</div>";
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
          { k: "n", h: "Game", cls: "gh-wrap gh-name", v: function (r) { return r.name.toLowerCase(); }, r: function (r) { return '<div class="gh-with-thumb">' + thumb(r.img) + "<span><b>" + gameLink(r.id, r.name) + familyMark(r) + "</b>" + pills(r) + "</span></div>"; } },
          { k: "f", h: "Platforms", cls: "gh-wrap gh-plat gh-hide-m", v: function (r) { return r.families.join(); }, r: function (r) { return platformLines(r); } },
          { k: "first", h: "First played", cls: "gh-hide-t", desc: true, v: function (r) { return r.first; }, r: function (r) { return fmtDay(r.first); } },
          { k: "last", h: "Last played", desc: true, v: function (r) { return r.last; }, r: function (r) { return fmtDay(r.last); } },
          { k: "d", h: "Days played&dagger;", desc: true, v: function (r) { return daysPlayed(r) || null; }, r: function (r) { return daysPlayed(r) ? daysPlayed(r) + familyMark(r) : "-"; } },
          { k: "h", h: "Hours played", desc: true, v: function (r) { return r.hours; }, r: function (r) { return hours(r.hours, r.hours_estimated) + familyMark(r); } },
          { k: "u", h: "Unlocks", cls: "gh-hide-m", desc: true, v: function (r) { return r.best ? r.best.pct : null; }, r: unlockCell },
        ],
      });
    }

    function loadUnlocks() {
      if (unlocksLoaded) return unlocksLoaded;
      var total = games.reduce(function (s, r) { return s + (r.unlocks ? r.unlocks[0] : 0); }, 0);
      document.getElementById("ghUnlockLoading").textContent = "Loading " + total.toLocaleString() + " trophies and achievements";
      // Waits for gamesReady (see above); seen 11/18 in a local preview, where the medal rows came up
      // with no game name or platform
      unlocksLoaded = Promise.all([getJSON(BASE + "/data/unlocks.json"), getJSON(SHOTS + "/moments.json").catch(function () { return {}; }), gamesReady]).then(function (res) {
        var unlocks = prepUnlocks(res[0], gamesById, res[1]);
        drawUnlocks = table({
          el: document.getElementById("ghUnlockTable"), count: document.getElementById("ghUnlockCount"),
          pills: document.getElementById("ghUnlockPills"), families: UNLOCK_FAMILIES, search: document.getElementById("ghUnlockSearch"),
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
        series: { query: function () {}, apply: function () {} },
        systems: { query: function () {}, apply: function () {} },
        timeline: {
          query: function (add) {
            if (yearSel.value) add("year", yearSel.value);
            if (yearSel.value && yearSort !== "last") add("sort", yearSort);
            if (showFamily) add("family", "1");
            if (!showShort) add("short", "0");
          },
          apply: function (p) {
            setFamily(p.get("family") === "1");
            setShort(p.get("short") !== "0");
            updateMinCount();
            yearSel.value = years.indexOf(p.get("year")) !== -1 ? p.get("year") : "";
            yearSort = ["most", "done"].indexOf(p.get("sort")) !== -1 ? p.get("sort") : "last";
            window.SportUrl.setPills("ghYearSort", yearSort);
            renderTimeline();
          },
        },
        games: {
          query: function (add) { if (!showShort) add("short", "0"); },
          apply: function (p) { setShort(p.get("short") !== "0"); updateMinCount(); if (drawGames) drawGames(); },
        },
        "trophy-room": {
          query: function (add) { if (!showShort) add("short", "0"); },
          apply: function (p) { setShort(p.get("short") !== "0"); updateMinCount(); return loadUnlocks(); },
        },
      },
    });

    document.getElementById("ghTabs").addEventListener("click", function (e) {
      var b = e.target.closest(".sport-tab");
      if (!b) return;
      activateTab(b.dataset.tab);
      url.write(true);
    });
    yearSel.addEventListener("change", function () { renderTimeline(); url.write(); });
    familyBtn.addEventListener("change", function () { setFamily(familyBtn.checked); renderTimeline(); url.write(); });
    sortPills.addEventListener("click", function (e) {
      var b = e.target.closest(".pill");
      if (!b) return;
      yearSort = b.dataset.value;
      window.SportUrl.setPills("ghYearSort", yearSort);
      renderTimeline();
      url.write();
    });
    shortBtn.addEventListener("change", function () {
      setShort(shortBtn.checked);
      url.write();
      updateMinCount();
      renderTimeline();
      if (drawGames) drawGames();
      if (drawUnlocks) drawUnlocks();
    });
    legend(document.getElementById("ghLegend"));

    var seriesList = [];
    // Each series' box art wraps into rows of equal length (no orphan row): the strip gets just
    // the width its row count needs
    function balanceArt() {
      var els = document.querySelectorAll("#ghSeriesTable .gh-series-art");
      els.forEach(function (el) {
        el.style.maxWidth = "";
        if (el._shrunk) { el._shrunk = false; Array.prototype.forEach.call(el.querySelectorAll(".gh-thumb"), function (t) { t.style.width = t.style.height = ""; }); }
      });
      els.forEach(function (el) {
        var n = el.children.length, first = el.firstElementChild;
        if (!n || !first) return;
        var tile = first.getBoundingClientRect().width + 3, td = el.closest("td"), cs = getComputedStyle(td);
        var avail = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var per = Math.max(1, Math.floor((avail + 3) / tile));
        if (per >= n) return;
        // Fewest rows, then the widest row length that leaves no single tile alone on the last row
        var cols = per;
        for (var c = per; c >= Math.max(2, per - 3); c--) { if (n % c !== 1) { cols = c; break; } }
        var rows = Math.ceil(n / cols);
        cols = Math.ceil(n / rows);
        el.style.maxWidth = cols * tile - 3 + 2 + "px";  // 2px slack for subpixel widths
        el._cols = cols; el._tile = tile;
      });
      // Narrowing one strip can narrow the whole column; settle any strip that's left with a lone tile
      for (var pass = 0; pass < 4; pass++) {
        var moved = false;
        els.forEach(function (el) {
          if (lastRowCount(el) !== 1) return;
          var tile = el._tile || el.firstElementChild.getBoundingClientRect().width + 3;
          var top = Math.round(el.firstElementChild.getBoundingClientRect().top), perRow = 0;
          for (var i = 0; i < el.children.length; i++) if (Math.round(el.children[i].getBoundingClientRect().top) === top) perRow++;
          if (perRow <= 3 || (n_ok(el.children.length, perRow - 1) === false && el.children.length % (perRow - 1) === 1)) {
            // Narrower can't fix it (13 games at 4 a row leave one alone at 4 and at 3): make this
            // strip's art just small enough for one more per row
            var td = el.closest("td"), cs = getComputedStyle(td);
            var avail = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            var size = Math.floor((avail - perRow * 3) / (perRow + 1));
            if (size >= 16 && !el._shrunk) {
              el._shrunk = true;
              el.style.maxWidth = "";
              Array.prototype.forEach.call(el.querySelectorAll(".gh-thumb"), function (t) { t.style.width = t.style.height = size + "px"; });
              moved = true;
            }
            return;
          }
          el._tile = tile;
          el.style.maxWidth = (perRow - 1) * tile - 3 + 2 + "px";
          moved = true;
        });
        if (!moved) break;
      }
    }
    function n_ok(n, c) { return c >= 2 && n % c !== 1; }
    function lastRowCount(el) {
      var tops = [];
      for (var i = 0; i < el.children.length; i++) tops.push(Math.round(el.children[i].getBoundingClientRect().top));
      var last = Math.max.apply(null, tops);
      return tops.length > 1 && tops.some(function (t) { return t !== last; }) ? tops.filter(function (t) { return t === last; }).length : 0;
    }
    function renderSeries() {
      var rows = seriesList.map(function (s) { var o = seriesSummary(s, gamesById); o.s = s; return o; });
      table({
        el: document.getElementById("ghSeriesTable"), count: document.getElementById("ghSeriesCount"),
        search: document.getElementById("ghSeriesSearch"), rows: rows, sortKey: "h", desc: true,
        filter: function (o, f, q) { return !q || o.s.name.toLowerCase().indexOf(q) !== -1; },
        cols: [
          { k: "n", h: "Series", cls: "gh-wrap gh-name", v: function (o) { return o.s.name.toLowerCase(); }, r: function (o) {
            // Under the name: every game's box art, by first played (newest first, so the order
            // holds when an old game is replayed), each linking to its game
            var art = o.rows.slice().sort(byRelease).map(function (r) {
              return '<a class="gh-sy-art" href="' + GAME_URL + encodeURIComponent(r.id) + '" title="' + esc(r.name) + '">' + thumb(r.img, "gh-thumb-xs") + "</a>";
            }).join("");
            return '<b><a class="gh-glink" href="' + SERIES_URL + encodeURIComponent(o.s.id) + '">' + esc(o.s.name) + "</a>" + seriesFamily(o) + '</b><span class="gh-series-art">' + art + "</span>";
          } },
          { k: "g", h: "Games", desc: true, v: function (o) { return o.n; }, r: function (o) { return o.n; } },
          { k: "y", h: "Years", cls: "gh-hide-m", desc: true, v: function (o) { return o.last; }, r: seriesYears },
          { k: "d", h: "Days played", desc: true, v: function (o) { return o.days || null; }, r: function (o) { return (o.days || "-") + seriesFamily(o); } },
          { k: "h", h: "Hours played", desc: true, v: function (o) { return o.hours; }, r: function (o) { return hours(o.hours, o.est) + seriesFamily(o); } },
        ],
      });
    }

    var loaded = Promise.all([getJSON(BASE + "/data/games.json"), getJSON(BASE + "/data/status.json"), getJSON(BASE + "/data/series.json").catch(function () { return []; })]).then(function (res) {
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
      games.forEach(function (r) { r.days.forEach(function (d) { ys[d.slice(0, 4)] = 1; }); spanYears(r).forEach(function (y) { ys[y] = 1; }); });
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
      seriesList = res[2];
      renderSeries();
      var tbl = document.getElementById("ghSeriesTable");
      if ("MutationObserver" in window) new MutationObserver(function () { requestAnimationFrame(balanceArt); }).observe(tbl, { childList: true, subtree: true });
      window.addEventListener("resize", balanceArt);
      document.querySelector('#ghTabs [data-tab="series"]').addEventListener("click", function () { requestAnimationFrame(balanceArt); });
      requestAnimationFrame(balanceArt);
      gamesReadyResolve();
    }).catch(showError);

    // Systems: one card per system, from systems.json (built beside games.json)
    var systemsLoaded = getJSON(BASE + "/data/systems.json").then(function (list) {
      document.getElementById("ghSystems").innerHTML = '<div class="gh-sys-grid">' + sortSystems(list).map(systemCard).join("") + "</div>";
    }).catch(function () { document.getElementById("ghSystems").innerHTML = ""; showError(); });

    url.start({ timeline: loaded, games: loaded, series: loaded, systems: systemsLoaded, "trophy-room": loaded }, [loaded]);
  }

  // ── game page ───────────────────────────────────────────────────────────

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[™®©]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "");
  }
  // Game of the Year names that differ from every platform's name for the game
  var GOTY_ALIASES = { valianthearts: "valiantheartsthegreatwar", pokemonswordshield: "pokemonsword" };

  // Names an award pick can match a game by: its own name, each part of an "A + B" name, and its
  // platforms' names. A game with other versions (a remake beside the original) matches only by
  // its own name, since its platform name can be the original's: Ocarina of Time (Switch 2) is
  // "The Legend of Zelda: Ocarina of Time" on Nintendo's records, and the 1998 pick isn't its
  function awardNames(row) {
    var names = [row.name, baseName(row.name)].concat(row.name.split(" + "));
    return (row.versions || []).length ? names : names.concat(row.entries.map(function (e) { return e.name; }));
  }

  // Games sharing a name carry a suffix: the year for a different game reusing the name, God of
  // War (2005) / (2018), or the console for a remake, Paper Mario: The Thousand-Year Door (Switch).
  // A pick matches one only from a year that fits: the suffix year itself, or a year the console
  // was out, so the 2004 GameCube pick isn't the Switch remake and the 2009 Wii Punch-Out!! isn't
  // Punch-Out!! (1987)
  var CONSOLE_LAUNCH = { N64: 1996, PS4: 2013, Switch: 2017, "Switch 2": 2025 };
  function nameSuffix(name) {
    var m = /\s\(([^()]+)\)$/.exec(name);
    return m ? m[1] : null;
  }
  function baseName(name) {
    return nameSuffix(name) ? name.replace(/\s\([^()]+\)$/, "") : name;
  }
  function pickFits(row, year) {
    var suf = nameSuffix(row.name), y = parseInt(year, 10), last = /s$/.test(year) ? y + 9 : y;  // "2010s" = 2010-2019
    if (!suf || isNaN(y)) return true;
    if (/^\d{4}$/.test(suf)) return +suf >= y && +suf <= last;
    return CONSOLE_LAUNCH[suf] == null || last >= CONSOLE_LAUNCH[suf];
  }

  function gotyFor(row) {
    var names = {};
    awardNames(row).forEach(function (n) { names[norm(n)] = 1; });
    return (window.GOTY || []).filter(function (g) {
      var k = norm(g.game);
      return (names[k] || names[GOTY_ALIASES[k]]) && pickFits(row, g.year);
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
      getJSON(SHOTS + "/milestones.json").catch(function () { return {}; }),
      getJSON(SHOTS + "/blog.json").catch(function () { return {}; }),
      getJSON(BASE + "/data/series.json").catch(function () { return []; }),
    ]).then(function (res) {
      var games = res[0], gamesById = {};
      games.forEach(function (r) { r.families.sort(); gamesById[r.id] = r; });
      var row = gamesById[id];
      if (!row) {  // an old id (the row was merged or renamed): go to the row it became
        var now = games.filter(function (r) { return (r.old_ids || []).indexOf(id) !== -1; })[0];
        if (now) { location.replace(GAME_URL + encodeURIComponent(now.id) + location.hash); return; }
        out.innerHTML = ""; showError(); return;
      }
      document.title = row.name + " | FAKE RONJAN!!";
      var unlocks = prepUnlocks(res[1].filter(function (u) { return u.game === id; }), gamesById, res[4]);
      var entryIds = row.entries.map(function (e) { return e.id; });
      var gallery = res[3];
      var mvNames = row.entries.filter(function (e) { return e.id.indexOf("miiverse:") === 0; }).map(function (e) { return e.id.slice(9); });
      var posts = res[2].posts.filter(function (p) { return mvNames.indexOf(p.game) !== -1; }).reverse();
      row._seriesLines = (row.series || []).map(function (sid) {
        var s = res[7].filter(function (x) { return x.id === sid; })[0];
        if (!s) return "";
        var o = seriesSummary(s, gamesById);
        var bits = [plural(o.n, "game", "games"), seriesYears(o)];
        if (o.hours != null) bits.push((o.est ? "~" : "") + fmtHours(o.hours) + " hours");
        return '<p class="gh-series-line">Part of ' + seriesLabel(s.name).replace(s.name, '<a href="' + SERIES_URL + encodeURIComponent(s.id) + '">' + esc(s.name) + " series</a>") + ": " + esc(bits.join(", ")) + seriesFamily(o) + "</p>";
      }).join("");
      out.innerHTML = gameHtml(row, unlocks, entryIds, gallery, posts, res[5], res[6]);
      wireGame(row, unlocks, entryIds, gallery);
    }).catch(function () { out.innerHTML = ""; showError(); });
  }

  function gameHtml(row, unlocks, entryIds, gallery, posts, milestones, blog) {
    milestones = milestones || {};
    blog = blog || {};
    var facts = [];
    if (row.first) {
      facts.push("First played " + fmtDay(row.first));
      if (row.last !== row.first) facts.push("Last played " + fmtDay(row.last));
      facts.push(plural(daysPlayed(row), "day", "days") + (row.family_play ? "*" : ""));
    } else {
      facts.push("No play dates recorded");
    }
    if (row.hours != null) facts.push((row.hours_estimated ? "about " : "") + fmtHours(row.hours) + " hours" + (row.family_play ? "*" : ""));
    // Unlocks as on the Games tab: the most complete list, with its share ("on PC" when the game
    // has more than one list; the Platforms table below has each list and the total)
    var best = bestList(row), lists = countedEntries(row).filter(function (e) { return e.total; }).length;
    // 🏅 for Zelda Notes medals (Ocarina of Time on Switch 2), 🏆 for trophies and achievements
    var unitMark = function (e) { return e && e.unlock_unit === "medals" ? " \uD83C\uDFC5" : " \uD83C\uDFC6"; };
    if (best) facts.push((best.entry.earned || 0) + " of " + best.entry.total + unitMark(best.entry) +
      (lists > 1 ? " on " + platformLabel(best.entry) : "") + " (" + Math.floor(best.pct * 100) + "%)");
    else if (unlockCount(countedEntries(row))) facts.push(unlockCount(countedEntries(row)) + " \uD83C\uDFC6");

    var art = row.img ? '<img class="gh-art" src="' + BASE + "/" + row.img + '" alt="">' : '<span class="gh-art" aria-hidden="true"></span>';
    var badges = gotyFor(row).map(function (g) {
      var label = PILL_MEDALS[g.place] + " " + esc(g.year) + ": " + esc(g.place);  // "🥈 2024: Runner-up", "🥇 2010s: Game of the Decade"
      var cls = "gh-badge" + (MEDAL_CLASS[g.place] || "");
      return g.url ? '<a class="' + cls + '" href="' + esc(g.url) + '">' + label + "</a>" : '<span class="' + cls + '">' + label + "</span>";
    }).join("");
    // An earned platinum: not tied to a year, so just the word
    if (row.entries.some(function (e) { return e.platinum; })) badges += '<span class="gh-badge gh-platinum">Platinum</span>';
    var h = '<div class="gh-head">' + art + '<div class="gh-head-text"><h1>' + esc(row.name) + familyMark(row) + "</h1>" +
      '<p class="gh-facts">' + dots(row.families) + " " + facts.map(function (f) {  // each fact stays on one line; the line breaks between facts
        return '<span class="gh-nowrap">' + esc(f).replace("\uD83C\uDFC6", '<span title="Trophies and achievements" aria-label="trophies and achievements">\uD83C\uDFC6</span>')
          .replace("\uD83C\uDFC5", '<span title="Medals" aria-label="medals">\uD83C\uDFC5</span>') + "</span>";
      }).join('<span class="sport-updated-sep">|</span>') + "</p>" +
      (badges ? '<div class="gh-badges">' + badges + "</div>" : "") +
      (row._seriesLines || "") +
      (row.family_play ? '<p class="gh-family-note">* ' + FAMILY_NOTE + "</p>" : "") +
      ((row.versions || []).length ? '<p class="gh-versions">Other versions: ' + row.versions.map(function (v) { return gameLink(v.id, v.name); }).join(", ") + "</p>" : "") +
      "</div></div>";

    if (row.days.length || (row.spans || []).length) {
      var ys = {};
      row.days.forEach(function (d) { ys[d.slice(0, 4)] = 1; });
      spanYears(row).forEach(function (y) { ys[y] = 1; });
      h += '<h2 class="gh-h2">When I played</h2>' + yearStrips([row], Object.keys(ys).sort().reverse(), {
        compact: true,
        // Hours and days that year, as on the Timeline
        summary: function (y, gs) {
          var hrs = yearHours(gs[0].row, y);
          return [(hrs || 0) >= 0.05 ? "~" + fmtHours(hrs) + " hrs" : "", gs[0].n ? (gs[0].est ? "~" : "") + plural(gs[0].n, "day", "days") : ""].filter(Boolean).join(", ");
        },
      });
    }

    // Platforms: one line per platform (and Xbox gamertag), entries with activity only
    var groups = {}, order = [];
    countedEntries(row).forEach(function (e) {
      var k = platKey(e);
      if (!groups[k]) { groups[k] = { key: k, entries: [], family: e.family, label: platformLabel(e), gamertag: e.gamertag, minutes: 0, earned: 0, total: 0, first: null, last: null, captures: 0, estimated: false }; order.push(k); }
      var g = groups[k];
      g.entries.push(e);
      g.minutes += e.minutes || 0;
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
    var notes = dayNotes(plats);
    // A row with only blog screenshots (Tecmo Super NBA Basketball) has no platforms to list
    if (plats.length) h += '<h2 class="gh-h2">Platforms</h2><div class="sport-table-wrap"><table class="sport-table gh-table"><thead><tr><th class="gh-wrap">Platform</th><th class="gh-hide-m">First played</th><th>Last played</th><th>Days played' + (notes ? "&dagger;" : "") + "</th><th>Hours played</th>" + '<th class="gh-hide-m">Unlocks</th><th class="gh-hide-t">Screenshots</th></tr></thead><tbody>' +
      plats.map(function (g) {
        var days = (row.days_by_platform || {})[g.key];
        return '<tr><td class="gh-wrap">' + dots([g.family]) + " " + esc(g.label) + "</td>" +
          '<td class="gh-hide-m">' + fmtDay(g.first) + "</td><td>" + fmtDay(g.last) + "</td>" +
          "<td>" + (days || "-") + "</td>" +
          "<td>" + (g.minutes ? hours(Math.round(g.minutes / 6) / 10, g.estimated) : "-") + "</td>" +
          '<td class="gh-hide-m">' + unlockShare(g.entries) + "</td>" +
          '<td class="gh-hide-t">' + (g.captures || "-") + "</td></tr>";
      }).join("") + "</tbody>" + platformTotals(plats, row) + "</table></div>" + notes;

    // Screenshots: Switch, PlayStation, iOS, and Miiverse, from the gallery repo, drawn by wireGame
    // (with platform pills when there are two or more). A Miiverse screenshot carries
    // its post's text as the caption under it.
    // Camera photos of the screen live under "camera:<row name>" (Photos)
    var shotIds = entryIds.indexOf("camera:" + row.name) === -1 ? entryIds.concat(["camera:" + row.name]) : entryIds;
    var shots = row._shots = gameShots(shotIds, gallery, posts);
    row._shotTotals = {};
    shotIds.forEach(function (eid) {
      if (!gallery[eid]) return;
      var f = shotFamily(eid);
      row._shotTotals[f] = (row._shotTotals[f] || 0) + gallery[eid].total;
    });
    if (shots.length) {
      h += '<h2 class="gh-h2">Screenshots</h2><div class="sport-controls"><div class="pill-group" id="ghShotPills" hidden></div></div>' +
        '<p class="gh-caption" id="ghShotCap"></p><div class="gh-shots" id="ghShots"></div>';
    }

    // Screenshots from Ronjan's posts, newest post first, each linking to its post
    var bl = row._blog = [];
    entryIds.forEach(function (eid) { if (blog[eid]) bl.push.apply(bl, blog[eid]); });
    // Newest post first; within a post, the order the screenshots appear in it
    bl.sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.post !== b.post ? (a.post < b.post ? -1 : 1) : (a.pos || 0) - (b.pos || 0); });
    if (bl.length) h += '<h2 class="gh-h2">From the blog</h2><div id="ghBlog"></div>';

    if (unlocks.length) {
      var fams = FAMILIES.filter(function (f) { return unlocks.some(function (u) { return u.family === f; }); });
      // Nintendo's only unlocks are Zelda Notes medals
      var medals = unlocks.filter(function (u) { return u.family === "Nintendo"; }).length;
      var heading = medals === unlocks.length ? "Medals" : medals ? "Trophies, achievements, and medals" : "Trophies and achievements";
      h += '<h2 class="gh-h2">' + heading + " (" + unlocks.length + ')</h2>' +
        '<div class="sport-controls"><div class="pill-group" id="ghGameUnlockPills"' + (fams.length > 1 ? "" : " hidden") + "></div></div>" +
        '<div class="sport-table-wrap" id="ghGameUnlocks"></div>';
      row._fams = fams;
    }

    // Zelda Notes milestones: the game's own pictures of a stat passing a round number, newest first
    var ms = row._milestones = [];
    entryIds.forEach(function (eid) { if (milestones[eid]) ms.push.apply(ms, milestones[eid]); });
    ms.sort(function (a, b) { return a.time < b.time ? 1 : -1; });
    if (ms.length) {
      h += '<h2 class="gh-h2">Milestones (' + ms.length + ')</h2><div class="gh-shots" id="ghMilestones"></div>';
    }
    return h;
  }

  function wireGame(row, unlocks, entryIds, gallery) {
    var bgrid = document.getElementById("ghBlog");
    if (bgrid) {
      // One line per post (its title links to it), then that post's screenshots
      var bl = row._blog, html = "", grids = [];
      bl.forEach(function (b, i) {
        if (!i || bl[i - 1].post !== b.post) {
          if (i) html += "</div>";
          var mine = bl.filter(function (x) { return x.post === b.post; });
          html += '<p class="gh-blog-post"><a href="' + esc(b.post) + '">' + esc(b.title) + "</a> | " + fmtDay(b.date) + '</p><div class="gh-shots' +
            (mine.every(function (x) { return x.tall; }) ? " gh-portrait" : "") + '" data-n="' + mine.length + '">';
        }
        html += '<button type="button" class="gh-shot' + (b.tall ? " gh-tall" : "") + '" data-i="' + i + '" aria-label="' + esc("From " + b.title) + '"><img src="' + SHOTS + "/t/" + b.img + '" alt="" loading="lazy"><span>' + fmtDay(b.date) + "</span></button>";
      });
      bgrid.innerHTML = html + "</div>";
      bgrid.querySelectorAll(".gh-shots").forEach(function (g) { grids.push(g); balance(g); });
      window.addEventListener("resize", function () { grids.forEach(balance); });
      bgrid.addEventListener("click", function (e) {
        var b = e.target.closest(".gh-shot");
        if (!b) return;
        openLightbox(bl, +b.dataset.i, function (x, i) { return "From " + x.title + " | " + fmtDay(x.date) + " (" + (i + 1) + " of " + bl.length + ")"; });
      });
    }
    var mgrid = document.getElementById("ghMilestones");
    if (mgrid) {
      var ms = row._milestones;
      mgrid.dataset.n = ms.length;
      mgrid.innerHTML = ms.map(function (m, i) {
        var label = m.stat + ": " + m.value;
        return '<figure class="gh-shot-fig"><button type="button" class="gh-shot" data-i="' + i + '" aria-label="' + esc(label) + '"><img src="' + SHOTS + "/t/" + m.img + '" alt="" loading="lazy"><span>' + fmtDay(m.time) + "</span></button><figcaption>" + esc(label) + "</figcaption></figure>";
      }).join("");
      balance(mgrid);
      window.addEventListener("resize", function () { balance(mgrid); });
      mgrid.addEventListener("click", function (e) {
        var b = e.target.closest(".gh-shot");
        if (!b) return;
        openLightbox(ms, +b.dataset.i, function (x, i) { return x.stat + ": " + x.value + " | " + when(x.time) + " (" + (i + 1) + " of " + ms.length + ")"; });
      });
    }
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
    var fams = FAMILIES.concat(["Photos"]).filter(function (f) { return row._shotTotals[f]; });

    // One family's screenshots, or all of them; the caption says how many of how many
    function drawShots(fam) {
      shots = row._shots.filter(function (s) { return fam === "All" || s.family === fam; });
      var total = 0;
      fams.forEach(function (f) { if (fam === "All" || f === fam) total += row._shotTotals[f]; });
      document.getElementById("ghShotCap").textContent = shots.length === total ? (total > 1 ? "All " : "") + plural(total, "screenshot", "screenshots")
        : shots.length + " of " + total + " screenshots, chosen at random from across the time I played";
      // Landscape screenshots first, then portrait ones (phones) in a grid of tall tiles
      var wide = shots.filter(function (s) { return !s.tall; }), tall = shots.filter(function (s) { return s.tall; });
      shots = wide.concat(tall);
      var tile = function (s, i) {
        var t = '<button type="button" class="gh-shot' + (s.tall ? " gh-tall" : "") + '" data-i="' + i + '" aria-label="Screenshot from ' + fmtDay(s.time) + '"><img src="' + SHOTS + "/t/" + s.img + '" alt="" loading="lazy"><span>' + fmtDay(s.time) + "</span></button>";
        return s.text ? '<figure class="gh-shot-fig">' + t + "<figcaption>" + esc(s.text) + "</figcaption></figure>" : t;
      };
      grid.dataset.n = wide.length;
      grid.hidden = !wide.length;
      grid.innerHTML = wide.map(tile).join("");
      var pgrid = document.getElementById("ghShotsTall");
      if (!pgrid) { pgrid = document.createElement("div"); pgrid.id = "ghShotsTall"; pgrid.className = "gh-shots gh-portrait"; grid.after(pgrid); }
      pgrid.dataset.n = tall.length;
      pgrid.hidden = !tall.length;
      pgrid.innerHTML = tall.map(function (s, j) { return tile(s, wide.length + j); }).join("");
      balance(grid); balance(pgrid);
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
    window.addEventListener("resize", function () { balance(grid); var pg = document.getElementById("ghShotsTall"); if (pg) balance(pg); });
    grid.parentNode.addEventListener("click", function (e) {
      if (!e.target.closest("#ghShots, #ghShotsTall")) return;
      var b = e.target.closest(".gh-shot");
      if (!b) return;
      openLightbox(shots, +b.dataset.i, function (x, i) {
        return (x.text ? x.text + " | " : "") + when(x.time) + " (" + (i + 1) + " of " + shots.length + ")";
      });
    });
  }

  // Gallery keys: psn:, ios:, or Nintendo's switch: and miiverse:
  function shotFamily(eid) { return eid.indexOf("psn") === 0 ? "PlayStation" : eid.indexOf("ios:") === 0 ? "Apple" : eid.indexOf("camera:") === 0 ? "Photos" : "Nintendo"; }

  function gameShots(entryIds, gallery, posts) {
    var text = {};
    posts.forEach(function (p) { text[p.id] = (p.body || "").replace(/\s*\n\s*/g, " ").trim(); });
    var shots = [];
    entryIds.forEach(function (eid) {
      if (!gallery[eid]) return;
      var family = shotFamily(eid);
      shots = shots.concat(gallery[eid].shots.map(function (s) {
        return { time: s.time, img: s.img, text: s.post ? text[s.post] || "" : "", family: family, tall: !!s.tall };
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
    var portrait = grid.classList.contains("gh-portrait");
    var max = Math.max(portrait ? 3 : 2, Math.min(portrait ? 9 : 6, Math.floor(width / (portrait ? 100 : 150))));
    var cols = Math.min(n, max);
    for (var c = max; n > max && c >= Math.max(2, max - 2); c--) {
      if (n % c !== 1) { cols = c; break; }
    }
    grid.style.setProperty("--cols", Math.max(1, cols));
    grid.style.setProperty("--tile", Math.floor((width - GAP * (max - 1)) / max) + "px");
  }

  // ── series (config/series.json, curated by Ronjan) ──────────────────────
  // A series' totals from its games: counts, first and last played, days, hours (estimated if
  // any game's are), unlocks, and whether any game includes family play
  function seriesSummary(s, gamesById) {
    var rows = s.games.map(function (id) { return gamesById[id]; }).filter(Boolean);
    var o = { rows: rows, n: rows.length, first: null, last: null, days: 0, hours: null, est: false, earned: 0, total: 0, family: false };
    rows.forEach(function (r) {
      if (r.first && (!o.first || r.first < o.first)) o.first = r.first;
      if (r.last && (!o.last || r.last > o.last)) o.last = r.last;
      o.days += daysPlayed(r);
      if (r.hours != null) o.hours = (o.hours || 0) + r.hours;
      o.est = o.est || !!r.hours_estimated;
      o.family = o.family || !!r.family_play;
      countedEntries(r).forEach(function (e) { o.earned += e.earned || 0; o.total += e.total || 0; });
    });
    return o;
  }
  // Newest release first (North American release date; first played when a game has none),
  // ties by name: the order a series reads in everywhere
  function byRelease(p, q) {
    var a = p.released || p.first || "", b = q.released || q.first || "";
    return a !== b ? (a < b ? 1 : -1) : p.name < q.name ? -1 : 1;
  }
  function seriesYears(o) {
    if (!o.first) return "-";
    var a = o.first.slice(0, 4), b = o.last.slice(0, 4);
    return a === b ? a : a + "\u2013" + b;
  }
  function seriesLabel(name) { return /^The /.test(name) ? name : "the " + name; }
  function seriesFamily(o) { return o.family ? '<span class="gh-family" title="' + FAMILY_NOTE + '">*</span>' : ""; }

  function seriesPage() {
    var id = new URLSearchParams(location.search).get("id");
    var back = document.querySelector(".gh-back");
    var from = document.referrer ? new URL(document.referrer) : null;
    if (back && from && from.origin === location.origin) {
      back.href = from.pathname + from.search;
      back.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
    } else if (back) {
      back.href = "/video-games/gameplay-stats/?tab=series";
    }
    var out = document.getElementById("ghSeries");
    Promise.all([getJSON(BASE + "/data/games.json"), getJSON(BASE + "/data/series.json")]).then(function (res) {
      var gamesById = {};
      res[0].forEach(function (r) {  // as on the Games tab: the unlock counts its Unlocks column shows
        r.families.sort(); gamesById[r.id] = r; r.best = bestList(r);
        var earned = 0;
        r.entries.forEach(function (e) { earned += e.earned || 0; });
        r.unlocks = unlockCount(countedEntries(r)) ? [earned, unlockCount(countedEntries(r))] : null;
      });
      var s = res[1].filter(function (x) { return x.id === id; })[0];
      if (!s) { out.innerHTML = ""; showError(); return; }
      document.title = s.name + " | FAKE RONJAN!!";
      var o = seriesSummary(s, gamesById);
      var newest = o.rows.slice().sort(function (a, b) { return (b.last || "") < (a.last || "") ? -1 : 1; });
      var fams = {};
      o.rows.forEach(function (r) { r.families.forEach(function (f) { fams[f] = 1; }); });
      var facts = [plural(o.n, "game", "games")];
      if (o.first) {
        facts.push("First played " + fmtDay(o.first));
        if (o.last !== o.first) facts.push("Last played " + fmtDay(o.last));
        facts.push(plural(o.days, "day", "days") + (o.family ? "*" : ""));
      }
      if (o.hours != null) facts.push((o.est ? "about " : "") + fmtHours(o.hours) + " hours" + (o.family ? "*" : ""));
      if (o.total) facts.push(o.earned + " of " + o.total + " \uD83C\uDFC6");
      // The series' awards, newest first: "🥇 2017: Super Mario Odyssey"
      var awards = [];
      o.rows.forEach(function (r) { gotyFor(r).forEach(function (g) { awards.push({ g: g, r: r }); }); });
      awards.sort(function (a, b) { return a.g.year < b.g.year ? 1 : a.g.year > b.g.year ? -1 : 0; });
      var badges = awards.map(function (a) {
        var label = PILL_MEDALS[a.g.place] + " " + esc(a.g.year) + ": " + esc(a.r.name), tip = esc(a.g.year) + ": " + esc(a.g.place);
        var cls = "gh-badge" + (MEDAL_CLASS[a.g.place] || "");
        return g_link(a.g, cls, label, tip);
      }).join("");
      function g_link(g, cls, label, tip) { return g.url ? '<a class="' + cls + '" href="' + esc(g.url) + '" title="' + tip + '">' + label + "</a>" : '<span class="' + cls + '" title="' + tip + '">' + label + "</span>"; }
      var art = newest[0] && newest[0].img ? '<img class="gh-art" src="' + BASE + "/" + newest[0].img + '" alt="">' : '<span class="gh-art" aria-hidden="true"></span>';
      var h = '<div class="gh-head">' + art + '<div class="gh-head-text"><h1>' + esc(s.name) + ' <span class="gh-series-tag">Series</span></h1>' +
        '<p class="gh-facts">' + dots(Object.keys(fams).sort()) + " " + facts.map(function (f) {
          return '<span class="gh-nowrap">' + esc(f).replace("\uD83C\uDFC6", '<span title="Trophies and achievements" aria-label="trophies and achievements">\uD83C\uDFC6</span>') + "</span>";
        }).join('<span class="sport-updated-sep">|</span>') + "</p>" +
        (badges ? '<div class="gh-badges">' + badges + "</div>" : "") +
        (o.family ? '<p class="gh-family-note">* ' + FAMILY_NOTE + "</p>" : "") + "</div></div>";
      // When I played: the game page's year strips, for every game in the series at once, with
      // the year's hours, then the box art of that year's games, at the end
      var ys = {};
      o.rows.forEach(function (r) {
        Object.keys(allDays(r)).forEach(function (d) { ys[d.slice(0, 4)] = 1; });
        spanYears(r).forEach(function (y) { ys[y] = 1; });
      });
      var years = Object.keys(ys).sort().reverse();
      if (years.length) {
        h += '<h2 class="gh-h2">When I played</h2><div class="gh-series-strips">' + yearStrips(o.rows, years, {
          compact: true,
          summary: function (y, gs) {
            var t = 0;
            gs.forEach(function (g) { g.h = yearHours(g.row, y) || 0; t += g.h; });
            // The year's games as small box art at the end, by first played (newest first), each
            // linking to its page
            var art = gs.slice().sort(function (p, q) { return byRelease(p.row, q.row); }).map(function (g) {
              return '<a class="gh-sy-art" href="' + GAME_URL + encodeURIComponent(g.row.id) + '" title="' + esc(g.row.name) + '">' + thumb(g.row.img, "gh-thumb-xs") + "</a>";
            }).join("");
            return (t >= 0.05 ? "~" + fmtHours(t) + " hrs" : "") + '<span class="gh-sy-games">' + art + "</span>";
          },
        }) + "</div>";
      }
      h += '<h2 class="gh-h2">Games (' + o.n + ')</h2><div class="sport-table-wrap" id="ghSeriesGames"></div>';
      out.innerHTML = h;
      table({
        el: document.getElementById("ghSeriesGames"), rows: o.rows, sortKey: "h", desc: true,  // most played first; the box art keeps release order
        filter: function () { return true; },
        cols: [
          { k: "n", h: "Game", cls: "gh-wrap gh-name", v: function (r) { return r.name.toLowerCase(); }, r: function (r) { return '<div class="gh-with-thumb">' + thumb(r.img) + "<span><b>" + gameLink(r.id, r.name) + familyMark(r) + "</b>" + pills(r) + "</span></div>"; } },
          { k: "f", h: "Platforms", cls: "gh-wrap gh-plat gh-hide-m", v: function (r) { return r.families.join(); }, r: function (r) { return platformLines(r); } },
          { k: "rel", h: "Released", cls: "gh-hide-m", desc: true, v: function (r) { return r.released || r.first; }, r: function (r) { return fmtDay(r.released); } },
          { k: "first", h: "First played", cls: "gh-hide-t", desc: true, v: function (r) { return r.first; }, r: function (r) { return fmtDay(r.first); } },
          { k: "last", h: "Last played", desc: true, v: function (r) { return r.last; }, r: function (r) { return fmtDay(r.last); } },
          { k: "d", h: "Days played&dagger;", desc: true, v: function (r) { return daysPlayed(r) || null; }, r: function (r) { return daysPlayed(r) ? daysPlayed(r) + familyMark(r) : "-"; } },
          { k: "h", h: "Hours played", desc: true, v: function (r) { return r.hours; }, r: function (r) { return hours(r.hours, r.hours_estimated) + familyMark(r); } },
          { k: "u", h: "Unlocks", cls: "gh-hide-m", desc: true, v: function (r) { return r.best ? r.best.pct : null; }, r: unlockCell },
        ],
      });
    }).catch(function () { out.innerHTML = ""; showError(); });
  }


  // ── systems ─────────────────────────────────────────────────────────────

  // Newest first, by first played; a system with no known first date goes by its launch
  function sortSystems(list) {
    return list.slice().sort(function (a, b) {
      var x = a.first || a.launched || "", y = b.first || b.launched || "";
      return x < y ? 1 : x > y ? -1 : 0;
    });
  }
  function sysYears(s) {
    var a = s.first ? s.first.slice(0, 4) : "Unknown";
    var b = s.have ? "now" : s.last ? s.last.date.slice(0, 4) : "Unknown";   // a unit on hand: the range runs to now
    return a === b ? a : a + " - " + b;
  }
  // Last played = the latest play of the system's games anywhere (Ronjan 2026-11-25); a system with no
  // recorded play falls back to when it went ("Sold 5/31/2026")
  function sysLast(s) {
    if (!s.last) return "-";
    return s.last.kind === "played" ? fmtDay(s.last.date) : s.last.kind + " " + fmtDay(s.last.date);
  }
  // The date never breaks; "Sold" can wrap above it in a narrow card
  function sysLastHtml(s) {
    if (!s.last || s.last.kind === "played") return '<span class="gh-nowrap">' + esc(sysLast(s)) + "</span>";
    return esc(s.last.kind) + ' <span class="gh-nowrap">' + fmtDay(s.last.date) + "</span>";
  }
  function sysHours(o) {
    return o.hours ? (o.est ? "~" : "") + o.hours.toLocaleString("en-US") + (o.family_play ? '<span class="gh-family" title="' + FAMILY_NOTE + '">*</span>' : "") : "-";
  }
  function sysStats(o) {
    var rows = [["Games", String(o.games)], ["Hours", sysHours(o)]];
    if (o.rows[0] && o.rows[0].hours) rows.push(["Most played", esc(o.top)]);
    return sysDl(rows);
  }
  function sysDl(rows) {
    return "<dl>" + rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") + "</dl>";
  }
  function systemCard(s) {
    var h = '<a class="gh-sys" href="' + SYSTEM_URL + encodeURIComponent(s.id) + '">' +
      '<span class="gh-sys-ph"><img src="' + BASE + "/" + s.img + '" alt="" loading="lazy"></span><span class="gh-sys-body">' +
      '<span class="gh-sys-name"><i class="gh-dot gh-' + s.family.toLowerCase() + '"></i>' + esc(s.name) + "</span>" +
      '<span class="gh-sys-years">' + sysYears(s) + "</span>" +
      sysDl([["First played", s.first ? fmtDay(s.first) : "Unknown"], ["Last played", sysLastHtml(s)]]) +
      '<span class="gh-sys-h">Played on this system</span>' +
      (s.on ? sysStats(s.on) : '<span class="gh-sys-none">No play records from this hardware</span>');
    if (s.elsewhere) h += '<span class="gh-sys-h">Its games on other systems</span>' + sysStats(s.elsewhere);
    return h + "</span></a>";
  }

  function systemPage() {
    var id = new URLSearchParams(location.search).get("id");
    var back = document.querySelector(".gh-back");
    var from = document.referrer ? new URL(document.referrer) : null;
    if (back && from && from.origin === location.origin) {
      back.href = from.pathname + from.search;
      back.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
    } else if (back) {
      back.href = "/video-games/gameplay-stats/?tab=systems";
    }
    var out = document.getElementById("ghSystem");
    getJSON(BASE + "/data/systems.json").then(function (list) {
      var s = list.filter(function (x) { return x.id === id; })[0];
      if (!s) { out.innerHTML = ""; showError(); return; }
      document.title = s.name + " | FAKE RONJAN!!";
      var hrs = (s.on ? s.on.hours : 0) || 0;
      var facts = ["First played " + (s.first ? fmtDay(s.first) : "unknown"), (s.last && s.last.kind === "played" ? "Last played " : "") + sysLast(s)];
      if (hrs) facts.push((s.on.est ? "about " : "") + hrs.toLocaleString("en-US") + " hours on this system");
      var h = '<div class="gh-head"><img class="gh-art gh-sys-art" src="' + BASE + "/" + s.img + '" alt=""><div class="gh-head-text"><h1>' + esc(s.name) + "</h1>" +
        '<p class="gh-sys-versions">' + s.versions.map(esc).join(", ") + "</p>" +
        '<p class="gh-facts">' + dots([s.family]) + " " + facts.map(function (f) { return '<span class="gh-nowrap">' + esc(f) + "</span>"; }).join('<span class="sport-updated-sep">|</span>') + "</p></div></div>";
      if (s.photos.length) {
        h += '<h2 class="gh-h2">My photos</h2><div class="gh-sys-photos">' + s.photos.map(function (p) {
          return '<figure><img src="' + BASE + "/" + p.img + '" alt="' + esc(p.caption) + '" loading="lazy"><figcaption>' + esc(p.caption) + "<span>" + fmtDay(p.date) + "</span></figcaption></figure>";
        }).join("") + "</div>";
      }
      if (s.on) h += '<h2 class="gh-h2">Played on this system (' + s.on.games + ')</h2><div class="sport-table-wrap" id="ghSysOn"></div>';
      if (s.elsewhere) h += '<h2 class="gh-h2">Its games on other systems (' + s.elsewhere.games + ')</h2><div class="sport-table-wrap" id="ghSysElse"></div>';
      if ((s.on && s.on.family_play) || (s.elsewhere && s.elsewhere.family_play)) h += '<p class="gh-family-note">* ' + FAMILY_NOTE + "</p>";
      out.innerHTML = h;
      var nameCol = { k: "n", h: "Game", cls: "gh-wrap gh-name", v: function (r) { return r.name.toLowerCase(); }, r: function (r) { return '<div class="gh-with-thumb">' + thumb(r.img) + "<span><b>" + gameLink(r.id, r.name) + familyMark(r) + "</b></span></div>"; } };
      var hoursCol = { k: "h", h: "Hours played", desc: true, v: function (r) { return r.hours; }, r: function (r) { return hours(r.hours, r.est) + familyMark(r); } };
      var firstCol = { k: "first", h: "First played", cls: "gh-hide-m", desc: true, v: function (r) { return r.first; }, r: function (r) { return fmtDay(r.first); } };
      var lastCol = { k: "last", h: "Last played", desc: true, v: function (r) { return r.last; }, r: function (r) { return fmtDay(r.last); } };
      if (s.on) table({ el: document.getElementById("ghSysOn"), rows: s.on.rows, sortKey: "h", desc: true, filter: function () { return true; }, cols: [nameCol, hoursCol, firstCol, lastCol] });
      if (s.elsewhere) table({
        el: document.getElementById("ghSysElse"), rows: s.elsewhere.rows, sortKey: "h", desc: true, filter: function () { return true; },
        cols: [nameCol, { k: "on", h: "Played on", cls: "gh-wrap gh-hide-m", v: function (r) { return r.on; }, r: function (r) { return esc(r.on); } }, hoursCol, lastCol],
      });
    }).catch(function () { out.innerHTML = ""; showError(); });
  }

  if (document.getElementById("ghPage")) historyPage();
  else if (document.getElementById("ghSeriesPage")) seriesPage();
  else if (document.getElementById("ghSystemPage")) systemPage();
  else gamePage();
})();
