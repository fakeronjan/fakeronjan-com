// Cross-site "fleet nav" grouping - mirrors the DILLON reference's own fleet-nav
// banner exactly (same groups, order, and league labels), so this becomes the
// shared reference pattern every migrated sport page reuses going forward.
module.exports = [
  {
    category: "Basketball",
    emoji: "🏀",
    leagues: [
      { slug: "nba", label: "NBA" },
      { slug: "wnba", label: "WNBA" },
      { slug: "intlbasketball", label: "Men Intl" },
    ],
  },
  {
    category: "Football",
    emoji: "🏈",
    leagues: [
      { slug: "nfl", label: "NFL" },
      { slug: "ncaafb", label: "College" },
    ],
  },
  {
    category: "Soccer",
    emoji: "⚽",
    leagues: [
      { slug: "eurosoccer", label: "Euro" },
      { slug: "mls", label: "MLS" },
      { slug: "intlsoccer", label: "Men Intl" },
    ],
  },
  {
    category: "Baseball",
    emoji: "⚾",
    leagues: [
      { slug: "mlb", label: "MLB" },
      { slug: "intlbaseball", label: "Men Intl" },
    ],
  },
  {
    category: "Hockey",
    emoji: "🏒",
    leagues: [
      { slug: "nhl", label: "NHL" },
      { slug: "intlhockey", label: "Men Intl" },
    ],
  },
  {
    category: "Tennis",
    emoji: "🎾",
    leagues: [{ slug: "tennis", label: "Player Ratings" }],
  },
  {
    category: "Reality TV",
    emoji: "📺",
    leagues: [{ slug: "thechallenge", label: "The Challenge" }],
  },
];
