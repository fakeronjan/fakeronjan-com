---
layout: post.njk
title: "So this is me"
date: 2024-01-31
tags: [about-me]
description: "a story about the nerdiest thing I’ve ever done"
---

# {{ title }}

<p>My friend Mike posted this in a group chat recently:</p>
<figure><img alt="" loading="lazy" src="/blog/img/fr/so-this-is-me/sports.png"/><figcaption>Source: https://xkcd.com/904/</figcaption></figure>
<p>I mean, it’s true. That’s basically what the entire sports commentary industry has always been. And while aspects of sports commentary have devolved into a cringey “take economy” where commentators yell at each other to get attention, we’ve also seen the rise of high quality analytics-based sports commentary in recent years that seem almost deliberately targeted against the things I love most in the world.</p>
<p>So look, I love sports analysis. I love the narratives, I love the statistics, I love the well-researched debates, I love how pointless it is at the end of the day, I love all of it. I always have. Probably too much.</p>
<p>That xkcd comic got me reflecting on my own engagement with sports analysis over the years and the different ways that it has manifested. Since sharing is caring, I’m going to tell you all about it.</p>
<p>Warning: it’s about to get real nerdy in here.</p>
<p><br/><strong>Level 1: analyzing live sports</strong></p>
<p>I first started writing about NFL football in middle school for our school newspaper, <em>The Flyer</em>. I kept going and built on that in college, writing an NFL opinion column for <em>The Tartan</em>. That led to me starting my <a href="/blog/fr-useless-analysis-from-uselessanalysiscom/"><span style="text-decoration:underline"><em>Useless Analysis</em> website</span></a> which kept me busy for a few years. And that led me to create, automate, and publish <a href="https://fakeronjan.com/nba" rel="noopener" target="_blank"><span style="text-decoration:underline">NBA</span></a> and <a href="https://fakeronjan.com/nfl" rel="noopener" target="_blank"><span style="text-decoration:underline">NFL</span></a> power rankings.</p>
<p>So far, so good. I think I’m coming off reasonably normal at this stage. Let’s go a level deeper.</p>
<p><br/><strong>Level 2: analyzing video game sports</strong></p>
<p>Let’s be clear - this isn’t analyzing esports at a competitive or professional level. This is analyzing <em>my own</em> video game experience and statistics. And I did this in two different ways.</p>
<p>First, there’s watching a sports game play itself or having it simulate entire seasons.</p>
<p>I first recall doing this in <em>Tecmo Super NBA Basketball</em>, which I incidentally feel is one of the most underrated sports video games of all time, overshadowed by its contemporaries <em>NBA Jam</em> and <em>Tecmo Super Bowl</em>. I’d simulate a full season and look back at what happened, then do it all over again and see what changed. And I loved watching that game play itself thanks to its <a href="https://www.youtube.com/watch?v=fbzerdQVRWA" rel="noopener" target="_blank"><span style="text-decoration:underline">hilarious gameplay music</span></a> and its absolutely stacked roster, which included so many classic legends including Magic Johnson, Larry Bird, and Michael Jordan.</p>
<p>I’d keep this up in future years with the <em>NBA 2K</em> franchise as a “what if scenario” simulator. What if Michael Jordan cloned himself to play against a Jordan-less Dream Team? What if we had an exhibition between the tallest stars and the smallest stars? <a href="/blog/fr-nba-2k-quaransimulation/"><span style="text-decoration:underline">What if the best team in each franchise’s history faced off against each other in a super league?</span></a> That last one may have kept me sane during the early COVID stretch when the NBA was on hiatus.</p>
<p>This is already pretty nerdy, but I didn’t sadly stop there. The second way I’d analyze sports video games was by <em>playing</em> against myself.</p>
<p>I remember first doing this in classic Super NES baseball video games like <em>Super Baseball Simulator 1.000</em> and <em>Ken Griffey Jr. Presents Major League Baseball</em>, where I’d use both controllers and pitch, bat, field, and run bases for both teams at the same time. I was damn good at it and did this for literally hundreds of games, and then I’d track and analyze the stats.</p>
<p>I kept this behavior up in future years, expanding into football games such as the <em>Madden</em> series, <em>ESPN NFL 2K5, </em>and <em>All Pro Football 2K8</em> as well as the <em>FIFA</em> soccer series.</p>
<p>I know at this stage I’m already losing the room, and I haven’t even reached the final level. Brace yourself for …</p>
<p><br/><strong>Level 3: the nerdiest story ever told</strong></p>
<p>The summer after 10th grade we took a family vacation to California to take a look at colleges.</p>
<p>At this stage, both the NBA and NFL were out of season, so there were no real sports to watch. And I didn’t have access to my Super NES or Nintendo 64, both of which were stuck at home.</p>
<p>What was a nerd to do? I created fake basketball.</p>
<p>In 10th grade I took a Visual Basic course, so I decided that summer vacation to apply what I learned at school in order to create my own basketball simulator.</p>
<p>I started with a model that would simulate a single game. I’d set up two teams, and each team would get 100 possessions per game on which they could score 0, 1, 2, or 3 points.</p>
<p>My first model simply randomly chose between 0, 1, 2, or 3 for each possession for each team and then added it up, but that resulted in an average score of 150, much higher than the real NBA.</p>
<p>I wanted scores that were a bit higher than the NBA of that era, but generally still realistic: high scores around 125 and low scores around 100. Enter the “team strength” variable.</p>
<p>In my second model, I let each team have an inherent “team strength” value that ranged between 3.0 and 3.5. For each possession, I took a random decimal number and multiplied it by each team’s strength and then rounded it down to the nearest whole number.</p>
<p>With this method, possessions can still be worth 0, 1, 2, or 3 points, but now the distribution is weighted towards 0, 1, and 2, driving scores down a bit, and teams can now be inherently better than others, creating the potential for winning streaks and upsets.</p>
<p>Not only did this approach work well, but it also led to an average score of 100 points for a 3.0 strength team and an average of 125 points for a 3.5 strength team. Success!</p>
<p>Now that my scoring engine was working, it was time to take the next step. I had to create a fake basketball league, complete with team names and Microsoft Paint logos. I don’t remember how many teams were in the Ronjan Basketball Association, but I can tell you that two of them were called the Denver Blizzard and the Norfolk Nice Folks.</p>
<figure><img alt="" loading="lazy" src="/blog/img/fr/so-this-is-me/img_0467.jpeg"/><figcaption>Update 2/1/2024: My friend Matt generated this logo for me using DALL-E. Thank you, Matt!</figcaption></figure>
<p>Now that I had a game engine and a league, I programmed a full schedule for a single season. I don’t quite remember how many games each team played, but I know that I set up a regular season and playoffs complete with elimination series.</p>
<p>Once I had the schedule, I made my final tweak. I wanted teams to rise and fall over time, so I needed their team strength variables to change over time as well. Enter the team strength adjustment. After every win, a team’s strength would increase (capped at 3.5) and after every loss, a team’s strength would decrease (floored at 3.0).</p>
<p>In the end, I actually did a pretty good job of emulating the NBA. Across seasons, dynasties would emerge, they’d be challenged, and new title contenders would displace them. I also remember creating a narrative that one team, after several losing seasons, relocated to New Jersey. Yikes.</p>
<p>I simulated something like 20 seasons, automating the whole process just so I could read the box scores and write season recaps for this fake league.</p>
<p>And that’s where I’ll leave you, if you’ve made it this far. Literally using a weighted random number generator in order to do sports commentary. We have come full circle. I am sorry. I warned you.</p>
<p><br/>So this is me. This has always been me. It’s what I do, it’s what I love, and nothing can change that.</p>
<p>I suppose I’m at my best when I can combine sports, video games, and analytics. Maybe that can be my life someday.</p>
<figure><img alt="" loading="lazy" src="/blog/img/fr/so-this-is-me/1309294.jpg"/></figure>
