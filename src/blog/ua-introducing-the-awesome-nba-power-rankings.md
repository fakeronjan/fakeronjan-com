---
layout: post.njk
title: "Introducing: the AWESOME NBA power rankings"
date: 2013-11-15
original_source: uselesssportsanalysis.com
---

# {{ title }}

<p>Well, you knew it was coming.  The NBA is my favorite sport -- with nothing else even remotely close at this point -- and I had to try power ranking it.</p>
<p>Power rankings in the NBA are inherently stupid, though.  The season is so long that they inevitably turn into restatements of the standings.  <a href="http://espn.go.com/nba/hollinger/powerrankings" rel="noopener" target="_blank" title="">John Hollinger's power rankings</a> are a bit of a step up from the norm in terms of useful power rankings, but I'm going to go in the other direction and try to come up with something that is substantially more useless.</p>
<p>How'd we do it?</p>
<p><ol><li>Start with the <a href="/blog/ua-nfl-power-rankings-introducing-olandis/" title="">OLANDIS</a> NFL power ranking system.</li><li>Remove the last "head to head" adjustment that we put in.  It gets too complicated in the NBA with every team playing each other multiple times.</li><li>Put in a scoring margin adjustment, similar to ADAMLE.  But rather than capping points at a certain point, we'll actually take the <em>square root</em> of scoring margin and make that the currency to optimize around.  This means that a 4 point win is twice as good as a 1 point win, and a 16 point win is twice as good as a 4 point win.  Is this the right way to do it?  Probably not.  But that's how we're doing it!</li><li>Add in a recency factor that is <em>far more extreme</em> than you see anywhere else.  Basically -- each day of the season is 3% more important than the previous day.  This means that by the end of the season, game #82 will be worth over 100 times what game #1 means to the power rankings.  Is this going to help with predictions or accuracy?  Heck if I know.  But hopefully it produces swings that are interesting to write about.</li></ol></p>
<p>So with that, let's get straight to the rankings, presented without commentary.  All I'll say is that if you want to predict scoring margins, take the difference between ratings, give the home team 0.5, and then <em>square that</em> to get the model's prediction.</p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/introducing-the-awesome-nba-power-rankings/6091432_orig.png"/></figure>
<p>Let's see how this system works over the course of a season.  Enjoy your weekends, everyone!</p>
<p>-rj</p>
