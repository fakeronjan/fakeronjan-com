---
layout: base.njk
title: FAKE RONJAN!!
---

# Not useless analysis!

<p class="tagline">- Real Ronjan</p>

Welcome to my website! This is home base for a lot of my hobbies: writing, ranking sports teams, ranking video games, and making music. It's been a creative and analytical outlet that has also helped me reclaim my digital presence from big tech platforms. Thanks for visiting!

<div class="site-map">
  <a class="site-map-card" href="/blog/">
    <span class="site-map-title">Blog</span>
    <span class="site-map-desc">Whatever's on my mind, from introspective birthday posts to Mario Kart music rankings. Goes back to 2013, including posts from old websites.</span>
  </a>
  <a class="site-map-card" href="/video-games/">
    <span class="site-map-title">Game of the Year</span>
    <span class="site-map-desc">My favorite game from every year going back to 1990, constructed from memory and written archives. More recent years have full posts cataloging the year.</span>
  </a>
  <a class="site-map-card" href="/sports/">
    <span class="site-map-title">Sports Ratings</span>
    <span class="site-map-desc">My proprietary algorithm to rate basketball, football, soccer, baseball, and hockey teams. Ratings update daily and have archives going back decades.</span>
  </a>
  <a class="site-map-card" href="https://mariopaintmusicguy.com/" target="_blank" rel="noopener">
    <span class="site-map-title">Mario Paint Music Guy<span class="nav-arrow">&#8599;</span></span>
    <span class="site-map-row">
      <img class="site-map-logo" src="/img/mpmg-avatar.png" alt="" loading="lazy">
      <span class="site-map-desc">As a lifelong musician looking for ways to stay creative, I make music in the SNES game Mario Paint.</span>
    </span>
  </a>
  <a class="site-map-card" href="https://fakebasketball.com/" target="_blank" rel="noopener">
    <span class="site-map-title">Fake Basketball<span class="nav-arrow">&#8599;</span></span>
    <span class="site-map-row">
      <img class="site-map-logo" src="/img/fakebasketball-logo.png" alt="" loading="lazy">
      <span class="site-map-desc">I vibe coded an old-school computer game where you're the commissioner of a basketball league.</span>
    </span>
  </a>
</div>

## About me

<ul class="post-list">
{%- for post in collections.blog | withTag("about-me") %}
{%- if post.data.description %}
  <li>
    <div class="post-list-row">
      <span class="post-list-main">
        <a href="{{ post.url }}">{{ post.data.title }}</a>
        <span class="post-list-desc">&middot;&nbsp;{{ post.data.description }}</span>
      </span>
      <div class="date">{{ post.date | mdy }}</div>
    </div>
  </li>
{%- endif %}
{%- endfor %}
</ul>
