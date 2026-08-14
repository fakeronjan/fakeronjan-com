---
layout: post.njk
title: "Off-Topic Tuesday: how much is your penny candy?"
date: 2014-04-22
original_source: uselesssportsanalysis.com
---

# {{ title }}

<p>I love The Simpsons.  I want to write about The Simpsons.  And I don't want it to always be <a href="/blog/ua-countdown-the-simpsons-and-sports/" title="">sports-related</a>.  And since Chris stopped doing our last Tuesday segment, we have an opening in the schedule.  And so we begin Off-Topic Tuesday, an irregular segment to give us a forum to do Useless Non-Sports Analysis.</p>
<p>I'm going to start with a quick one.  In <em><a href="http://www.snpp.com/episodes/1F10.html" rel="noopener" target="_blank" title="">Homer and Apu</a></em>, it's clear that the Kwik-E-Mart is overcharging its customers.  Observe the following exchange, via SNPP:</p>
<p><em><strong>Man 1: </strong>I need one 29-cent stamp.</em><br/><em><strong>Apu: </strong>That's $1.85.</em><br/><em><strong>Man 2: </strong>I'll have $2.00 worth of gas, please.</em><br/><em><strong>Apu: </strong>$4.20.</em><br/><em><strong>Martin: </strong>How much is your penny candy?</em><br/><em><strong>Apu: </strong>[cheerful] Surprisingly expensive!</em></p>
<p>You'll notice that Apu never actually answers the question!  How much is it?!</p>
<p>Well -- let's take what we know and try to model it!  This is actually pretty easy -- we have just 2 price conversions in the dataset, so I'll just apply a linear relationship.  Here's what you get:<br/><span></span></p>
<figure><img alt="" loading="lazy" src="/blog/img/ua/off-topic-tuesday-how-much-is-your-penny-candy/5550892-511.png"/></figure>
<p>So it looks like the Kwik-E-Mart is taking in a flat fee of $1.45 for each purchase, and then it adds a 37% surcharge on the item price as well.  Net -- penny candy would be $1.47 (after rounding) if purchased in one transaction.</p>
<p>No wonder Apu still works there.  Even though he holds a <a href="http://simpsons.wikia.com/wiki/Apu_Nahasapeemapetilon" rel="noopener" target="_blank" title="">doctorate in Computer Science from Springfield Heights Institute of Technology</a>, the sheer margins pulled in by the Kwik-E-Mart ensure that he's paid competitively!</p>
<p>-rj</p>
