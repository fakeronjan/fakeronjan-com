// Team colors for the sports pages, shared by every sports-*.js that loads it.
//
// Each league registers its teams' color eras: [first season, last season
// (9999 = ongoing), primary, secondary]. A team name with no era for a season
// gets no colors, and pages fall back to their usual look. Two rules apply
// to the data as registered:
//   - Black is never a primary color: an era listed black-first is flipped.
//   - Chart lines stay readable: a color under 3:1 contrast with the page
//     background is lightened or darkened (never swapped for another color),
//     and two gray-toned colors are kept at least 3:1 apart from each other.
// Lines get a color for each theme, chosen by CSS (see .tc-stop in style.css).
(function () {
  var LEAGUES = {};
  // The pages' --bg in each theme (style.css :root and its dark override).
  var BG = { light: "#fdfdfd", dark: "#16161a" };
  var BLACK = "#000000";

  // opts.confirmed: last season checked for rebrands (read by the droplet's
  // health check, not the pages).
  function register(league, data, opts) {
    Object.keys(data).forEach(function (team) {
      data[team] = data[team].map(function (e) {
        var p = e[2].toUpperCase(), s = e[3].toUpperCase();
        return p === BLACK ? [e[0], e[1], s, p] : [e[0], e[1], p, s];
      });
    });
    LEAGUES[league] = data;
  }

  function era(league, team, season) {
    var eras = (LEAGUES[league] || {})[team];
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
    // Gray-toned pairs (silver and black) only differ by lightness.
    var darkPage = lum(bg) <= 0.5;
    if (sat(p) <= 0.15 && sat(s) <= 0.15 && contrast(p, s) < 3 && (darkPage ? lum(p) >= lum(s) : lum(p) <= lum(s))) p = push(p, bg, s);
    return { p: p, s: s };
  }

  // { light: {p, s}, dark: {p, s} } for a team's chart line, or null.
  function line(league, team, season) {
    var e = era(league, team, season);
    if (!e) return null;
    return { light: lineFor(e[2], e[3], BG.light), dark: lineFor(e[2], e[3], BG.dark) };
  }

  // Two-color circle (top half primary, bottom half secondary) for next to a
  // team name, or "" when the team has no colors for that season.
  function dot(league, team, season) {
    var e = era(league, team, season);
    if (!e) return "";
    return '<svg class="tc-dot" viewBox="0 0 12 12" aria-hidden="true">' +
      '<path d="M1 6 A5 5 0 0 1 11 6 Z" fill="' + e[2] + '"/><path d="M1 6 A5 5 0 0 0 11 6 Z" fill="' + e[3] + '"/>' +
      '<circle cx="6" cy="6" r="5"/></svg>';
  }

  window.TeamColors = { register: register, era: era, line: line, dot: dot };
})();
