// Team colors for the sports pages, shared by every sports-*.js that loads it.
//
// Each league registers its teams' color eras: [first season, last season
// (9999 = ongoing), primary, secondary, optional options]. The circles
// always show primary and secondary; options like
// { light: { p: "#A2AAAD" }, dark: { s: "#FFFFFF" } } change the chart line
// per theme (only the Nets, whose black and white would each vanish in one
// theme). Primary is the color of the team's main
// jersey (road jersey in basketball, home in football), black included. A
// team name with no era for a season gets no colors, and pages fall back to
// their usual look.
//
// Chart lines stay readable: a color under 3:1 contrast with the page
// background is lightened or darkened (never swapped for another color),
// and two gray-toned colors are kept at least 3:1 apart from each other.
// Lines get a color for each theme, chosen by CSS (see .tc-stop in style.css).
(function () {
  var LEAGUES = {};
  // The pages' --bg in each theme (style.css :root and its dark override).
  var BG = { light: "#fdfdfd", dark: "#16161a" };
  // opts.confirmed: last season checked for rebrands (read by the droplet's
  // health check, not the pages).
  function register(league, data, opts) {
    var byKey = {};
    Object.keys(data).forEach(function (team) {
      byKey[key(team)] = data[team].map(function (e) {
        return [e[0], e[1], e[2].toUpperCase(), e[3].toUpperCase(), e[4] || {}];
      });
    });
    LEAGUES[league] = byKey;
  }

  // Teams are looked up by their pages' slug form, so a name and its slug
  // ("Miami (OH)" / "Miami__OH", "St. Louis Cardinals" / "St__Louis_Cardinals")
  // find the same colors: punctuation and spaces become "_", trailing ones go.
  function key(team) { return String(team).replace(/[^A-Za-z0-9\u00C0-\u024F]/g, "_").replace(/_+$/, ""); }

  function era(league, team, season) {
    var eras = (LEAGUES[league] || {})[key(team)];
    if (!eras) return null;
    if (season == null || season === "") return eras[eras.length - 1];   // no season: current colors
    var y = Number(season);
    for (var i = 0; i < eras.length; i++) if (y >= eras[i][0] && y <= eras[i][1]) return eras[i];
    return null;
  }

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function hex(c) { return "#" + c.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("").toUpperCase(); }
  function lum(h) {
    var w = [0.2126, 0.7152, 0.0722];
    return rgb(h).reduce(function (a, v, i) { v /= 255; return a + w[i] * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }, 0);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function sat(h) { var c = rgb(h), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c); return mx === 0 ? 0 : (mx - mn) / mx; }

  // c moved toward black (light page) or white (dark page) until it reaches
  // 3:1 against `against`.
  function push(c, bg, against) {
    var to = lum(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255], base = rgb(c), out = c;
    for (var t = 0.05; t <= 1.0001 && contrast(out, against) < 3; t += 0.05) {
      out = hex(base.map(function (v, k) { return v + (to[k] - v) * t; }));
    }
    return out;
  }

  function lineFor(p, s, bg) {
    p = contrast(p, bg) >= 3 ? p : push(p, bg, bg);
    s = contrast(s, bg) >= 3 ? s : push(s, bg, bg);
    // Gray-toned pairs (silver and black) only differ by lightness: the one
    // farther from the page background moves farther still.
    var darkPage = lum(bg) <= 0.5;
    if (sat(p) <= 0.15 && sat(s) <= 0.15 && contrast(p, s) < 3) {
      if (darkPage ? lum(p) >= lum(s) : lum(p) <= lum(s)) p = push(p, bg, s);
      else s = push(s, bg, p);
    }
    return { p: p, s: s };
  }

  // { light: {p, s}, dark: {p, s} } for a team's chart line, or null.
  function line(league, team, season) {
    var e = era(league, team, season);
    if (!e) return null;
    var o = e[4];
    function theme(k) { var c = o[k] || {}; return lineFor(c.p || e[2], c.s || e[3], BG[k]); }
    return { light: theme("light"), dark: theme("dark") };
  }

  // Two overlapped circles (primary in front, secondary behind to its right)
  // for next to a team name, or "" when the team has no colors for that season.
  function dot(league, team, season) {
    var e = era(league, team, season);
    if (!e) return "";
    function c(x, fill) { return '<circle cx="' + x + '" cy="6" r="5" fill="' + fill + '"/><circle class="tc-ol" cx="' + x + '" cy="6" r="5"/>'; }
    return '<svg class="tc-dot" viewBox="0 0 18 12" aria-hidden="true">' + c(12, e[3]) + c(6, e[2]) + '</svg>';
  }

  // Adds the circle to a linked team name (data-team-slug, data-season),
  // glued to the name's first word so a wrapped name never leaves it alone
  // on a line.
  function decorate(el, league) {
    if (el.querySelector(".tc-dot")) return;
    var d = dot(league, el.dataset.teamSlug, el.dataset.season);
    if (!d) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return /\S/.test(n.data) ? 1 : 3; } });
    var text = walker.nextNode();
    var glue = document.createElement("span");
    glue.className = "tc-glue";
    glue.innerHTML = d;
    if (!text) { el.insertBefore(glue, el.firstChild); return; }
    var m = text.data.match(/^(\s*)(\S+)/);
    text.data = text.data.slice(m[0].length);
    glue.appendChild(document.createTextNode(m[2]));
    text.parentNode.insertBefore(glue, text);
    if (m[1]) text.parentNode.insertBefore(document.createTextNode(m[1]), glue);
  }

  // The Team Summary rating line in team colors: primary above zero,
  // secondary below, one segment per color era (each starts at the previous
  // era's last point so the line is continuous). rows need .season; px/py
  // place a row index / rating; H is the SVG height. Returns { defs, lines }
  // or null when any season lacks colors (the page keeps its usual line).
  function chartLine(league, team, rows, px, py, zeroY, H) {
    var cols = rows.map(function (r) { return line(league, team, r.season); });
    if (!cols.length || !cols.every(Boolean)) return null;
    var segs = [];
    rows.forEach(function (r, i) {
      var key = JSON.stringify(cols[i]), last = segs[segs.length - 1];
      if (last && last.key === key) last.idx.push(i);
      else segs.push({ key: key, c: cols[i], idx: i > 0 ? [i - 1, i] : [i] });
    });
    var defs = "", lines = "";
    segs.forEach(function (sg, k) {
      function stop(off, which) {
        return '<stop class="tc-stop" offset="' + off + '" style="--tcl:' + sg.c.light[which] + ";--tcd:" + sg.c.dark[which] + '"/>';
      }
      defs += '<linearGradient id="tcGrad' + k + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
        stop((zeroY / H - 0.0001).toFixed(4), "p") + stop((zeroY / H + 0.0001).toFixed(4), "s") + "</linearGradient>";
      lines += '<polyline points="' + sg.idx.map(function (i) { return px(i).toFixed(1) + "," + py(rows[i].rating).toFixed(1); }).join(" ") +
        '" fill="none" stroke="url(#tcGrad' + k + ')" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    return { defs: defs, lines: lines };
  }

  window.TeamColors = { register: register, era: era, line: line, dot: dot, decorate: decorate, chartLine: chartLine };
})();
