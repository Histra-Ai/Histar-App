# 36-Week Consolidated Build Plan, v2

**Project:** AI-Driven Alternate History Sandbox
**Builder:** Solo developer with AI assistance
**Target ship:** Public paid launch at week 36
**Operating model:** Continuous soft releases to a growing alpha cohort from week 6 onward

---

## Foundational Principles

Before any week-by-week detail, six principles govern every decision across the 36 weeks. When in doubt, return to these.

**One.** Server-authoritative state from day one. No LocalStorage shortcuts. Everything the client shows is reconstructable from Postgres.

**Two.** The prompt-and-schema layer is the product. Invest in it disproportionately. Build an evaluation harness early and run it weekly.

**Three.** Ship something playable every week. No dark phases. If a Friday build is broken, Saturday is a recovery day, not a new-feature day.

**Four.** Measure before you build, then measure after you build. No feature ships without an event logged for it.

**Five.** Cost per user is a first-class metric, tracked from week one, visible on your own dashboard before it's visible to any user.

**Six.** Every system serves one of three emotional goals: *make the player care*, *make them anxious to return*, or *give them something to show someone*. Systems that don't serve one of these three get cut, regardless of how elegant they are. This is the anti-simulation principle. A feature that's mechanically correct but emotionally flat is wrong.

---

## Stage 0: Pre-Build Setup (Week 0, 3–5 days)

**Objective:** Remove every non-engineering blocker before the clock starts.

**Tasks:**
- Register business entity. Apply for Stripe, Anthropic, OpenAI production access.
- Register domain, configure email, warm sending reputation.
- Provision GitHub, Vercel, Supabase, Upstash Redis, PostHog, Sentry, task tracker.
- Publish landing page with email capture and a single sentence of intent.
- Draft and publish minimum viable legal surface before collecting emails: Privacy Policy, Terms of Use, age gate language, and contact address.
- Define work cadence: fixed hours, Sunday weekly review, end-of-stage retros.

**Exit:** Accounts provisioned, landing page live, first 10 email signups from personal network.

---

## Stage 1: Core Loop + Emotional Kernel (Weeks 1–6)

**Objective:** Prove a single human has a session they care about, want to return to, and want to tell someone about. Not "is the system working" — "does it make someone feel something."

### Week 1 — Architectural Foundations

- Next.js 14, TypeScript strict, Tailwind, Supabase auth.
- Support both guest sessions and Google OAuth from day one. Guests can start immediately; account creation upgrades and preserves progress.
- Schema: users, games, game_states, turns, nations, regions, events, moments.
- LLM abstraction layer from day one: interface accepting `{ prompt, schema, model }`, two implementations behind it (Anthropic, OpenAI).
- PostHog baseline events. Sentry on client and server.
- Single admin flag on user record; no role system.

**Exit:** Logged-in user sees empty dashboard. Foundation clean.

### Week 2 — The Turn Loop, First Pass

- Hardcoded scenario: 15 regions, 5 nations, starting stats, personality prompts.
- SVG map from hand-drawn regions file. Static.
- `POST /api/turn` endpoint: accept action, build prompt, call LLM, validate JSON schema, write deltas, return state.
- Response schema locked: `narrative`, `deltas[]`, `events[]`, `moments[]`, `nation_memory_updates{}`. Delta types enumerated and strict.
- Event logging per turn: submitted, resolved, cost in USD, latency.

**Exit:** You play a 5-turn game. It crashes once, narrative is rough, loop exists.

### Week 3 — Coherence and Continuity

- Per-nation memory field updated each turn.
- Rolling world-state summary every 5 turns for context management.
- Validation hardened: impossible deltas rejected with one auto-retry before surfacing error.
- Turn cap at 25 with forced ending.
- **Recap system**: when a player returns to a game after any gap, the first thing they see is a "since you last played" narrative summary generated from the turns between sessions. This is a retention primitive, not a UX nicety. Build it in week 3, not week 22.

**Exit:** A game can be played across multiple sessions without the player losing emotional thread.

### Week 4 — Evaluation Harness and Moment Capture

- Test suite of 10 saved game states with expected qualitative behaviors.
- Automated replay runner flags regressions.
- **Moment extraction**: the LLM response schema includes an optional `moments[]` array. Per turn, the model flags 0–3 events as "shareable moments" — a betrayal, an unlikely victory, a catastrophic loss. Each moment is a standalone artifact with a headline, a one-paragraph story, and a visual representation (map state at that moment).
- Moments stored independently of games; referenceable by permanent URL.
- Cost and latency dashboard live.
- Add alpha-era guardrails now, not later: per-turn token cap, per-user daily turn cap, and a kill switch for image generation and non-essential LLM features.

**Exit:** You have regression testing and an emergent sharing unit smaller than a full game. If epilogues fail later, moments are the fallback.

### Week 5 — The Fun Pass

- Unstructured iteration week on prompt, personalities, event generation, narrative voice.
- Daily prompt changes. Eval harness runs before every commit.
- Recruit 5 friends for silent screen-share playthroughs.
- Kill criterion applied rigorously: did they want a second game? If zero of five, stop and rethink the concept. No proceeding on momentum alone.

**Exit:** Qualitative signal that the loop is compelling — or an honest pivot.

### Week 6 — Alpha Cohort + Return Hooks

- Production URL deployed with alpha access flag.
- First 20 alpha testers invited from pre-launch list.
- Onboarding: 30-second intro, pre-selected nation, first action as placeholder text.
- **Return hooks live from day one of alpha**:
  - Email notification when an AI faction takes a significant hostile action against the player in-game (triggered by LLM-flagged "significant" events).
  - Visible "cliffhanger" at end of each turn — the narrative ends on unresolved tension, not summary.
  - Subject lines written by the LLM based on actual game events, not templates. "Vienna has been sacked. Your move." beats "Your turn is ready."
- Weekly email summarizing product changes.
- Feedback via Discord invite.

**Exit:** 20 real users playing. Return rate measurable from week 1. The emotional kernel — not just the mechanical loop — is being tested.

---

## Stage 2: Depth That Matters (Weeks 7–14)

**Objective:** Add the systems that create stories people remember, not the systems that satisfy simulation completeness. Every feature in this stage maps to one of the three emotional goals.

### Week 7 — Victory, Endings, and Why They Matter

- Per-nation auto-generated objectives based on starting situation. The objective is narrative, not numeric: "Restore Austrian honor after the humiliation of 1866" beats "Conquer 15 regions."
- Scoring dimensions: Power, Culture, Legacy, Drama.
- Drama is weighted highest in the default score. Pragmatically-played games score lower than dramatic ones. This is an editorial choice — the product rewards storytelling over optimization.
- Game-end screen: not a leaderboard, a one-sentence verdict ("You saved your dynasty but lost your soul"), then the score breakdown.

**Exit:** Endings feel like endings. Players can articulate what their game was *about*.

### Week 8 — The Epilogue and The Moment System

This is the viral artifact week. Two parallel systems, not one.

- **Full Epilogue**: 1,500-word illustrated chronicle with 4–6 generated images, map diff, key moments list, per-player legacy card. Public URL with Open Graph meta tags. Share button is the most prominent element.
- **Moment cards**: the standalone versions of week 4's moment extractions. Each is a shareable unit on its own — a single illustrated card with a headline and a paragraph. Generated continuously throughout games, not only at the end.
- Both systems feed the share funnel. Moments are the high-frequency, low-friction version. Epilogues are the high-intensity, high-identity version.
- Analytics: `epilogue_generated`, `epilogue_shared`, `moment_generated`, `moment_shared`, referrer tracking on both.
- Cost constraint: image generation is budgeted and degradable. If cost or latency spikes, fall back to text-first epilogues, map diffs, and moments without blocking sharing.

**Exit:** Every completed game produces both a chronicle and multiple standalone moments. Two paths to virality, not one.

### Week 9 — Shareable Artifact Quality Pass

- Full week on visual and narrative quality of both epilogues and moments.
- Image generation prompt engineering: consistent style, era-appropriate aesthetic, no AI-slop hallmarks.
- Narrative voice: not generic fantasy textbook — specific, opinionated, era-voiced.
- A/B test three epilogue formats and three moment formats with the alpha cohort.
- Track the metrics that matter: share rate, outbound click rate from shared URLs, signup rate from shared URLs.

**Exit:** Epilogue share rate above 15% of completed games. Moment share rate above 8% of moments generated. If not, dig deeper. This is existential.

### Week 10 — Information, Uncertainty, Anticipation

- Fog of war: own stats exact, allied approximate, enemy as rumor. Implemented at prompt layer — different nations receive different world-state views.
- Intelligence actions: spy missions, diplomatic inquiries yield partial info.
- Information-shock events: leaked memos, defectors, press leaks.
- **Anticipation mechanic**: some events don't resolve immediately. The player plants a coup attempt; it resolves 2 turns later. This creates the "I need to check what happened" energy the critic correctly flagged as missing.

**Exit:** Sessions have tension. Between-turn curiosity is measurable as return rate.

### Week 11 — Characters As Story Engines

Characters exist to create stories players tell, not to populate a database.

- Named leaders with traits, loyalty, lifespans. Each with a portrait generated once and consistent thereafter.
- Leader succession on death. The new leader is *visibly different* and the game acknowledges it in narrative.
- Ministers and generals as secondary characters with their own personalities — but only 2–3 per nation, not a full roster. Scope discipline applies.
- Character events: scandals, romances, betrayals. Weighted toward high-drama outcomes.
- **Identity continuity**: a leader's reputation (ambitious, drunkard, reformer) is generated from their actions in-game and visible on their profile. When the game ends, this becomes part of the shareable moment.

**Exit:** Post-game, a player tells you about a person by name, not a country.

### Week 12 — Stability and Internal Politics, Minimum Viable Version

The critic was half-right here. Deep faction systems are simulation bloat. Light internal politics creates story pressure. The discipline is to build the smallest version that generates drama.

- Stability score influenced by war outcomes, economic conditions, overreach.
- Revolt mechanics: low stability triggers rebellions. Rebellions are narrative events, not a new system to manage.
- One internal faction per nation with a single disposition (loyal, restless, rebellious). Not a full faction system with multiple actors and agendas.
- Internal pressure surfaces in the narrative, not in a faction management UI.

**Exit:** Empires can fall from within. The mechanic is small. The stories are large.

### Week 13 — Content Depth and Moderation Infrastructure

- Launch scenario deepened: richer lore, more events, character backstories.
- Define the preset-compatible scenario schema here so new content is authored in the format Stage 3 will use.
- One additional scenario built on that schema as a migration proof, not two. Do not expand content breadth until the content format is stable.
- **Moderation pipeline lands here, before preset editor**: keyword filter, OpenAI moderation API, LLM classifier for nuance. Report button. Admin moderation queue. Content policy drafted.
- Pre-written incident response templates for foreseeable situations.

**Exit:** Launch scenario is richer, one non-launch scenario proves the schema, and moderation exists before user-generated content exists.

### Week 14 — Alpha Milestone and Stage Retrospective

- Full alpha playtest with cohort, all Stage 2 systems active.
- Measure: session length, return rate at day 1, day 3, day 7, share rate, completion rate.
- Stage retrospective: what worked, what didn't, what changes before Stage 3.
- **First public build-in-public post**: share aggregate learnings (not metrics that embarrass). Begin building audience.

**Exit:** Evidence-backed confidence that the core product creates emotional moments, not just functional ones.

---

## Stage 3: The Sandbox (Weeks 15–22)

**Objective:** Transform a curated-scenario product into a creator-driven sandbox, with multiplayer that creates genuine social pressure.

### Week 15 — Preset Data Model

- Generalize scenario format to preset schema: regions, nations, starting conditions, world context, simulation rules, victory conditions.
- Migrate hardcoded scenarios to presets. Immutable versioning — edits create new versions.
- Preset visibility: private, unlisted, public.

**Exit:** Existing scenarios run from database. Nothing changes for players.

### Week 16 — Preset Editor, Foundation

- Map editor: draw and edit region polygons on canvas.
- Nation editor: name, color, stats, personality prompt, leader character.
- World context editor: large free-text field.
- Victory condition editor: free-text with optional structured triggers.
- Save and preview.

**Exit:** A new preset can be created from scratch in under 90 minutes. Rough but complete.

### Week 17 — Preset Editor, Usability

- Templates: start-from-existing to lower activation barrier.
- Validation: block publishing of broken presets.
- Preview mode: play without publishing.
- UX legibility for non-developers. This is harder than it sounds.

**Exit:** A non-technical alpha tester creates a playable preset unassisted. If they can't, iterate more before proceeding — do not advance on schedule alone.

### Week 18 — Preset Editor, Polish + Discovery

The critic was right to warn about this phase. I'm giving it a third week.

- UX polish pass: tooltips, empty states, preset wizard for first-time creators.
- Preset browser: search, filter, sort by plays, completions, ratings.
- Preset detail page: description, stats, sample epilogues, moment previews, comments.
- Rating and review system.
- Featured presets curated weekly by you.
- Creator analytics: plays, completions, average game length, ratings, share rates of their presets' outputs.

**Exit:** A new user finds an interesting preset within 30 seconds of landing on browse. Creators can see whether their work is resonating.

### Week 19 — Async Multiplayer, Infrastructure

- Shared game state with multiple player nations.
- Lobby creation, invite links, join flow.
- Turn deadline configuration: 24h or 72h only. No real-time in V1.
- Turn submission state per player; resolution triggers on all-submitted or deadline-hit.
- Supabase Realtime for turn-resolved notifications.
- Dropout handling: miss two deadlines → AI takeover → player can resume.

**Exit:** Two players complete an async game across days without corruption.

### Week 20 — Multiplayer Social Layer and Commitment Loops

This week was underweighted in v1. Upgrading based on accurate criticism.

- **Player-to-player chat channels**: 1-on-1 and group. Moderation applied.
- Replace freeform player-to-NPC diplomacy with structured diplomatic actions plus authored LLM replies. No open-ended back-and-forth chat with NPCs in V1.
- **Commitment loops as explicit mechanics**:
  - Personalized nudges framed as from *other players*, not the system. "Sarah is waiting on your orders. She played her turn 18 hours ago."
  - Visible reputation: "turns played / turns missed" on your player profile. Completing games with specific people builds shared history.
  - Game-over recaps include a "who carried the game" acknowledgment — social credit for showing up.
  - Ghosting penalty: if you drop from more than 3 games, you're soft-locked out of new multiplayer for a week. Protects the commons.
- Email and web push notifications for turn-resolved and chat events.
- **Narrative-powered notifications**: subject lines describe in-game events, generated by LLM.

**Exit:** A 4-player game completes with active diplomacy and measurable social pressure.

### Week 21 — Multiplayer Cost Testing and Optimization

- Stress test: 6-player games with complex actions. Measure latency and cost.
- Target: under $1.00 per multiplayer turn. Below that, pricing model works. Above that, optimize or pivot.
- Optimize: prompt caching, turn summarization, schema tightening.
- DB load testing: 100 concurrent games, 500 concurrent users.
- Rate limits: actions per user per hour, preset creation per day, API calls per user per minute.

**Exit:** System holds at acceptable cost. Stage 4 pricing is informed by this week's data, not guessed at.

### Week 22 — Retention Polish (Not Invention)

Retention primitives landed in Stage 1. This week refines them.

- Refine "since you last played" recap with richer generation.
- Streak mechanics (light, opt-in): badges for finishing games, creating presets, winning multiplayer.
- Weekly "Featured Preset" email with narrative hooks.
- Public "Hall of Chronicles": curated gallery of standout epilogues and moments, refreshed weekly.
- Player profile page: completed games, created presets, character gallery, achievements.
- Daily events: "today's scenario" with shared seed so players compare outcomes.

**Exit:** Day 7 and day 30 return rates measurable and improving against Stage 1 baseline.

---

## Stage 4: Commercial Readiness (Weeks 23–30)

**Objective:** Transform from free alpha to sustainable paid service. Onboarding, payments, unit economics.

### Week 23 — Onboarding Flow

- New-user funnel: homepage → sample epilogue + 3 sample moments → "Play" → tutorial preset.
- Tutorial preset: 10 turns, pre-selected nation, action hints, first-time narrative tuning.
- Soft signup at turn 5 is a polish pass on the guest-to-account flow introduced in Week 1, not a foundational auth change.
- Empty states and copy everywhere.
- Landing page: sample epilogue, three standout moments as carousel, 30-second explainer, single signup CTA.

**Exit:** 4 of 5 strangers complete the tutorial unaided.

### Week 24 — Mobile

- Vertical-stacked layout.
- Touch-first input, pinch-to-zoom map, large tap targets.
- Web push via PWA flow.
- QA on real low-end Android and iPhone on slow wifi.
- Mobile-specific onboarding tuning.

**Exit:** Full games playable on phone, on spotty wifi, without frustration.

### Week 25 — Performance and Perceived Latency

- Anthropic prompt caching, target 70% cache hit rate on turn resolution.
- Streaming LLM responses: narrative appears word-by-word.
- Optimistic UI: input locks on submit, progress narrative during resolution.
- Edge caching, cold-start mitigation.

**Exit:** Perceived latency under 10 seconds. Real 95th percentile under 30 seconds.

### Week 26 — Stripe and Subscriptions

- Stripe Checkout, Customer Portal, Stripe Tax.
- Two tiers: Free, Paid ($12/mo baseline, feature-flagged).
- Free: 3 games/month, public presets only.
- Paid: unlimited games, private presets, preset creation, preset publishing.
- Creator tier deferred. Comp your best 10 creators manually until Stage 5+.

**Exit:** End-to-end payments tested across all five paths (signup, pay, use, cancel, refund).

### Week 27 — Cost Controls

- Per-user cost tracking in Upstash Redis.
- Soft throttle at tier limit with friendly message.
- Hard pause at 3x tier with admin alert.
- Per-game cost cap.
- Per-turn input token cap with graceful truncation.
- Admin dashboard: cost per user, flagged accounts, cohort margins.

**Exit:** Stress test confirms a $100/day burn attempt is caught at $40 with friendly throttling.

### Week 28 — Support and Operations

- Support email with Discord channel triage.
- FAQ and help docs.
- Static status page.
- Incident runbook: LLM outage, moderation incident, payment outage.
- Backup verification: restore from Supabase into test project.
- Staging environment for pre-production deploys.

**Exit:** An incident could occur and you'd execute a documented response, not panic.

### Week 29 — Moderation Hardening

- Content scanning on preset submission, edits, epilogue generation, moment generation, player chat.
- Auto-takedown for high-confidence violations.
- Manual review queue with a realistic target response window for a solo operator; publish business-hours expectations instead of promising an always-on 4-hour SLA.
- Transparent content policy with appeal mechanism.
- Pre-written statements for foreseeable incident categories.

**Exit:** End-to-end moderation incident can be handled consistently with published response expectations and prepared communication.

### Week 30 — Legal and Compliance

- Formalize and lawyer-review the policies already in use: ToS, Privacy Policy, Content Policy, DMCA process.
- Creator agreement for future revenue share.
- Data export and deletion tooling (GDPR/CCPA).
- Age gate at signup (COPPA: 13+).
- Stripe Tax verified for active jurisdictions.
- Business accounting setup.
- Lawyer review of critical documents. Budget $2–5k.

**Exit:** Business is legally operable.

---

## Stage 5: Public Launch (Weeks 31–36)

**Objective:** Transition from alpha to public with deliberate distribution and clear PMF signal.

### Week 31 — Final Polish

- UX polish across onboarding, game, end screen, epilogue, moment cards, preset browser.
- Bug triage: critical and high-severity issues closed.
- Accessibility audit.
- Loading and error states reviewed.
- Marketing site finalized.

**Exit:** Nothing visibly broken. Product looks intentional.

### Week 32 — Seed Content and Creator Recruitment

- 15 high-quality seed presets authored by you.
- 10 creators from alpha onboarded, each publishing one preset.
- Co-design 3 presets with history creators.
- Curated "Launch Collection."
- All seed content moderation-reviewed and tested.

**Exit:** Launch-day users find 25+ quality presets immediately.

### Week 33 — Distribution Priming

- Continue build-in-public cadence — 30 weeks of posts by this point.
- Waitlist campaign: target 1,500 emails.
- 3 detailed Reddit posts showing interesting moments/epilogues, not promotional.
- Press kit: screenshots, GIFs, moment-card examples, fact sheet, founder bio.
- Launch trailer videos (60s, 30s, 15s).
- Outreach to 30 press and creator contacts.

**Exit:** Target communities already know you. Launch day isn't a cold open.

### Week 34 — Soft Launch to Waitlist

- Waitlist gets early access 7 days before public.
- Monitor funnel: signup → first game → completion → subscription.
- Rapid iteration on friction.
- Capacity and cost verified under real load.
- Testimonials, shared moments, and user interviews captured.

**Exit:** 500+ waitlist users onboarded. Funnel validated. Critical launch bugs fixed.

### Week 35 — Public Launch

- Day 1: Reddit variants per subreddit, Show HN, Twitter thread, waitlist blast, Discord announcement.
- Day 2–3: ProductHunt at 12:01 PT with coordinated push.
- Day 4–7: respond to every comment, email, DM. Same-day fixes.
- Pre-written follow-up content for hours 4/8/12/24/72.
- Personal DM to first 100 signups: "What almost made you close the tab?"

**Exit:** Launch executed. Channel data collected. Cohort active.

### Week 36 — Measure, Decide, Plan Next

- Full metrics review: activation, completion, conversion, retention, CAC per channel, projected LTV, cost per paying user, margin.
- Cohort analysis: alpha vs. waitlist vs. launch.
- Retrospective: what the roadmap got right and wrong.
- Decision document: business, pivot, or sunset.
- 90-day post-launch plan built on real data.

**Exit:** Evidence-backed answer to "what do the next 12 weeks look like?"

---

## Deferred Beyond Week 36

- Live Summit real-time multiplayer
- Voice chat
- Native mobile apps
- Creator revenue share infrastructure (run manually until scale justifies)
- Dynasty persistence across games
- Ghost Council advisor AI
- Prediction markets and spectator mode
- Localization beyond English
- Custom fine-tuned models
- B2B sales

---

## What Would Make This Best, Not Just Good

Five ideas beyond the core plan. Each is a force multiplier, not a feature. Consider them after week 36, or pull one forward if capacity allows.

**1. The Chronicle as canonical artifact.** Every public moment and epilogue is a permanent URL with beautiful typography, printable layout, and a "publish to the Chronicle" option that adds it to a browsable public archive of the best player stories across the entire game. The Chronicle becomes SEO-valuable content, a recruitment surface, and a cultural artifact. Think of it as the New York Times of your alt-history universe, authored entirely by players.

**2. Creator-as-character.** When a creator makes a preset, their name is embedded in the narrative voice of that world. The AI references "as chronicled by [creator]" in flavor text. Creators become characters in their own worlds. This creates status, identity, and a reason for creators to care beyond rev share.

**3. The Retroactive Canon.** When enough players play a preset, the *outcomes* players generate start influencing the preset itself. If 60% of games of a WWI preset end with a specific turn of events, that becomes "the canonical timeline" shown to new players as flavor. The world grows from play. No dev work needed — it's emergent.

**4. Asymmetric playable roles.** Most players play nations. Some presets allow playing a faction, a secret society, a CEO, a journalist, a revolutionary. The scope of "what you can play as" expands through the creator ecosystem, not through dev work. Ship the primitives in week 17; let creators discover the rest.

**5. The Weekly Chronicle Newsletter.** You personally curate and write a weekly email highlighting the most interesting player stories, moments, and presets. This is work, but it's the highest-leverage work possible. You become the voice of the community, the arbiter of taste, the reason the product feels alive. Nothing costs less and builds more loyalty than a great weekly email from the founder. Start this in week 6 with alpha. By week 36 it's a 30-issue archive that's its own marketing asset.

The sixth idea, which I think might be the biggest:

**6. Design the product so the best way to understand it is to read one of its outputs, not a landing page.** A shared moment card on Twitter should be self-explanatory. A shared epilogue should make a stranger want to play. The product's marketing is its own output. Every design decision — moment format, epilogue voice, Chronicle layout — should serve this. If your epilogue can stand alone as a piece of writing someone would read for fun, the entire acquisition model changes. You're not marketing a game. You're publishing stories that happen to come from a game.

That's the difference between "niche toy" and "something people obsess over."
