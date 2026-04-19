# 36-Week Consolidated Build Plan, v3.5 (Balanced)

**Project:** AI-Driven Alternate History Sandbox  
**Builder:** Solo developer with AI assistance  
**Target ship:** Public paid launch only if the core loop earns it  
**Operating model:** Prove the loop first, but keep enough structure that the build does not collapse into chaos

---

## Foundational Principles

Before any week-by-week detail, six principles govern every decision across the plan.

**One.** The product is the turn loop. Everything else is support.

**Two.** One provider path first. Add fallback or abstraction only when there is a concrete need.

**Three.** Ship something playable every week. If the build is broken, fix it before adding features.

**Four.** Use the cheapest tool that answers the current question. Database events and logs beat dashboards. Manual ops beat automation until volume appears.

**Five.** If a system does not make the player care, want to return, or want to share, cut it.

**Six.** Defer platform work. No marketplace, creator economy, deep moderation, or multiplayer layer until single-player retention is real.

---

## Stage 0: Build Setup (Week 0, 1-3 days)

**Objective:** Set up only what is required to start building.

**Tasks:**
- Create GitHub repo.
- Create Vercel account and connect GitHub.
- Create Supabase project.
- Create OpenAI access, plus optional OpenRouter fallback if needed.
- Create a simple task board.
- Add `.gitignore`, `.env.example`, and local `.env.local`.

**Optional, not blocking Week 1:**
- Domain
- Landing page
- Email capture
- Legal pages
- Analytics and error tracking services

**Exit:** Repo works, secrets are stored safely, and Week 1 can begin immediately.

---

## Stage 1: Prove The Core Loop (Weeks 1-6)

**Objective:** Prove that one person can play a short session, care about the outcome, and want another turn.

### Week 1 - First Foundation

- Scaffold Next.js with TypeScript and Tailwind.
- Set up Supabase database.
- Choose one auth approach only:
  - simplest option: guest or single local dev user
  - second option: one real auth path if you want real accounts early
- Create the minimum schema: `games`, `turns`, `game_states`.
- Build one server route that sends one prompt to one model and stores one response.
- Add basic event logging in the database or console: request count, latency, token/cost estimate, failures.

**Exit:** A local build exists, the app runs, and one server-side LLM call works end to end.

### Week 2 - First Playable Turn Loop

- Hardcode one scenario.
- Use a static map or even a non-map view if that is faster.
- Implement `POST /api/turn`.
- Lock one strict response schema:
  - `narrative`
  - `deltas`
  - `events`
- Apply deltas and persist the new game state.

**Exit:** You can play 3-5 turns in one game, even if it is ugly.

### Week 3 - Continuity

- Add world summary compaction every few turns.
- Add nation memory or equivalent continuity context.
- Add basic validation for impossible outputs.
- Add a short "since you last played" recap.
- Add a forced game end after a fixed turn cap.

**Exit:** Returning to a saved game still feels coherent.

### Week 4 - Cheap Evaluation

- Save 5-10 representative game states.
- Build one replay script or manual eval harness.
- Track only:
  - did the schema parse
  - did the turn complete
  - cost
  - latency
- Add lightweight moment capture for standout turns.
- Add simple kill switches for expensive features.

**Exit:** You can detect obvious regressions and save memorable turns without building a whole observability stack.

### Week 5 - Fun Pass

- Spend the whole week iterating on prompts, structure, personalities, and action format.
- Run live playtests with 3-5 friends.
- Ask only:
  - did they finish a session
  - did they want another turn
  - what did they remember

**Exit:** Either the loop starts feeling alive, or you admit it is not there yet.

### Week 6 - Tiny Alpha

- Put the build on a live URL.
- Invite 5-10 testers manually.
- Add the simplest onboarding possible.
- Add one return hook only:
  - recap on return
  - or one email nudge
  - or one unresolved cliffhanger
- Collect feedback manually in Discord or a form.

**Exit:** Real people play the game and you can tell whether they come back.

---

## Stage 2: Add Only What Increases Retention (Weeks 7-12)

**Objective:** Strengthen the emotional loop without turning the product into a platform.

### Week 7 - Endings

- Add game objectives.
- Add a game-end verdict.
- Add lightweight scoring if useful.

**Exit:** A finished run feels like it was about something.

### Week 8 - Suspense

- Add delayed-resolution actions.
- Add uncertainty and partial information where it improves tension.
- Add stronger end-of-turn cliffhangers.

**Exit:** Players feel curiosity between sessions.

### Week 9 - Simple Shareable Output

- Build one shareable artifact only:
  - plain text chronicle
  - or a simple end-of-game recap page
- No generated images yet.
- No A/B tests.
- No growth analytics obsession.

**Exit:** A player can send someone one link or one block of text and it makes sense.

### Week 10 - Characters, But Cheap

- Add named leaders.
- Add succession.
- Add a small number of dramatic character events.
- No portraits unless the rest of the loop is already strong.

**Exit:** Players remember at least one person, not just statistics.

### Week 11 - Internal Pressure

- Add one simple stability variable.
- Add rebellions or internal crises as narrative events.
- Keep internal politics out of dedicated UI.

**Exit:** Collapse from within becomes possible without creating a subgame.

### Week 12 - Decision Gate

- Review:
  - completion rate
  - replay desire
  - return behavior
  - memorable moments from testers
- Decide whether to:
  - continue
  - simplify further
  - pivot

**Exit:** You have evidence that the game is working or not.

---

## Stage 3: Productize The Winner, Not The Dream (Weeks 13-20)

**Objective:** Only after the core loop works, improve usability, content, and reliability enough for a wider alpha.

### Week 13 - Better Content

- Deepen the launch scenario.
- Add more event variety.
- Improve narrative voice.

**Exit:** The same scenario stays interesting longer.

### Week 14 - Reliability Pass

- Harden validation.
- Improve retries and failure handling.
- Add basic admin tools for inspecting a broken game.
- Improve internal logging for broken turns and failed generations.

**Exit:** Fewer broken sessions, faster debugging.

### Week 15 - Better Onboarding

- Improve the first-session flow.
- Add action examples.
- Make the first 3 turns easier to understand.

**Exit:** New players can start without hand-holding.

### Week 16 - Better Sharing

- Improve the recap/chronicle presentation.
- Add Open Graph metadata.
- Add a cleaner public end-state page.

**Exit:** Shared output is legible and attractive.

### Week 17 - Second Scenario, Only If Earned

- Add one more scenario only if Stage 2 proved the engine works.
- Reuse the same structure, do not build a scenario editor.

**Exit:** The engine works on more than one setup.

### Week 18 - Lightweight Analytics And Error Tracking

- If real users justify it, add PostHog.
- If not, keep using database events and logs.
- Do not add Sentry yet.

**Exit:** Instrumentation exists because it is needed, not because it is fashionable.

### Week 19 - Pricing And Cost Reality Check

- Measure average cost per completed game.
- Add caps and safeguards.
- Decide if paid launch is even financially sane.

**Exit:** You know whether the product can support itself.

### Week 20 - Wider Alpha

- Increase the cohort.
- Run a sharper feedback loop.
- Fix the most common drop-off points.

**Exit:** A wider alpha can use the product without direct supervision.

---

## Stage 4: Optional Expansion, Only If Metrics Earn It (Weeks 21-28)

**Objective:** Explore one major expansion path, not all of them.

Pick only one track:

### Track A - More Game Depth

- More scenarios
- Better diplomacy
- Better internal politics
- Stronger endings and shareable recaps

### Track B - UGC Lite

- Simple scenario templating
- Internal creator tools for you first
- No public marketplace
- No ratings, comments, or creator analytics yet

### Track C - Multiplayer Prototype

- Async multiplayer for 2 players only
- No chat at first
- No reputation system
- No ghosting penalties

**Rule:** If the chosen track does not improve retention or conversion, stop expanding it.

**Exit:** One promising expansion path is validated.

---

## Stage 5: Commercial Readiness, But Only For A Working Product (Weeks 29-36)

**Objective:** Turn the product into a business only if usage justifies the effort.

### Week 29 - Payments

- Add Stripe.
- Add one free tier and one paid tier.
- Keep pricing simple.

### Week 30 - Basic Ops

- Add support email.
- Add a tiny FAQ.
- Add backup checks.

### Week 31 - Lightweight Policies

- Publish the minimum policies actually needed for launch.

### Week 32 - Launch Content

- Create a small set of polished scenarios or starting states.

### Week 33 - Soft Launch Prep

- Clean landing page.
- Clear product explanation.
- Prepare a few good shared examples.

### Week 34 - Soft Launch

- Invite waitlist and friends-of-friends.
- Watch behavior closely.

### Week 35 - Public Launch

- Launch only if the soft launch metrics are not embarrassing.

### Week 36 - Review

- Decide:
  - continue
  - double down
  - pivot
  - sunset

**Exit:** You have a real answer, not just momentum.

---

## Deferred Until The Product Earns It

- Deep LLM provider abstraction
- PostHog before usage exists
- Sentry
- Generated images in epilogues
- Multi-scenario platform and preset browser
- Public preset marketplace
- Ratings, reviews, and comments
- Creator analytics
- Full moderation pipeline
- Async multiplayer social layer
- Player chat
- NPC freeform diplomacy chat
- Reputation and ghosting systems
- Native mobile apps
- Creator revenue share

---

## The Real Question

The plan succeeds if by Week 6-12 players say some version of:

"I want one more turn."

If that sentence is not true, the rest of the roadmap is decoration.
