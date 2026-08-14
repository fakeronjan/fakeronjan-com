---
layout: post.njk
title: "Fake Basketball"
date: 2026-05-13
tags: [about-me]
description: a story of how I made my first computer game
---

# {{ title }}

<p><em>[Originally posted April 30th at </em><a href="https://fakeronjan.com/fakebasketball" rel="noopener" target="_blank"><em>fakeronjan.com/fakebasketball]</em></a></p>
<p>I made a game! Well, I vibe-coded a game.</p>
<p>It’s a text-based basketball simulation game called <em>Fake Basketball Commissioner</em> and I made it because, honestly, it’s the game I always wanted to play.</p>
<p>In sports video games throughout my life, I’ve been fascinated with simulating the actual sports part to see what happens in the long-term meta-narrative of the league. I want to see Hall of Fame career arcs, dynasties that rise and fall, rule changes that impact strategy, the coaching carousel, even owners that start up competitive leagues.</p>
<p>Every other sports game - including the one I spent 2 years of my career working on, leading the data &amp; analytics team - focuses on the actual sports gameplay, which makes sense. That’s where the market is.</p>
<p>But it’s not where I am. It’s not the game I always wanted to play. So I went ahead and did it myself (but also with a lot of help). It’s no masterpiece, but it’s what I want.</p>
<p>Click the logo below to play <em>Fake Basketball Commissioner</em>. And keep scrolling to read the story of how it came to be!</p>
<figure><img alt="" loading="lazy" src="/blog/img/fr/fake-basketball/screenshot-2b2026-04-28-2bat-2b12.25.31-pm.webp"/></figure>
<p>It all started as an experiment a few weeks ago to get more familiar with Claude. (Given that I work in data &amp; analytics, this is a must at this stage for my career.)</p>
<p>Back in high school, I created a fake basketball game and league simulator in Visual Basic. I told the whole story <a href="/blog/fr-so-this-is-me/">here</a>.</p>
<p>On April 12th, I decided I was going to use Claude to re-create that simulator. I carved out the whole weekend to get going. It was done in 15 minutes.</p>
<p>You hit “go!” on a python script and, boom, you get a simulation of multiple seasons of a fake basketball league. Champions are crowned, dynasties rise and fall, a whole league’s history is created on a dime.</p>
<p>Well, that was fun, let’s keep going! Soon, the simulator included league expansion and team relocation mechanics, rule changes that push the league into offense-heavy or defense-first eras, and more.</p>
<p>By the end of the weekend, the simulator is generating a webpage, nicely formatted, with sections on league history, championship droughts, playoff rivalries, and more.</p>
<p>On Monday the 14th I decide to make this interactive. Instead of a simulation that you just hit “play” and watch, what if you had choice and agency? What if you could make decisions that shape the league <em>without</em> having direct control of teams, owners, coaches, players, or fans?</p>
<p>And thus <em>Fake Basketball Commissioner </em>was born. This is not a game about chasing a “win state”. There will always be a champion, MVP, coach of the year, excited fan base every season. Your role is to make decisions when they come to you and see how it impacts everything else.</p>
<p>Building the game was a lot of fun. I would work out design ideas with both Claude and ChatGPT, then have Claude write the codebase, then upload the codebase into ChatGPT so they could run parallel simulations. It was incredibly iterative, particularly with me running out of Claude tokens several times a day. But we kept going.</p>
<p>We started adding interlocking systems:</p>
<ul><li><p class="" style="white-space:pre-wrap;">A player model that follows realistic career arcs and has player archetypes with core motivation and preferred offensive and defensive zones</p></li><li><p class="" style="white-space:pre-wrap;">A team model that has three named players and an unnamed bench</p></li><li><p class="" style="white-space:pre-wrap;">A coach model with several archetypes that boost player performance based on the coach’s strengths (star whisperer, offensive mastermind, etc.)</p></li><li><p class="" style="white-space:pre-wrap;">An owner model that incorporates budgets, competency, loyalty to the league, and core motivation</p></li><li><p class="" style="white-space:pre-wrap;">A sim engine that ran every single possession of the season considering player, team, coach, and owner strengths alongside individual form and fatigue</p></li></ul>
<p>We introduced more interesting narrative decisions:</p>
<ul><li><p class="" style="white-space:pre-wrap;">Owners can break off and form their own league if you make too many decisions that they don’t agree with</p></li><li><p class="" style="white-space:pre-wrap;">Generational LeBron / Wemby type players show up every few years and can lead to a tank-off by weaker teams to try to get them</p></li><li><p class="" style="white-space:pre-wrap;">The commissioner can rig playoff series and draft lotteries to try to favor teams that are good for the league</p></li></ul>
<p>Finally, we ended up making it a browser game that can save your progress.</p>
<p>I’m at a point today, April 30th, where I am at a comfortable stopping point. Consider this the v1.0 release date, the day that <em>Fake Basketball Commissioner</em> was officially real.</p>
<p>I know this game isn’t for everyone. It may not be for anyone besides me. And I’m okay with that. If nothing else, this was one of the most fun projects of my life.</p>
<p>Thank you for reading.</p>
