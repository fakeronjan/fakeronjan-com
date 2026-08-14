---
layout: post.njk
title: "How many games will the Knicks win this year?"
date: 2015-02-24
original_source: uselesssportsanalysis.com
---

# {{ title }}

<p>The New York Knicks are comically bad.  They sit at a league-worst record of 10-45 and superstar Carmelo Anthony is out for the remainder of the season.  <a href="http://espn.go.com/new-york/nba/story/_/id/12342329/carmelo-anthony-new-york-knicks-ruled-rest-season" rel="noopener" target="_blank" title="">They are 0-15</a> without Carmelo thus far, so it's possible that they may not have even hit rock bottom yet.</p>
<p><strong>How many wins will this team muster the rest of the way?  </strong><span style="background-">We took a look at the worst teams of the past thirty seasons to try to answer this question <em>(82 game seasons only)</em>.</span></p>
<p><span style="background-">If they maintain their current pace of winning 18% of their games, that gets them to a projection of 14.9 wins.  However, most teams with records that poor finish the season stronger than you'd think.<br/></span><br/>15 teams since the 1985-1986 season have had 10 or fewer wins through their 55th contest, with 80 teams winning 15 or fewer games.  There's quite a range of performance from these teams over the final 27 games -- the minimum was 2 wins, while the maximum was 13.  Here's the average wins those teams had the rest of the way:</p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/how-many-games-will-the-knicks-win-this-year/8198343_orig.png"/></figure>
<p>On their face, these figures may appear high.  This would put the Knicks in the 16-17 win range for the season, giving them a better winning % the rest of the season than they've had to date, despite the loss of Carmelo.</p>
<p>A simple regression analysis on the dataset, predicting wins in games 56+ by using wins in games 1-55, generates the same result, as the 10-win Knicks would be expected to win 6.4 games the rest of the way.</p>
<p>Another way to approach this is to use <em>point differential</em> in games 1-55 instead of wins to date, with the idea being that it may be more indicative of team ability and more predictive.  In fact, when you test this out, it's true!</p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/how-many-games-will-the-knicks-win-this-year/5291832_orig.png"/></figure>
<p>Using the Knicks' current point differential of -8.2, they're projected for an additional 6.6 wins, which again seems high.  If we assume that they'll play worse than their current differential because they no longer have, well, any good players, then we can plug in lower values and see what happens.</p>
<p>If we use the Sixers' current point differential of -10.6, their projection goes down to 5.9.  Plugging in the worst point differential in the past thirty years, <a href="http://bkref.com/tiny/sXIGY" rel="noopener" target="_blank" title="">the Dallas Mavericks of 1992-1993</a>, takes us even further down to 4.4.</p>
<p>Honestly, coming into this analysis, even 4.4 wins the rest of the way for the Knicks felt like a stretch with the roster they have right now.  But as teams wrap up playoff seeds and pack it in to prepare, the Knicks might very well pull off an upset win here or there.  History is on their side.</p>
<p>Below are projected total wins for the Knicks this season based on all of the approaches we tried:</p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/how-many-games-will-the-knicks-win-this-year/4194014_orig.png"/></figure>
<p>I think they'll find a way to get to 15.</p>
<p>-rj</p>
