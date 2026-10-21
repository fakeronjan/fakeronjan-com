// Shareable URLs for the sports pages, shared by every sports-*.js.
//
// The address bar mirrors the active tab and its main selections, so any
// view can be shared as a link, and opening a link restores that view. The
// tab is always written, even on the landing view (which can move, e.g. to
// Playoffs while they're live); other settings only when they differ from
// the default, so a link without a week follows the current week and one
// with a week stays on it. Tab changes add a history entry; selection
// changes replace it; Back restores the previous entry.
//
// Each page supplies, per tab, query(add) to write its settings and
// apply(params) to restore them (returning a promise), plus the promise for
// when each tab's data is in. Pages load this before their own script.
(function () {
  function findPill(containerId, key, value) {
    return Array.prototype.filter.call(document.querySelectorAll("#" + containerId + " .pill"), function (b) {
      return b.dataset[key] === value;
    })[0] || null;
  }

  function setPills(containerId, value) {
    document.querySelectorAll("#" + containerId + " .pill").forEach(function (b) {
      b.classList.toggle("active", b.dataset.value === value);
    });
  }

  function hasOption(sel, value) {
    return Array.prototype.some.call(sel.options, function (o) { return o.value === value; });
  }

  function pick(value, allowed, dflt) {
    return allowed.indexOf(value) !== -1 ? value : dflt;
  }

  // Seasons in the data are numbers; anything not in the list gets the newest.
  function seasonFrom(value, seasons) {
    var n = Number(value);
    return value != null && seasons.indexOf(n) !== -1 ? n : seasons[0];
  }

  // A season dropdown's values as numbers, in its order (newest first).
  function optionNumbers(sel) {
    return Array.prototype.map.call(sel.options, function (o) { return Number(o.value); });
  }

  function tabButton(tab) {
    return Array.prototype.filter.call(document.querySelectorAll(".sport-tab"), function (b) {
      return b.dataset.tab === tab;
    })[0] || null;
  }

  // cfg: { tabs: { name: { query: fn(add), apply: fn(params) -> promise } },
  //        activateTab: fn(name), fallbackTab: "standings",
  //        onLink: fn() - called when a link or Back takes over (e.g. to stop
  //        an automatic tab switch) }
  function create(cfg) {
    var tabs = cfg.tabs;
    var fallback = cfg.fallbackTab || "standings";
    var ready = null;
    var initial = new URLSearchParams(location.search);

    function currentTab() {
      var b = document.querySelector(".sport-tab.active");
      return b ? b.dataset.tab : fallback;
    }

    function query() {
      var tab = currentTab(), q = [];
      function add(k, v) { q.push(k + "=" + encodeURIComponent(v)); }
      add("tab", tab);
      if (tabs[tab] && tabs[tab].query) tabs[tab].query(add);
      return q.join("&");
    }

    function write(push) {
      if (!ready) return;
      var qs = query();
      var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
      if (url === location.pathname + location.search + location.hash) return;
      history[push ? "pushState" : "replaceState"](null, "", url);
    }

    // Shows the view a URL describes once that tab's data is in. A tab whose
    // button is still hidden then (no data for it) falls back to the default.
    function apply(p) {
      var tab = tabs[p.get("tab")] && tabButton(p.get("tab")) ? p.get("tab") : fallback;
      cfg.activateTab(tab);
      return Promise.resolve(ready[tab]).then(function () {
        if (tabButton(tab).hidden) {
          cfg.activateTab(fallback);
          return Promise.resolve(tabs[fallback].apply(new URLSearchParams())).then(function () { write(); });
        }
        return tabs[tab].apply(p);
      });
    }

    var hasParams = !!initial.toString();
    if (hasParams) {
      if (cfg.onLink) cfg.onLink();
      // Show the linked tab right away; its settings follow once data is in.
      if (tabs[initial.get("tab")] && tabButton(initial.get("tab"))) cfg.activateTab(initial.get("tab"));
    }

    window.addEventListener("popstate", function () {
      if (!ready) return;
      if (cfg.onLink) cfg.onLink();
      apply(new URLSearchParams(location.search));
    });

    return {
      write: write,
      // readyByTab: { tab: promise }; landing: promises that settle the
      // landing view, after which a bare URL gets its tab filled in.
      start: function (readyByTab, landing) {
        ready = readyByTab;
        if (hasParams) apply(initial);
        else Promise.all(landing || []).then(function () { write(); });
      },
    };
  }

  window.SportUrl = {
    create: create,
    findPill: findPill,
    setPills: setPills,
    hasOption: hasOption,
    pick: pick,
    seasonFrom: seasonFrom,
    optionNumbers: optionNumbers,
  };
})();
