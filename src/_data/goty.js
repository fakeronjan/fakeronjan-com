// Game of the Year picks, read from the Game of the Year page itself so the
// winners table stays the only place they're written down. Gameplay History
// game pages use this to show a badge linking to the write-up.
const fs = require("fs");
const path = require("path");

const ENTITIES = { "&amp;": "&", "&#8217;": "’", "&rsquo;": "’", "&quot;": '"', "&#39;": "'" };

function text(cell) {
  return cell.replace(/<[^>]+>/g, "").replace(/&[#a-z0-9]+;/gi, (e) => ENTITIES[e] || e).trim();
}

module.exports = function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "video-games.njk"), "utf8");
  const rows = html.matchAll(/<tr(?: class="decade-row")?><td>(.*?)<\/td><td(?: colspan="\d")?>(.*?)<\/td>(?:<td>(.*?)<\/td>)?(?:<td>(.*?)<\/td>)?<\/tr>/g);
  const picks = [];
  for (const [, yearCell, winner, runnerUp, third] of rows) {
    const year = text(yearCell);
    if (!/^\d{4}s?$/.test(year)) continue; // the methodology table's rows
    const link = yearCell.match(/href="([^"]+)"/);
    const url = link ? link[1] : null;
    const decade = year.endsWith("s");
    picks.push({ year, place: decade ? "Game of the Decade" : "Game of the Year", game: text(winner), url });
    if (runnerUp) picks.push({ year, place: "Runner-up", game: text(runnerUp), url });
    if (third && text(third) !== "-") picks.push({ year, place: "3rd place", game: text(third), url });
  }
  return picks;
};
