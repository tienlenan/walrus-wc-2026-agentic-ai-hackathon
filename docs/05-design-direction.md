# Design Direction — The Daily Walrus

> Links: [plan](01-plan.md) · [user-flows](04-user-flows.md) · [research-notes](06-research-notes.md)
> Principle: **anti-AI-slop** — no generic dark crypto glassmorphism. Every screen = "a newspaper page".

## 1. Concept: "THE DAILY WALRUS" (classic sports tabloid)
A printed sports tabloid: screaming headlines, column grids, halftone, a "STOP PRESS" stamp. The **Gil** mascot is the newsroom's cartoonist. Every feature is expressed through a newspaper metaphor: predictions = "Predictions Desk", roast = "Gil's Verdict", sharing = "Report Card / back-page".

**Why this choice:** fun + easy to share + **doesn't clash** with dark crypto UI; the cream/teal/red palette is **close to Walrus's real colors** (teal `#37c3b0`) so it stands out yet feels "Walrus-native". A know-it-all walrus commentator is **perfectly in character set into a newspaper column**.

**Fallback:** *Walrus Arcade* (8-bit, `Press Start 2P`) — also parodies Walrus's pixel font `PP Neue Bit`; fast to produce, extremely memeable. Kept as plan B / a mini-game.

## 2. Mascot: "Gil the Walrus"
A grizzled walrus commentator, "has watched the World Cup since 1954". **Tusks = a handlebar mustache**. Wears a **reporter's hat with a PRESS card** (or commentator headphones), half-rim glasses slipping down his nose, a scarf in the theme color. Personality: deadpan, know-it-all, roasts but with affection — **never cruel**.
> Ownable thanks to the **tusk-mustache + press hat** combo, clearly distinct from Walrus's friendly "Aurora" mascot → same universe, different character.

**Set of 6 expressions (sticker sheet, 2–3px outline, flat + 1 highlight, exported as PNG/SVG with a transparent background):**
1. **Smug** — half-lidded eyes, smirk, twirling a tusk (idle/default).
2. **Roasting/cackling** — head thrown back laughing, slapping his thigh (when you guess wrong).
3. **Shocked** — bulging eyes, hat popping off, a bead of sweat (a shock result/VAR).
4. **Disappointed** — looking over his glasses, flippers crossed ("…really?").
5. **Celebrating** — both flippers raised, confetti, scarf flying (you guessed right).
6. **"I told you so"** — flipper pointing at the camera, a wink, holding a clipboard with a ✓.

## 3. Design tokens (drop-in CSS variables)
```css
:root {
  /* Surfaces */
  --paper:    #f4ecd8;  /* yellowed newsprint (bg) */
  --paper-2:  #fbf7ec;  /* white paper (surface/card) */
  --ink:      #1a1714;  /* print ink (main text) */
  --ink-soft: #57514a;  /* light ink (muted) */

  /* Brand / status */
  --teal:     #37c3b0;  /* real Walrus teal — spot color */
  --teal-deep:#0a2540;  /* deep ink blue (heading accent) */
  --red:      #c8102e;  /* tabloid red (kicker / danger) */
  --green:    #1f7a3d;  /* success / correct prediction */

  /* Lines */
  --rule:     #d8cdb4;  /* hairline column rule */
  --rule-bold:#1a1714;  /* bold newspaper-frame border */

  /* Type */
  --font-display: "Anton", Impact, sans-serif;          /* screaming headline */
  --font-masthead:"Playfair Display", Georgia, serif;   /* newspaper nameplate */
  --font-body:    "DM Sans", system-ui, sans-serif;     /* body (Walrus-native) */
  --font-mono:    "JetBrains Mono", monospace;          /* scores/odds/stats */

  /* Shape */
  --radius: 4px;        /* print → very slight corner rounding */
  --shadow-print: 2px 2px 0 var(--ink); /* "misregistered print" hard shadow */
}
```
**Google Fonts:** `Anton`, `Playfair Display`, `DM Sans`, `JetBrains Mono`.

## 4. Imagery & texture system
- **Halftone**: dot patterns for Gil's images/shadows (a newsprint feel).
- **Hairline rules** between columns; a **bold frame border** around important "boxes".
- **Masthead nameplate**: "THE DAILY WALRUS · EST. 2026 · MEMORY EDITION" + a dateline (matchweek).
- **Rotated stamps**: "STOP PRESS", "EXCLUSIVE", "GIL'S VERDICT" — rotated slightly 3–6°.
- **Faux barcode / dateline / pull-quote** to fill gaps for a newspaper feel.
- **Teal as spot ink**: grayscale background, teal as an accent (links, highlights, "ink stamp").
- Gil's image = a **halftone caricature**, placed next to the byline.

## 5. Component language
| Component | Tabloid expression |
|---|---|
| App header | **Masthead** nameplate + dateline + "today's edition" |
| Chat with Gil | **Interview column**: chat bubble = a news paragraph; the roast line = a bordered **"GIL'S VERDICT" pull-quote** |
| Placing a prediction | **"Predictions Desk"** styled as a betting slip pinned to the newspaper |
| Fixtures/results | A **scoreboard** in mono inside a frame, like the results table at the back of the paper |
| My Record / Notebook | **"Gil's Notebook"** — a notebook page, facts as cut-and-paste clippings |
| Leaderboard | A **ranking table** styled as a "standings" column |
| Before/After | **Two newspaper pages side by side**: "DAY-1 ISSUE" vs "LATEST ISSUE" |
| Empty/loading | "Gil is rummaging through his notebook…", "The newsroom is going to press…" |

## 6. "Gil's Report Card" — shareable (1080×1350) ⭐
An auto-generated image to screenshot and post with **#Walrus / #TrustTheTusk**. Layout top→bottom:
1. **Masthead bar**: "THE DAILY WALRUS · PREDICTION REPORT CARD" + dateline.
2. **Hero**: Gil (expression matching the form) on the left + a red-stamped **grade A+→F** on the right.
3. **Stat line** (mono): `PREDICTIONS 12 · CORRECT 4 · STREAK 0 · ACCURACY 33%`.
4. **The roast** (pull-quote): *"You bet on that team to win? My tusks would pick better."*
5. **Mini fixtures**: 2–3 generic balls, prediction vs reality (✔/✗).
6. **Footer**: "Powered by Walrus · stored forever, just like your losing bets" + a teal mark.
> Render with canvas/`satori`→PNG on the server, or html-to-image on the client.

## 7. World Cup 2026 iconography — DO / DON'T
Co-hosted by the **USA/Canada/Mexico**, summer 2026, **48 teams** (a big bracket fits the theme well).
**DO (safe, drawable yourself):** a generic pentagon-hexagon ball (CC0); pitch markings (center circle, penalty box) as geometry; a **bracket/knockout tree**, scoreboard, clock; generic confetti/scarves/bunting; maple leaf / cactus-sun / stars-and-stripes **as neutral geometric motifs**; boots, whistle, yellow-red cards, corner flag.
**DON'T (trademark-infringing):** ❌ **FIFA** names/crests, the **championship trophy**, the **official 2026 logo/mascot**; ❌ national-team/federation crests, **kits**, **sponsor logos**; ❌ the **official ball/typeface**; ❌ **real player names/faces** in marketing imagery (roasting in gameplay is fine, but don't ship portraits); ❌ claiming to be "official" — always make it clear this is a fan/parody app.

## 8. Accessibility & responsive
- Contrast: ink on paper passes; red/teal only for accents, not for small text on a near-matching background.
- Mobile-first: the masthead shrinks, the column grid → 1 column; the scoreboard scrolls horizontally.
- Don't rely on color to convey correct/wrong → include a ✔/✗ icon + label.
- Respect `prefers-reduced-motion` (disable confetti/heavy animation).

## 9. To-do when building the UI
- [ ] Draw/generate the **6 Gil expressions** (sticker sheet) + 1 nameplate logo.
- [ ] Build the **design tokens** (CSS vars / Tailwind theme) from §3.
- [ ] Core components: Masthead, VerdictPullQuote, Scoreboard, PredictionSlip, NotebookCard, BeforeAfter, ReportCard.
- [ ] Roast card generator (satori/canvas).
- [ ] Halftone + hard-shadow utilities.
> When entering the UI-build phase, consider running the **hallmark** skill to audit/raise quality and keep it "anti-AI-slop".
