---
layout: post.njk
title: "Useless ______ Analysis!"
date: 2015-03-03
original_source: uselessanalysis.com
---

# {{ title }}

<p>March is upon us, and we are coming up on the two-year anniversary of the founding of this site!  We've tried some wacky stuff, and we want to do more.  What does this mean?</p>
<p><strong>As of today, Useless Sports Analysis is now Useless Analysis!</strong></p>
<p>That's right -- we are broadening our scope to take on whatever the heck we feel like!  I expect that we will largely continue to be sports-focused, but anytime a crazy idea pops into our head that's not sports-related, we'll go ahead and give it a shot.</p>
<p>In that vein, I took a stab at some perceptual mapping in politics.  (Don't worry -- we're not being inflammatory here, this analysis is neutral!)  I wanted to stretch some of my advanced analytics muscles that haven't been used since my first job out of college.</p>
<p>Public Policy Polling conducted a poll of Republican primary voters and released the full crosstabs <a href="http://www.publicpolicypolling.com/pdf/2015/PPP_Release_National_22415.pdf" rel="noopener" target="_blank" title="">here</a>.  There are some very interesting splits in here, particularly when we look at policy positions for voters who support particular candidates.</p>
<p>Enter the wacky idea: look at how voters that are favorable to different candidates respond to different questions, such as their take on global warming, evolution, Benjamin Netanyahu, or the Tea Party.  Then, based on these responses, visually plot candidates close to the positions that the voters think they stand for.</p>
<p><span style="background-"><em>(Nerd alert: I created a Principal Component Analysis biplot of the contingency table of the original crosstab data.)</em></span><span style="background-"><br/></span><br/><span style="background-">Here's what that data-driven analysis came up with:</span></p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/useless-______-analysis/4747577_orig.png"/></figure>
<p>How to read this chart:<br/><ul><li>Candidates are marked with red dots, while different positions are marked with gray dots</li><li>The closer a candidate is to a position, the more that voters associate that candidate with that position</li><li>The closer a candidate is to another candidate, the more similar that voters feel they are</li><li>The further a candidate or position is from the center, the more that candidate or position differentiates</li></ul><br/>The most interesting thing to me is how the two axes ended up being created.  Principal Component Analysis does not accept manual intervention -- I didn't tell the computer to plot candidate establishment vs. candidate position strength.  This was generated organically by how the candidates and positions differentiate themselves, and I named the axes as best as I could based on where things landed.</p>
<p>What we end up with is establishment candidates at the top of the chart and challenger candidates at the bottom, and strong policy positions on the left and more moderate policy positions on the right.</p>
<p>I don't have any commentary on this chart (that I'm willing to post on this site right now!), but I thought the exercise itself was fun and a nice way to kick off the new, broader site.</p>
<p>Thoughts?</p>
<p>-rj</p>
