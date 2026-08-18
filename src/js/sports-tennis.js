(function () {
  var page = document.getElementById("sportPage");
  var SOURCE = page.dataset.source;
  var BASE = SOURCE + "/data";

  var state = {
    DATA: { m: [], w: [] },
    PLAYERS: { m: {}, w: {} },
    TIMELINES: {},
    ENGINE_COUNTRY: { m: {}, w: {} },
    ELIGIBLE_SET: { m: null, w: null },
    CANONICAL_NAME: { m: {}, w: {} },
    CHAMPION_RATINGS: {},
    ratingsCache: {},
    mwState: { slamchase: "m", tournament: "m", players: "m", goat: "m", "power-rankings": "m" },
    surfaceState: { m: "all", w: "all" },
    prSnapState: { m: null, w: null },
    prLastKey: { m: null, w: null },
    goatView: "peak",
    peakSubView: "best",
    userPickedTab: false,
  };

  var SLAM_ORDER = ["AO", "FO", "Wim", "US"];
  var SLAM_FLAG = { AO: "🇦🇺", FO: "🇫🇷", Wim: "🇬🇧", US: "🇺🇸" };
  var SLAM_SURFACE = { AO: "hard", FO: "clay", Wim: "grass", US: "hard" };
  var SURFACE_LABELS = { hard: "Hard", clay: "Clay", grass: "Grass" };
  var SNAP_CODE_ORDER = { Today: 1, EOY: 2, US: 3, Wim: 4, FO: 5, AO: 6 };
  var SNAP_CODE_SHORT = { AO: "After Australian Open", FO: "After Roland Garros", Wim: "After Wimbledon", US: "After US Open", EOY: "End of year", Today: "Today" };
  var SLAM_CODES = { AO: true, FO: true, Wim: true, US: true };

  // Cohorts: ordered groups; first pill is the default. Ported 1:1 from CHANG-CAPRIATI.
  var COHORTS = {
    m: [
      { key: "all", label: "Full Open Era", sub: "Every player with at least 8 Open Era slams (1968 to today)", filter: "top", threshold: 8 },
      { key: "borg", label: "Borg / McEnroe / Lendl", sub: "The 1970s-80s peer set", players: ["Björn Borg", "Jimmy Connors", "John McEnroe", "Ivan Lendl", "Mats Wilander"] },
      { key: "90s", label: "Sampras / Agassi", sub: "The defining 90s rivalry - Sampras rising from 1990, Edberg, Becker, Courier as peers", players: ["Pete Sampras", "Andre Agassi", "Stefan Edberg", "Boris Becker", "Jim Courier"] },
      { key: "sampras", label: "Federer / Nadal / Djokovic", sub: "From Wimbledon 2003 (Federer's 1st): Sampras as the bar at 14 (dashed), then the Big 3 running it down", players: ["Roger Federer", "Rafael Nadal", "Novak Djokovic"], startFromPlayer: "Roger Federer" },
      { key: "nextgen", label: "Next gen", sub: "Alcaraz and Sinner chasing the all-time OE leader (Djokovic at 24)", players: ["Carlos Alcaraz", "Jannik Sinner"] },
    ],
    w: [
      { key: "all", label: "Full Open Era", sub: "Every player with at least 7 Open Era slams (1968 to today)", filter: "top", threshold: 7 },
      { key: "court", label: "The Court / King era", sub: "The first Open Era leaders. Court reset the bar at 11 OE slams.", players: ["Margaret Smith Court", "Billie Jean Moffitt King", "Evonne Goolagong Cawley", "Virginia Wade", "Chris Evert"] },
      { key: "evert", label: "Evert / Navratilova", sub: "The defining rivalry of the late 70s and 80s", players: ["Chris Evert", "Martina Navratilova", "Hana Mandlíková", "Tracy Austin"] },
      { key: "graf", label: "The Graf era", sub: "Graf passing Evert in 1996; Seles, Sabatini, Sánchez Vicario, Hingis as peers", players: ["Steffi Graf", "Monica Seles", "Gabriela Sabatini", "Arantxa Sánchez Vicario", "Martina Hingis"] },
      { key: "serena", label: "The Williams era", sub: "Serena passing Graf in 2017; Henin, Clijsters, Sharapova, Venus as peers", players: ["Serena Williams", "Venus Williams", "Justine Henin", "Kim Clijsters", "Maria Sharapova"] },
      { key: "current", label: "Current generation", sub: "The post-Serena cohort with no clear leader yet", players: ["Iga Świątek", "Aryna Sabalenka", "Coco Gauff", "Elena Rybakina", "Madison Keys", "Naomi Osaka", "Barbora Krejčíková", "Markéta Vondroušová", "Jeļena Ostapenko", "Sofia Kenin", "Bianca Andreescu"] },
    ],
  };

  var PALETTE = ["#1a6b8a", "#ff6eb4", "#ef6c00", "#2e7d32", "#6a1b9a", "#c62828", "#00838f", "#5d4037", "#455a64", "#827717", "#0277bd", "#ad1457"];
  var CAREER_PALETTE = { base: "var(--fg)", hard: "#d97706", clay: "#b91c1c", grass: "#15803d" };
  var CAREER_LABELS = { base: "Base", hard: "Hard", clay: "Clay", grass: "Grass" };

  var WIKI_TO_SACKMANN = {
    "Ann Haydon Jones": "Ann Jones",
    "Billie Jean Moffitt King": "Billie Jean King",
    "Evonne Goolagong Cawley": "Evonne Goolagong",
    "Kerry Melville Reid": "Kerry Reid",
    "Li Na": "Na Li",
    "Margaret Smith Court": "Margaret Court",
  };

  // ── formatting helpers ─────────────────────────────────────────────────────

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function _stripDiacritics(s) {
    return (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  }

  function sackmannName(wikiName) {
    return WIKI_TO_SACKMANN[wikiName] || _stripDiacritics(wikiName);
  }

  function playerSlug(name) {
    return sackmannName(name).replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  }

  // Tennis data is only tournament-granular pre-2025 (every match carries the
  // event's start date), so month/year only, never a day. `shift` approximates
  // a slam's finish (it runs ~2 weeks past the stamped start).
  function fmtMY(iso, shift) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00Z");
    if (shift) d.setUTCDate(d.getUTCDate() + shift);
    return (d.getUTCMonth() + 1) + "/" + d.getUTCFullYear();
  }
  // Full M/D/YYYY for the 2025+ live feed, which carries every match's real day.
  function fmtFullDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00Z");
    return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
  }
  function fmtSpan(iso) {
    var a = fmtMY(iso, 0), b = fmtMY(iso, 14);
    return a === b ? a : a + "-" + b;
  }

  function flagEmoji(iso) {
    if (!iso || iso === "??" || iso.length !== 2) return "";
    var A = 0x1F1E6;
    return String.fromCodePoint(A + iso.charCodeAt(0) - 65, A + iso.charCodeAt(1) - 65);
  }

  function playerFlag(tour, name) {
    var fromEngine = state.ENGINE_COUNTRY[tour] && state.ENGINE_COUNTRY[tour][name];
    if (fromEngine) return fromEngine;
    var iso = state.PLAYERS[tour] && state.PLAYERS[tour][name];
    return iso ? flagEmoji(iso) : "";
  }

  function resolvePlayerName(tour, name) {
    return state.CANONICAL_NAME[tour][name] || state.CANONICAL_NAME[tour][_stripDiacritics(name)] || name;
  }

  function isLinkablePlayer(tour, name) {
    return state.ELIGIBLE_SET[tour].indexOf(resolvePlayerName(tour, name)) !== -1;
  }

  // Wrap a player-name display in a clickable span that deep-links to Player
  // Summary with the right tour + player pre-selected.
  function playerLink(tour, name, displayHTML) {
    if (!isLinkablePlayer(tour, name)) return displayHTML;
    var canonical = resolvePlayerName(tour, name);
    return '<span class="linked" data-jump-tour="' + tour + '" data-jump-player="' + escapeHtml(canonical) + '">' + displayHTML + "</span>";
  }

  function jumpToPlayer(tour, name) {
    name = resolvePlayerName(tour, name);
    activateTab("players");
    applyMW("players", tour);
    var sel = document.getElementById(tour === "m" ? "playerSelectM" : "playerSelectW");
    if (sel) {
      sel.value = name;
      renderPlayer(tour, name);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-jump-player]");
    if (!el) return;
    e.preventDefault();
    jumpToPlayer(el.dataset.jumpTour, el.dataset.jumpPlayer);
  });

  function seasonTag(info) {
    if (!info) return "";
    var cat = info.category || "labor";
    return ' <span class="short-season-tag tag-' + cat + '" title="' + info.note + '">' + info.tag.toUpperCase() + "</span>";
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
    state.userPickedTab = true;
    activateTab(btn.dataset.tab);
    if (btn.dataset.tab === "slamchase") refreshSlamChase(state.mwState.slamchase);
    if (btn.dataset.tab === "power-rankings") refreshPowerRankings(state.mwState["power-rankings"]);
    if (btn.dataset.tab === "goat") refreshGoatRating(state.mwState.goat);
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
    if (tabId === "power-rankings") refreshPowerRankings(mw);
    if (tabId === "goat") refreshGoatRating(mw);
  }

  document.querySelectorAll(".pill-group[data-mw-target]").forEach(function (wrap) {
    var tabId = wrap.dataset.mwTarget;
    wrap.querySelectorAll(".pill[data-mw]").forEach(function (btn) {
      btn.addEventListener("click", function () { applyMW(tabId, btn.dataset.mw); });
    });
  });

  // ── data loading ─────────────────────────────────────────────────────────

  function fetchRatings(path) {
    if (state.ratingsCache[path] !== undefined) return Promise.resolve(state.ratingsCache[path]);
    return fetch(BASE + "/" + path)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { state.ratingsCache[path] = data; return data; })
      .catch(function () { state.ratingsCache[path] = null; return null; });
  }

  function loadChampionRatings() {
    return fetch(BASE + "/champion_ratings.json")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) { state.CHAMPION_RATINGS = data || {}; })
      .catch(function () { state.CHAMPION_RATINGS = {}; });
  }

  function loadEngineCountries() {
    var pairs = [["m", "atp"], ["w", "wta"]];
    return Promise.all(pairs.map(function (pair) {
      var tour = pair[0], slug = pair[1];
      return fetch(BASE + "/players_index_" + slug + ".json")
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (arr) {
          arr.forEach(function (p) {
            if (!p.country) return;
            state.ENGINE_COUNTRY[tour][p.name] = p.country;
            state.ENGINE_COUNTRY[tour][_stripDiacritics(p.name)] = p.country;
          });
        })
        .catch(function () {});
    }));
  }

  // Loads the slam-champions bundle (data/players/timelines) from
  // docs/data/slams.json - published there specifically for this port
  // (previously only existed baked into CHANG-CAPRIATI's own HTML).
  function loadSlamsBundle() {
    return fetch(BASE + "/slams.json")
      .then(function (r) { return r.json(); })
      .then(function (bundle) {
        state.DATA = bundle.data || { m: [], w: [] };
        state.PLAYERS = bundle.players || { m: {}, w: {} };
        state.TIMELINES = bundle.timelines || {};
        ["m", "w"].forEach(function (tour) {
          var counts = {};
          state.DATA[tour].forEach(function (r) { counts[r.w] = (counts[r.w] || 0) + 1; });
          var eligible = Object.keys(counts).filter(function (n) { return counts[n] >= 1; });
          state.ELIGIBLE_SET[tour] = eligible;
          eligible.forEach(function (canonical) {
            state.CANONICAL_NAME[tour][canonical] = canonical;
            state.CANONICAL_NAME[tour][_stripDiacritics(canonical)] = canonical;
            var sn = WIKI_TO_SACKMANN[canonical];
            if (sn) state.CANONICAL_NAME[tour][sn] = canonical;
          });
        });
      });
  }

  function loadMeta() {
    return fetch(BASE + "/meta.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (meta) {
        if (!meta) return;
        var lu = document.getElementById("tnDateRange");
        if (lu && meta.first_match_date && meta.last_match_date) {
          lu.textContent = "Ratings include matches from " + fmtMY(meta.first_match_date) + " to " + fmtFullDate(meta.last_match_date);
        }
        var lr = document.getElementById("tnRefreshed");
        if (lr && meta.generated_at) {
          var refreshed = new Date(meta.generated_at);
          lr.textContent = "Last refreshed: " + refreshed.toLocaleString(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
        }
      })
      .catch(function () {});
  }

  // ═══════════════════════════════ Power Rankings ═══════════════════════════════

  function surfaceDeltaHTML(deltas) {
    var SCALE = 1.0;
    var cells = ["hard", "clay", "grass"].map(function (s) {
      var v = +deltas[s] || 0;
      if (!isFinite(v) || Math.abs(v) < 1e-4) {
        return '<span class="sd-cell"><span class="sd-label">' + SURFACE_LABELS[s] + '</span><span class="sd-bar-track"><span class="sd-bar-center"></span></span></span>';
      }
      var widthPct = Math.min(50, (Math.abs(v) / SCALE) * 50);
      var cls = v > 0 ? "sd-pos" : "sd-neg";
      var leftPct = v > 0 ? 50 : 50 - widthPct;
      return '<span class="sd-cell" title="' + SURFACE_LABELS[s] + " delta: " + (v >= 0 ? "+" : "") + v.toFixed(2) + '">' +
        '<span class="sd-label">' + SURFACE_LABELS[s] + "</span>" +
        '<span class="sd-bar-track"><span class="sd-bar-center"></span><span class="sd-bar-fill ' + cls + '" style="left:' + leftPct + "%;width:" + widthPct + '%"></span></span></span>';
    }).join("");
    return '<span class="surface-deltas">' + cells + "</span>";
  }

  function getHistoryForTour(tour) {
    return state.ratingsCache["power_rankings_history_" + (tour === "m" ? "atp" : "wta") + ".json"];
  }

  function listYearsForTour(tour) {
    var hist = getHistoryForTour(tour);
    if (!hist) return [];
    var years = {};
    Object.keys(hist.snapshots).forEach(function (k) {
      var yr = hist.snapshots[k].year;
      if (yr) years[yr] = true;
    });
    return Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
  }

  function listSnapsForYear(tour, year) {
    var hist = getHistoryForTour(tour);
    if (!hist) return [];
    var out = [];
    Object.keys(hist.snapshots).forEach(function (key) {
      var snap = hist.snapshots[key];
      if (snap.year !== year) return;
      out.push({ key: key, code: snap.code, label: snap.label, date: snap.date, type: snap.type });
    });
    out.sort(function (a, b) { return (SNAP_CODE_ORDER[a.code] || 99) - (SNAP_CODE_ORDER[b.code] || 99); });
    return out;
  }

  function populatePickers(tour) {
    var hist = getHistoryForTour(tour);
    var yearSel = document.getElementById("prYearSelect");
    var snapSel = document.getElementById("prSnapSelect");
    if (!hist) {
      yearSel.innerHTML = "<option>-</option>";
      snapSel.innerHTML = "<option>-</option>";
      return;
    }
    if (!state.prSnapState[tour]) {
      if (hist.snapshots["Today"]) {
        state.prSnapState[tour] = { year: hist.snapshots["Today"].year, code: "Today" };
      } else {
        var years = listYearsForTour(tour);
        var latestYear = years[0];
        var snaps = listSnapsForYear(tour, latestYear);
        state.prSnapState[tour] = { year: latestYear, code: snaps[0].code };
      }
    }
    var year = state.prSnapState[tour].year, code = state.prSnapState[tour].code;

    var years = listYearsForTour(tour);
    yearSel.innerHTML = years.map(function (y) {
      return '<option value="' + y + '"' + (y === year ? " selected" : "") + ">" + y + "</option>";
    }).join("");

    var snaps = listSnapsForYear(tour, year);
    snapSel.innerHTML = snaps.map(function (s) {
      var label = SNAP_CODE_SHORT[s.code] || s.label;
      var datePart = SLAM_CODES[s.code] ? "(" + fmtSpan(s.date) + ")" : "· " + fmtMY(s.date);
      return '<option value="' + s.code + '"' + (s.code === code ? " selected" : "") + ">" + label + " " + datePart + "</option>";
    }).join("");
  }

  function snapshotKey(year, code) {
    return code === "Today" ? "Today" : year + "_" + code;
  }

  function refreshPowerRankings(tour) {
    var slug = tour === "m" ? "atp" : "wta";
    var wrap = document.getElementById(tour === "m" ? "prTableMWrap" : "prTableWWrap");
    return fetchRatings("power_rankings_history_" + slug + ".json").then(function () {
      populatePickers(tour);
      var st = state.prSnapState[tour] || {};
      var year = st.year, code = st.code;
      if (!year || !code) {
        wrap.innerHTML = '<p class="sport-loading">Rankings unavailable</p>';
        return;
      }
      var hist = getHistoryForTour(tour);
      var key = snapshotKey(year, code);
      var snap = hist && hist.snapshots[key];
      if (!snap || !snap.players) {
        wrap.innerHTML = '<p class="sport-loading">No data for this timeframe</p>';
        return;
      }

      // Surface-aware slam snapshots: when the snapshot CHANGES, default the
      // ranking surface to the slam just played so the "After <Slam>" board
      // reflects that surface. A surface-pill click keeps the same snapshot
      // key, so an explicit surface pick still sticks for this snapshot.
      if (state.prLastKey[tour] !== key) {
        state.prLastKey[tour] = key;
        state.surfaceState[tour] = SLAM_SURFACE[code] || "all";
        document.querySelectorAll('.pill-group[data-mw-target="power-rankings"] .pill[data-surface]').forEach(function (b) {
          b.classList.toggle("active", b.dataset.surface === state.surfaceState[tour]);
        });
      }

      var shortLabel = SNAP_CODE_SHORT[code] || snap.label;
      var disrupted = snap.disrupted;
      var tagInline = disrupted ? seasonTag(disrupted) : "";
      var labelText = code === "Today" ? "Top " + snap.players.length + " · Today · as of " + fmtFullDate(snap.date)
        : code === "EOY" ? "Top " + snap.players.length + " · " + shortLabel + " " + year + tagInline
        : "Top " + snap.players.length + " · " + shortLabel + " " + year + tagInline + " · " + fmtSpan(snap.date);
      var noteFootnote = code === "EOY"
        ? "End-of-year ratings use the full calendar year (Jan 1 - Dec 31) with tier weighting only, no recency decay"
        : "Surface filter shows base rating + that surface's delta (effective rating on that surface)";
      document.getElementById("prAsof").innerHTML = labelText + ". <span class='sub-line-inline'>" + noteFootnote + "</span>";

      var disruptedEl = document.getElementById("prDisrupted");
      if (disrupted) {
        disruptedEl.innerHTML = "<strong>Disrupted timeframe:</strong><ul><li>" + seasonTag(disrupted) + escapeHtml(disrupted.note) + "</li></ul>";
        disruptedEl.hidden = false;
      } else {
        disruptedEl.innerHTML = "";
        disruptedEl.hidden = true;
      }

      var surface = state.surfaceState[tour];
      var players = snap.players.map(function (p) {
        var sd = { hard: p.hard_delta, clay: p.clay_delta, grass: p.grass_delta };
        var rating = surface === "all" ? p.base : p.base + (sd[surface] || 0);
        return Object.assign({}, p, { surfaceDeltas: sd, rating_shown: rating });
      });
      if (surface !== "all") {
        players.sort(function (a, b) { return b.rating_shown - a.rating_shown; });
        players.forEach(function (p, i) { p.rank_shown = i + 1; });
      } else {
        players.forEach(function (p) { p.rank_shown = p.rank; });
      }
      var ratingHeader = surface === "all" ? "Rating" : surface.charAt(0).toUpperCase() + surface.slice(1) + " Rating";
      var winShift = SLAM_CODES[code] ? 14 : 0;
      var recordHeader = code === "EOY" ? "Record (" + year + ")" : "Record (" + fmtMY(snap.window_start, winShift) + " - " + fmtMY(snap.window_end, winShift) + ")";

      var rows = players.slice(0, 50).map(function (p) {
        var slamFlags = (p.slams_won || []).map(function (c) { return SLAM_FLAG[c] || ""; }).filter(Boolean).join(" ");
        var flagPart = p.country ? p.country + " " : "";
        var nameHTML = playerLink(tour, p.player, flagPart + escapeHtml(p.player));
        return (
          "<tr>" +
          '<td class="col-rank">' + p.rank_shown + "</td>" +
          '<td class="team-cell">' + nameHTML + "</td>" +
          '<td class="rating-cell">' + p.rating_shown.toFixed(2) + "</td>" +
          '<td class="col-od">' + surfaceDeltaHTML(p.surfaceDeltas) + "</td>" +
          '<td class="col-od">' + (p.match_wins || 0) + "-" + (p.match_losses || 0) + "</td>" +
          '<td class="col-od">' + (p.titles || 0) + "</td>" +
          '<td class="col-od">' + (slamFlags || "-") + "</td>" +
          "</tr>"
        );
      }).join("");
      wrap.innerHTML =
        '<table class="sport-table"><thead><tr>' +
        '<th class="col-rank">#</th><th>Player</th><th>' + ratingHeader + "</th>" +
        "<th>Surface specialization</th><th>" + recordHeader + "</th><th>Titles</th><th>Slams</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table>";
    });
  }

  document.getElementById("prYearSelect").addEventListener("change", function () {
    var tour = state.mwState["power-rankings"];
    var newYear = parseInt(this.value, 10);
    var snaps = listSnapsForYear(tour, newYear);
    var fallback = snaps[0];
    state.prSnapState[tour] = { year: newYear, code: fallback ? fallback.code : "EOY" };
    refreshPowerRankings(tour);
  });
  document.getElementById("prSnapSelect").addEventListener("change", function () {
    var tour = state.mwState["power-rankings"];
    var code = this.value;
    var year = parseInt(document.getElementById("prYearSelect").value, 10);
    if (code === "Today") {
      var hist = getHistoryForTour(tour);
      year = hist && hist.snapshots["Today"] ? hist.snapshots["Today"].year : year;
    }
    state.prSnapState[tour] = { year: year, code: code };
    refreshPowerRankings(tour);
  });
  document.querySelectorAll('.pill-group[data-mw-target="power-rankings"] .pill[data-surface]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll('.pill-group[data-mw-target="power-rankings"] .pill[data-surface]').forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var tour = state.mwState["power-rankings"];
      state.surfaceState[tour] = btn.dataset.surface;
      refreshPowerRankings(tour);
    });
  });

  // ═══════════════════════════════ Player Summary ═══════════════════════════════

  function eligiblePlayers(tour) {
    var counts = {};
    state.DATA[tour].forEach(function (r) { counts[r.w] = (counts[r.w] || 0) + 1; });
    return Object.keys(counts).map(function (n) { return [n, counts[n]]; })
      .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
  }

  function populatePlayerDropdown(tour) {
    var sel = document.getElementById(tour === "m" ? "playerSelectM" : "playerSelectW");
    var list = eligiblePlayers(tour);
    sel.innerHTML = '<option value="">- Select a player -</option>' + list.map(function (pair) {
      var n = pair[0], c = pair[1];
      var flag = playerFlag(tour, n);
      return '<option value="' + escapeHtml(n) + '">' + (flag ? flag + " " : "") + escapeHtml(n) + " (" + c + ")</option>";
    }).join("");
    sel.addEventListener("change", function (e) { renderPlayer(tour, e.target.value); });
  }

  function finishClass(code) {
    if (!code) return "finish-na";
    if (code === "W") return "finish-W";
    if (code === "F") return "finish-F";
    if (code === "SF") return "finish-SF";
    if (code === "QF") return "finish-QF";
    if (/^[1-4]R$/.test(code)) return "finish-round";
    return "finish-out";
  }

  function renderPlayer(tour, player) {
    var contentId = tour === "m" ? "playerContentM" : "playerContentW";
    var contentEl = document.getElementById(contentId);
    if (!player) {
      contentEl.innerHTML = '<p class="sport-loading">Select a player above</p>';
      return Promise.resolve();
    }
    player = resolvePlayerName(tour, player);
    var tl = state.TIMELINES[player];
    var totalSlams = state.DATA[tour].filter(function (r) { return r.w === player; }).length;
    var perSlam = { AO: 0, FO: 0, Wim: 0, US: 0 };
    state.DATA[tour].filter(function (r) { return r.w === player; }).forEach(function (r) { perSlam[r.s] += 1; });

    if (!tl) {
      contentEl.innerHTML =
        '<div class="player-card"><h2><span class="player-flag-big">' + playerFlag(tour, player) + "</span>" + escapeHtml(player) + "</h2>" +
        '<p class="player-meta">' + totalSlams + " Open Era slam titles &middot; timeline not available</p></div>" +
        '<p class="sport-loading">Career performance timeline unavailable for this player</p>';
      return Promise.resolve();
    }

    var won = 0, lost = 0;
    SLAM_ORDER.forEach(function (s) {
      Object.keys(tl[s] || {}).forEach(function (y) {
        var code = tl[s][y];
        if (code === "W") won++;
        else if (code === "F") lost++;
      });
    });

    var winLookup = {};
    var tCount = {}, pCount = {};
    state.DATA[tour].forEach(function (r) {
      tCount[r.w] = (tCount[r.w] || 0) + 1;
      pCount[r.w] = pCount[r.w] || { AO: 0, FO: 0, Wim: 0, US: 0 };
      pCount[r.w][r.s] += 1;
      if (r.w === player) winLookup[r.y + ":" + r.s] = { perT: pCount[r.w][r.s], total: tCount[r.w] };
    });

    var slug = playerSlug(player);
    var tourSlug = tour === "m" ? "atp" : "wta";
    return Promise.all([
      fetchRatings("players/" + tourSlug + "_" + slug + ".json"),
      fetchRatings("goat_peak_" + tourSlug + ".json"),
      fetchRatings("goat_era_" + tourSlug + ".json"),
      fetchRatings("power_rankings_history_" + tourSlug + ".json"),
    ]).then(function (results) {
      var phist = results[0], peakData = results[1], eraData = results[2], prHist = results[3];

      var slamDateByYC = {};
      if (prHist && prHist.snapshots) {
        Object.keys(prHist.snapshots).forEach(function (key) {
          if (key === "Today") return;
          slamDateByYC[key] = prHist.snapshots[key].date;
        });
      }
      var historyByDate = {};
      if (phist && phist.history) phist.history.forEach(function (h) { historyByDate[h.date] = h; });
      var yearStats = (phist && phist.year_stats) || {};

      var peakEntry = peakData && peakData.players ? peakData.players.filter(function (p) { return p.player === player; })[0] : null;
      var eraEntry = eraData && eraData.players ? eraData.players.filter(function (p) { return p.player === player; })[0] : null;
      var peakStr = peakEntry ? peakEntry.base.toFixed(2) : "-";
      var peakRankStr = peakEntry ? peakEntry.peak_year + " · #" + peakEntry.rank + " all-time" : "";
      var eraStr = eraEntry ? eraEntry.era.toFixed(1) : "-";
      var eraRankStr = eraEntry ? "#" + eraEntry.rank + " all-time" : "";

      var flag = playerFlag(tour, player);
      function tileSlam(s) {
        return '<div class="stat-tile"><div class="stat-label">' + SLAM_FLAG[s] + " " + s + '</div><div class="stat-value">' + perSlam[s] + "</div></div>";
      }

      var header =
        '<div class="player-card"><h2><span class="player-flag-big">' + flag + "</span>" + escapeHtml(player) + "</h2>" +
        '<p class="player-meta">' + (tour === "m" ? "Men's" : "Women's") + " singles &middot; Open Era</p>" +
        '<div class="stats-row">' +
        '<div class="stat-tile headline"><div class="stat-label">Career Slam Titles</div><div class="stat-value">' + totalSlams + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Finals Record</div><div class="stat-value">' + won + "-" + lost + '</div><div class="stat-sub">' + (won + lost) + " finals reached</div></div>" +
        '<div class="stat-tile"><div class="stat-label">Peak Rating</div><div class="stat-value">' + peakStr + '</div><div class="stat-sub">' + (peakRankStr || "&nbsp;") + "</div></div>" +
        '<div class="stat-tile"><div class="stat-label">ERA Score</div><div class="stat-value">' + eraStr + '</div><div class="stat-sub">' + (eraRankStr || "&nbsp;") + "</div></div>" +
        SLAM_ORDER.map(tileSlam).join("") +
        "</div></div>";

      var allYears = {};
      SLAM_ORDER.forEach(function (s) { Object.keys(tl[s] || {}).forEach(function (y) { allYears[+y] = true; }); });
      var allYearsSorted = Object.keys(allYears).map(Number).sort(function (a, b) { return a - b; });
      function isActiveYear(y) {
        return SLAM_ORDER.some(function (s) {
          var code = (tl[s] || {})[String(y)];
          return code && code !== "A" && code !== "NH";
        });
      }
      var firstActive = allYearsSorted.filter(isActiveYear)[0];
      var activeReversed = allYearsSorted.slice().reverse().filter(isActiveYear);
      var lastActive = activeReversed[0];
      var years = firstActive == null ? [] : allYearsSorted.filter(function (y) { return y >= firstActive && y <= lastActive; }).reverse();

      function ratingLine(year, slamCode) {
        var date = slamDateByYC[year + "_" + slamCode];
        if (!date) return "-";
        var h = historyByDate[date];
        if (!h || h.rank == null) return "-";
        var overall = h.base.toFixed(2) + ' <span class="muted">#' + h.rank + "</span>";
        var surf = SLAM_SURFACE[slamCode];
        if (!surf) return overall;
        var dk = surf + "_delta";
        var adj = h.base + (h[dk] || 0);
        var snap = prHist && prHist.snapshots && prHist.snapshots[year + "_" + slamCode];
        var rank = h.rank;
        if (snap && snap.players) {
          rank = 1 + snap.players.filter(function (p) { return (p.base + (p[dk] || 0)) > adj; }).length;
        }
        return overall + '<span class="surface-pill surface-' + surf + '">' + SURFACE_LABELS[surf] + " " + adj.toFixed(2) + ' <span class="sp-rank">#' + rank + "</span></span>";
      }

      function renderCell(y, s) {
        var code = (tl[s] || {})[String(y)] || "";
        var cls = finishClass(code);
        var rating = ratingLine(y, s);
        if (code === "W") {
          var info = winLookup[y + ":" + s];
          var counts = info ? "(" + info.perT + " " + SLAM_FLAG[s] + ", " + info.total + " total)" : "";
          return '<td class="' + cls + '"><div class="finish-line">W 🥇</div>' + (counts ? '<div class="winner-num">' + counts + "</div>" : "") + '<div class="player-rating-line">' + rating + "</div></td>";
        }
        if (code === "F") {
          return '<td class="' + cls + '"><div class="finish-line">F 🥈</div><div class="player-rating-line">' + rating + "</div></td>";
        }
        return '<td class="' + cls + '">' + (code ? '<div class="finish-line">' + escapeHtml(code) + "</div>" : '<div class="finish-line">-</div>') + '<div class="player-rating-line">' + rating + "</div></td>";
      }

      function yearStatsLine(y) {
        var ys = yearStats[String(y)];
        if (!ys) return { record: "-", titles: "-" };
        return { record: ys.wins + "-" + ys.losses, titles: ys.titles };
      }
      function eoyLine(y) {
        var date = slamDateByYC[y + "_EOY"];
        if (!date) return "-";
        var h = historyByDate[date];
        if (!h || h.rank == null) return "-";
        return h.base.toFixed(2) + ' <span class="muted">#' + h.rank + "</span>";
      }

      var rows = years.map(function (y) {
        var cells = SLAM_ORDER.map(function (s) { return renderCell(y, s); }).join("");
        var ys = yearStatsLine(y);
        return "<tr><td class=\"year-cell\">" + y + "</td>" + cells +
          '<td class="col-od">' + ys.record + "</td>" +
          '<td class="col-od">' + ys.titles + "</td>" +
          '<td class="col-od">' + eoyLine(y) + "</td></tr>";
      }).join("");

      var grid =
        '<div class="sport-table-wrap"><table class="sport-table timeline-table"><thead><tr>' +
        "<th>Year</th>" +
        "<th>" + SLAM_FLAG.AO + " Australian Open</th>" +
        "<th>" + SLAM_FLAG.FO + " French Open</th>" +
        "<th>" + SLAM_FLAG.Wim + " Wimbledon</th>" +
        "<th>" + SLAM_FLAG.US + " US Open</th>" +
        '<th title="Year W-L record (all match outcomes in our dataset)">Record</th>' +
        '<th title="Tournament titles won that calendar year">Titles</th>' +
        '<th title="End-of-year rating + tour rank (Dec 31 calendar-year rating)">EOY</th>' +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>";

      var careerChartId = "careerChart" + tour;
      var careerLegendId = "careerChartLegend" + tour;
      var careerCard =
        '<div class="sport-chart-wrap"><p class="sport-subhead">fakeronjan WLS rating · career trajectory</p>' +
        '<svg id="' + careerChartId + '" class="sport-tennis-chart-small" style="width:100%;height:15rem"></svg>' +
        '<div class="career-legend" id="' + careerLegendId + '"></div></div>';

      contentEl.innerHTML = header + careerCard + grid;
      renderCareerChart(tour, player, careerChartId, careerLegendId);
    });
  }

  function renderCareerChart(tour, player, svgId, legendId) {
    var svg = document.getElementById(svgId);
    var legend = document.getElementById(legendId);
    if (!svg) return;
    var slug = playerSlug(player);
    var tourSlug = tour === "m" ? "atp" : "wta";
    return fetch(BASE + "/players/" + tourSlug + "_" + slug + ".json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        if (!data || !data.history || data.history.length === 0) {
          svg.outerHTML = '<div class="sport-loading">No rating history available for this player (slam wins predate the rating window)</div>';
          legend.innerHTML = "";
          return;
        }
        var hist = data.history.map(function (h) {
          return {
            t: new Date(h.date).getTime(),
            base: +h.base,
            hard: +h.base + (+h.hard_delta || 0),
            clay: +h.base + (+h.clay_delta || 0),
            grass: +h.base + (+h.grass_delta || 0),
          };
        });

        var W = svg.parentElement.clientWidth - 32;
        var H = 240;
        var padL = 36, padR = 12, padT = 10, padB = 26;
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);

        var tMin = hist[0].t, tMax = hist[hist.length - 1].t;
        var tSpan = Math.max(1, tMax - tMin);
        var surfacesIncluded = ["hard", "clay", "grass"].filter(function (s) {
          var deltaCol = s + "_delta";
          return data.history.some(function (h) { return Math.abs(+h[deltaCol] || 0) > 0.05; });
        });
        var seriesKeys = ["base"].concat(surfacesIncluded);

        var yMin = -1, yMax = 5;
        function px(t) { return padL + (t - tMin) / tSpan * (W - padL - padR); }
        function py(v) { return padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB); }

        var yTickStep = (function () {
          var span = yMax - yMin;
          var cand = [0.25, 0.5, 1.0, 2.0];
          for (var i = 0; i < cand.length; i++) if (span / cand[i] <= 6) return cand[i];
          return Math.ceil(span / 5);
        })();
        var grid = "", ylab = "";
        for (var v = Math.ceil(yMin / yTickStep) * yTickStep; v <= yMax + 1e-9; v += yTickStep) {
          var y = py(v);
          grid += '<line class="chart-grid" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke-width="1"/>';
          ylab += '<text class="chart-ticklabel" x="' + (padL - 4) + '" y="' + (y + 3).toFixed(1) + '" font-size="10" text-anchor="end">' + v.toFixed(yTickStep < 1 ? 1 : 0) + "</text>";
        }
        if (yMin < 0 && yMax > 0) {
          var y0 = py(0);
          grid += '<line class="chart-zero" x1="' + padL + '" y1="' + y0.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y0.toFixed(1) + '" stroke-width="1" stroke-dasharray="3,3"/>';
        }

        var firstYr = new Date(tMin).getUTCFullYear();
        var lastYr = new Date(tMax).getUTCFullYear();
        var yrSpan = Math.max(1, lastYr - firstYr);
        var yrStep = yrSpan <= 6 ? 1 : (yrSpan <= 12 ? 2 : (yrSpan <= 25 ? 5 : 10));
        var xtick = "", xlab = "";
        for (var yr = Math.ceil(firstYr / yrStep) * yrStep; yr <= lastYr; yr += yrStep) {
          var tYr = Date.UTC(yr, 0, 1);
          if (tYr < tMin || tYr > tMax) continue;
          var x = px(tYr);
          xtick += '<line class="chart-axis" x1="' + x.toFixed(1) + '" y1="' + (H - padB) + '" x2="' + x.toFixed(1) + '" y2="' + (H - padB + 4) + '" stroke-width="1"/>';
          xlab += '<text class="chart-ticklabel" x="' + x.toFixed(1) + '" y="' + (H - padB + 16) + '" font-size="10" text-anchor="middle">' + yr + "</text>";
        }

        var lines = "", legendHTML = "";
        seriesKeys.forEach(function (k) {
          var pts = hist.map(function (h) { return px(h.t).toFixed(1) + "," + py(h[k]).toFixed(1); }).join(" ");
          var col = CAREER_PALETTE[k];
          var sw = k === "base" ? 2.2 : 1.5;
          var op = k === "base" ? 1.0 : 0.85;
          lines += '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linejoin="round" opacity="' + op + '"/>';
          legendHTML += '<span style="color:' + col + '"><span class="legend-swatch" style="background:' + col + '"></span>' + CAREER_LABELS[k] + "</span>";
        });

        svg.innerHTML = grid + ylab + xtick + xlab + lines;
        legend.innerHTML = legendHTML;
      });
  }

  // ═══════════════════════════════ Champions ═══════════════════════════════

  function surname(fullName) {
    var parts = String(fullName).trim().split(/\s+/);
    return parts[parts.length - 1];
  }

  function renderTournamentGrid(tour) {
    var tbodyId = tour === "m" ? "tournamentTableMWrap" : "tournamentTableWWrap";
    var wrap = document.getElementById(tbodyId);
    var slams = state.DATA[tour];
    var tourLetter = tour === "m" ? "M" : "W";
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
        var nameHTML = playerLink(tour, r.w, flagPart + escapeHtml(r.w));
        var ratingKey = tourLetter + "_" + r.y + "_" + r.s;
        var rt = state.CHAMPION_RATINGS[ratingKey];
        var ratingLine = "";
        if (rt) {
          var d = +rt.surface_delta || 0;
          var dCls = d >= 0 ? "wr-pos" : "wr-neg";
          var dStr = (d >= 0 ? "+" : "") + d.toFixed(2);
          ratingLine = '<div class="winner-rating"><span class="wr-base">' + rt.base.toFixed(2) + '</span> <span class="' + dCls + '">' + dStr + '</span> <span class="wr-surface">' + rt.surface + "</span></div>";
        }
        return '<div class="winner-entry"><div class="winner-name">' + nameHTML + '</div><div class="winner-num">' + counts + "</div>" + ratingLine + "</div>";
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

  // ═══════════════════════════════ GOAT Table ═══════════════════════════════

  function refreshGoatRating(tour) {
    var slug = tour === "m" ? "atp" : "wta";
    var wrap = document.getElementById(tour === "m" ? "goatTableMWrap" : "goatTableWWrap");
    var footnoteEl = document.getElementById(tour === "m" ? "goatFootnoteM" : "goatFootnoteW");
    var file;
    if (state.goatView === "era") file = "goat_era_" + slug + ".json";
    else if (state.peakSubView === "all") file = "goat_peak_seasons_" + slug + ".json";
    else file = "goat_peak_" + slug + ".json";
    return fetchRatings(file).then(function (data) {
      if (!data || !data.players) {
        wrap.innerHTML = '<p class="sport-loading">Ratings unavailable</p>';
        footnoteEl.hidden = true;
        return;
      }
      var rows;
      if (state.goatView === "peak") {
        rows = data.players.map(function (p) {
          var sd = { hard: p.hard_delta, clay: p.clay_delta, grass: p.grass_delta };
          var slamFlags = (p.slams_won || []).map(function (c) { return SLAM_FLAG[c] || ""; }).filter(Boolean).join(" ");
          var flagPart = p.country ? p.country + " " : "";
          var nameHTML = playerLink(tour, p.player, flagPart + escapeHtml(p.player));
          return (
            "<tr><td class=\"col-rank\">" + p.rank + "</td>" +
            '<td class="team-cell">' + nameHTML + "</td>" +
            '<td class="rating-cell" title="Player\'s peak end-of-year rating minus that year\'s #10 player base">' + p.base.toFixed(2) + "</td>" +
            '<td class="col-od">' + p.peak_year + "</td>" +
            '<td class="col-od">' + surfaceDeltaHTML(sd) + "</td>" +
            '<td class="col-od">' + (p.match_wins || 0) + "-" + (p.match_losses || 0) + "</td>" +
            '<td class="col-od">' + (p.titles || 0) + "</td>" +
            '<td class="col-od">' + (slamFlags || "-") + "</td>" +
            '<td class="col-od">' + (p.year_end_no1 || "-") + "</td></tr>"
          );
        }).join("");
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">#</th><th>Player</th>' +
          '<th title="Peak end-of-year rating minus that year\'s #10 player base - rating above the marginal top-10 player. Strips out year-to-year field-depth variance.">Peak</th>' +
          "<th>Year</th><th>Surface specialization</th><th>Record</th><th>Titles</th><th>Slams</th>" +
          '<th title="Times the player finished a season ranked #1 by EOY rating">YE #1</th>' +
          "</tr></thead><tbody>" + rows + "</tbody></table>";
        footnoteEl.hidden = true;
        footnoteEl.innerHTML = "";
      } else {
        // Players whose career-title count in our data falls more than 5 short
        // of their official total - known Sackmann-era coverage gaps.
        var TITLE_ASTERISK = { "Jimmy Connors": 1, "Chris Evert": 1, "Evonne Goolagong": 1, "Billie Jean King": 1, "Rosie Casals": 1 };
        rows = data.players.map(function (p) {
          var flagPart = p.country ? p.country + " " : "";
          var nameHTML = playerLink(tour, p.player, flagPart + escapeHtml(p.player));
          var titleAsterisk = TITLE_ASTERISK[p.player] ? '<span class="title-asterisk" title="Sackmann match-data coverage gap; official career title count is materially higher than what our data captures.">*</span>' : "";
          return (
            "<tr><td class=\"col-rank\">" + p.rank + "</td>" +
            '<td class="team-cell">' + nameHTML + "</td>" +
            '<td class="rating-cell">' + p.era.toFixed(1) + "</td>" +
            '<td class="col-od">' + p.first_year + "-" + p.last_year + ' <span class="dim-pct">(' + p.years_active + "y)</span></td>" +
            '<td class="col-od">' + (p.career_slams || 0) + "</td>" +
            '<td class="col-od">' + (p.career_titles || 0) + titleAsterisk + "</td>" +
            '<td class="col-od">' + (p.career_wins || 0).toLocaleString() + "-" + (p.career_losses || 0).toLocaleString() + "</td>" +
            '<td class="col-od">' + (p.year_end_no1 || "-") + "</td></tr>"
          );
        }).join("");
        wrap.innerHTML =
          '<table class="sport-table"><thead><tr>' +
          '<th class="col-rank">#</th><th>Player</th>' +
          '<th title="Career sum of positive (EOY rating - that year\'s #10 player base). Only above-top-10 seasons contribute.">ERA</th>' +
          "<th>Span</th>" +
          '<th title="Career Grand Slam singles titles">Slams</th>' +
          '<th title="Career singles titles (all tour-level events)">Titles</th>' +
          '<th title="Career match record">Record</th>' +
          '<th title="Times the player finished a season ranked #1 by EOY rating">YE #1</th>' +
          "</tr></thead><tbody>" + rows + "</tbody></table>";
        // Kept OUT of the .sport-table-wrap grid (a sibling <p>, not appended
        // into wrap.innerHTML): that grid shares one max-content column across
        // all its children, and this footnote's long unwrapped sentence blew
        // the shared column (and the table stretched to fill it) out to the
        // full 1320px breakout width even though the table itself is narrow.
        footnoteEl.innerHTML =
          '<span class="title-asterisk">*</span> Career titles are derived from ' +
          '<a href="https://github.com/LuckyLoser91/TennisCourtLog" target="_blank" rel="noopener">TennisCourtLog</a> ' +
          "ATP / WTA match data (Jeff Sackmann's history + tennis-data.co.uk, 1973+ singles main draws). " +
          "Pre-1990 ATP and pre-2000 WTA have known coverage gaps for smaller events " +
          "(Virginia Slims series, Avon Futures, early Grand Prix / WCT); these career totals may undercount the " +
          "player's official total by 5+ titles. Pre-1973 wins are not included.";
        footnoteEl.hidden = false;
      }
    });
  }

  document.getElementById("goatViewPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#goatViewPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.goatView = btn.dataset.view;
    updatePeakSubViewVisibility();
    refreshGoatRating(state.mwState.goat);
  });
  document.getElementById("peakSubviewPills").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;
    document.querySelectorAll("#peakSubviewPills .pill").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    state.peakSubView = btn.dataset.peakSub;
    refreshGoatRating(state.mwState.goat);
  });
  function updatePeakSubViewVisibility() {
    var sub = document.getElementById("peakSubviewPills");
    if (sub) sub.hidden = state.goatView !== "peak";
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
      var linkAttrs = isLinkablePlayer(tour, p) ? ' linked" data-jump-tour="' + tour + '" data-jump-player="' + escapeHtml(p) + '"' : '"';
      if (pts.length === 0) {
        legendHTML += '<span class="legend-item' + linkAttrs + ' style="color:' + col + '"><span class="legend-swatch" style="background:' + col + '"></span>' + flagPart + escapeHtml(p) + " (0)</span>";
        return;
      }
      lines += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>';
      if (lastPt) endLabels += '<circle cx="' + lastPt.x.toFixed(1) + '" cy="' + lastPt.y.toFixed(1) + '" r="3" fill="' + col + '"/>';
      legendHTML += '<span class="legend-item' + linkAttrs + ' style="color:' + col + '"><span class="legend-swatch" style="background:' + col + '"></span>' + flagPart + escapeHtml(p) + " (" + (lastPt ? lastPt.v : 0) + ")</span>";
    });
    legendHTML += '<span class="legend-item" style="color:var(--fg)"><span class="legend-swatch dashed"></span>Active OE leader (dashed)</span>';

    svg.innerHTML = grid + ylab + xtick + xlab + leaderLine + lines + endLabels;
    var legendEl = document.getElementById(legendId);
    legendEl.innerHTML = legendHTML;
    attachLegendLinks(legendEl);
    if (legendId2) {
      var legendEl2 = document.getElementById(legendId2);
      legendEl2.innerHTML = legendHTML;
      attachLegendLinks(legendEl2);
    }
  }

  function attachLegendLinks(root) {
    root.querySelectorAll(".legend-item.linked").forEach(function (el) {
      el.addEventListener("click", function () { jumpToPlayer(el.dataset.jumpTour, el.dataset.jumpPlayer); });
    });
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
      var nameHTML = playerLink(tour, n, flagPart + escapeHtml(n) + ' <span class="pill-range">(' + rangeLabel + ")</span>");
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

  loadMeta();
  Promise.all([loadSlamsBundle(), loadEngineCountries()]).then(function () {
    return loadChampionRatings();
  }).then(function () {
    ["m", "w"].forEach(function (tour) {
      renderCohortPills(tour);
      var cohort = COHORTS[tour][0];
      var slug = tour === "m" ? "men" : "women";
      document.getElementById(slug + "Chart1Sub").textContent = cohort.sub;
      renderChart1(slug + "Chart1", slug + "Legend1", slug + "Legend2", tour, cohort);
      renderChart2(slug + "Chart2", tour, cohort);
      renderTable(slug + "Table", tour, cohort);
      renderTournamentGrid(tour);
      populatePlayerDropdown(tour);
    });
    refreshPowerRankings("m");
  }).catch(function () {
    document.getElementById("prTableMWrap").innerHTML = '<p class="sport-error">Could not load ratings</p>';
  });
})();
