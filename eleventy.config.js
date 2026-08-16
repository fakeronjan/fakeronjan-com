module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/blog/img");
  eleventyConfig.addPassthroughCopy("src/CNAME");

  eleventyConfig.addCollection("blog", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/blog/*.md").sort(
      (a, b) => b.date - a.date
    )
  );

  // M/D/YYYY, matching the numeric date convention used across the
  // sports-ratings fleet.
  eleventyConfig.addFilter("mdy", (date) => {
    const d = new Date(date);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  });

  const tagLabels = require("./src/_data/tagList.js");
  eleventyConfig.addFilter("tagLabel", (slug) => {
    const match = tagLabels.find((t) => t.slug === slug);
    return match ? match.label : slug;
  });

  eleventyConfig.addFilter("countTag", (posts, slug) => {
    if (slug === "all") return posts.length;
    return posts.filter((p) => (p.data.tags || []).includes(slug)).length;
  });

  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));

  eleventyConfig.addFilter("withTag", (posts, slug) =>
    posts.filter((p) => (p.data.tags || []).includes(slug))
  );

  // posts collection is sorted newest-first, so the older post (chronological
  // predecessor) sits at idx+1 and the newer post (successor) sits at idx-1.
  eleventyConfig.addFilter("adjacentPosts", (posts, url) => {
    const idx = posts.findIndex((p) => p.url === url);
    if (idx === -1) return { previous: null, next: null };
    return {
      previous: idx + 1 < posts.length ? posts[idx + 1] : null,
      next: idx > 0 ? posts[idx - 1] : null,
    };
  });

  // cache-buster for style.css so a rebuild always forces a fresh fetch
  eleventyConfig.addGlobalData("buildTime", () => Date.now());
  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
