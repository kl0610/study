# Handoff — Keith's study site

Written 25 Aug 2026. Updated after the theme build and the hub rebuild.

---

## What this is

Keith builds practice materials for his 5th-grade son (Myles) across five subjects. They
live as self-contained HTML apps in one GitHub Pages repo, one link for the kid.

**Live:** `https://kl0610.github.io/study/` — the site is called **Study Craft**.
The repo folder stays `study`, so no links change.
**Repo:** `github.com/kl0610/study` — public, personal account, deliberately not the fundvue org.
Pages is configured: Deploy from a branch → `main` → `/(root)`. Don't touch that again.

```
study/
├── index.html                          hub — Study Craft title screen, gear, subjects
├── history/g5-maya-ch1/index.html      CKHG Maya Ch1  (615 KB, has 3 embedded photos)
├── science/g5-matter-ch1/index.html    CKSci Matter Ch1
├── spelling/list2/index.html           Spelling List 2
├── vocabulary/ww6-lesson1/index.html   Wordly Wise Book 6 List 1
├── assets/                             Minecraft sprites (wired up)
└── _build/                             theme source + build script + tests
```

An older `kl0610/maya-practice` repo is still published. Leave it — links may be out there.
`kl0610/study-game` is an abandoned Vite/React attempt; it stalled because Claude Code
can't read PDFs and started inventing curriculum content. Retire it, but check `SPEC.md`
first for the miss-tracking design.

---

## Standing preferences — apply to everything

- **Never use Myles's name** in question scenarios. Ana, Jamal, Priya.
- **Build from the Teacher's Guide**, not just the student reader. Respect what the TG says
  is and isn't assessed at grade level.
- **Balanced, unpatterned answer keys.** He notices runs. (Now moot in most apps — options
  shuffle at render, so there's no fixed key to spot.)
- **No context-inference vocabulary formats.** Don't ask "which sentence uses X to mean Y."
  Test each sense separately against the TG's own wording. *This rule is about vocabulary
  testing specifically — inference questions about a story are fine and expected for Reading.*
- **Multi-select is a known stumbling block** — he stops at the first correct answer.
- **Diagnose before remediating.** Missed questions are often format confusion.
- **Question counts proportional to the material.** Don't default to 25–30 items.
- Keith tracks misses between sessions and expects that to drive the next materials.

---

## The four apps

### History — "The Hieroglyphic Stairway" (CKHG G5 U2 Ch1)
Five practice sets × seven formats. Built earlier; see the older handoff notes in the repo
history if needed. 615 KB because three photos are base64'd in.

### Science — "The Property Bench" (CKSci G5 Investigating Matter Ch1)
Four missions × six questions. Formats: illustrated multiple choice, tap-the-instrument,
sort-into-bins, select-all, vocabulary match, and a four-sample mystery capstone.
All artwork is hand-drawn inline SVG — no photos, hence 75 KB vs the Maya app's 615 KB.

Wrong answer → drawer auto-opens leading with the verbatim reader excerpt, then a mapped
Crash Course Kids video, then the full page for context, then a pinned "Got it — let me
try again". Auto-opens on the *first* miss only.

**Teacher's Guide findings worth keeping:**
- SR Chapter 1 = TG **Lesson 2**, not Lesson 1. Lesson 1 is six hands-on stations.
- Core Vocabulary for the lesson is only two words: *matter* and *property*.
- Density is explicitly **not assessed**; students are **not** expected to distinguish
  mass from weight. Nothing in the app tests either.
- **Conflict:** the Unit Assessment's own answer key counts *density* as a valid way to
  identify a rock, contradicting the Lesson 2 boundary, and excludes *thermal conductivity*
  even though the reader teaches it. The app leaves both out and builds that item from the
  four unambiguous properties. If the teacher grades from the printed key, that item may differ.
- Both real Chapter 1 assessment items are "circle all the correct answers" — so unlike
  CKHG, multi-select here *is* test-format rehearsal.

Videos (all verified, all built on 5-PS1-3):
`ELchwUIlWa8` What's Matter · `ZZYnERZe3Cg` Hunting for Properties ·
`YCQXDegwnoE` Wood Water and Properties · `nlSemv2fLN8` What's My Property

### Vocabulary — Wordly Wise Book 6, Word List 1
All 26 meanings on **one sheet**, not split into rounds (Keith asked for this explicitly).
Drag a word onto its meaning; the part of speech is **stated** on each definition as a
coloured tag, not selected by the student.

- Chip tray is sticky at the top, alphabetical so duplicates sit together:
  `appeal ×4, clasp ×3, lofty ×3, contribute ×2, exhibit ×2, ferry ×2, unveil ×2` + 8 singles.
- Drag-and-drop via **pointer events**, not HTML5 DnD — the native API silently fails on
  touch. Tap-to-place also works.
- **Partial checking**: button reads "Check the 9 I've done". Unfinished lines aren't judged.
  A correct partial check costs nothing; only a wrong check burns a try.
- Feedback appears **in the pinned bottom bar**, never scrolls the page. A "FIND IT" button
  jumps to the topmost wrong line, and that's the only scroll in the app.
- Optional hint marks wrong lines red, caps the sheet at 25%.

### Spelling — List 2, double consonants
Seven levels. Rebuilt several times to Keith's spec; the current shape is:

| # | Name | Prompt | Input |
|---|---|---|---|
| 1 | Warm up | meaning | syllable-chunked boxes, first letter of **each chunk**, wide gaps |
| 2 | Definitions | meaning | syllable boxes, first letter of the word |
| 3 | In a sentence | sentence with a blank | syllable boxes, first letter |
| 4 | Step up | meaning + sentence | **free typing**, hears the word |
| 5 | Test day | nothing | free typing, hears the word |
| 6 | Challenge | nothing | free typing, **hears the definition** |
| 7 | Challenge 2 | the word | writes a sentence |

- Free-typing levels **must not leak word length or letter positions** in feedback. That's
  deliberate and was checked; don't regress it.
- Speech via `speechSynthesis`, rate 0.75. Auto-plays on each new word.
- Tiles **never wrap** — `fitTiles()` measures available width and scales tile size, height,
  font and both gaps. Verified 300–1024px; worst case is 14px tiles for *questionnaire*.
- Results split correct/missed, then offer: **spell the missed ones again** (reruns the level
  with just those), **review and match them** (shown only when 2+ missed), rerun, level up.
- **Word chart** — all 12 words whole (no syllable breaks), doubles in pink, grouped as
  Two pairs / One pair / No pairs. Reachable from home and every results screen.
- Challenge 2 can only check mechanics: word actually used (accepts -s -es -ed -ing -ly -ies),
  6+ words, capitalised, punctuated, not a copy of the example. It says so out loud and asks
  the student to self-judge whether it makes sense. **Keith chose to keep it a self-check**
  rather than wire up an API. Don't quietly "improve" this into a fake validator.

---

## The hub — "Study Craft"

Rebuilt as a Minecraft title screen. The name is the one thing worth a second
opinion: **Study Craft**, tagline "Fifth grade". It's the natural Minecraft-style
compound and works as a wordmark. Alternatives if it doesn't land: *Craft & Study*,
*Grade 5 Craft*, *The Study Realm*, *Overworld Fifth Grade*. Changing it is one
line — the `<h1 class="wordmark">` and the `<title>`.

- **Title screen.** Tiled dirt field with a grass crown, drawn entirely in CSS
  gradients — no image asset, so it costs nothing. The wordmark uses the
  four-layer offset shadow that gives the Minecraft logo its bevel. Grey for
  STUDY, grass green for CRAFT.
- **Splash text.** Yellow, angled, bobbing, picked at random from fifteen lines
  and re-rollable by tapping it. This is the bit a ten-year-old will poke at
  first. Add or edit lines in the `SPLASH` array.
- **Your gear.** The real 9-slot hotbar showing the tools he's actually earned,
  with a live count and an XP bar across all 17 activities. Hovering or tapping
  a filled slot names the tool. Hidden detail: the bar animates its width on
  load, so returning after clearing something is visibly rewarding.
- **Per-chapter progress column.** Every row carries a right-aligned column with
  the cleared count on top (`3 / 7`, or CLEARED in green when all of them are)
  and the best score beneath (`best 92%`). It is a fixed-width column rather
  than a floating badge so the numbers line up down the list as chapters are
  added. "Soon" rows carry the same column reading "not built", which keeps the
  alignment honest. On screens under 430px the START/AGAIN chevron is hidden
  — the whole row is the tap target anyway — so the score column always fits.
  This is driven by the `ids` array on each chapter in `SUBJECTS` — those are
  the real activity ids the apps record (`history:set0–set4`, `science:m1–m4`,
  `spelling:l1–l7`, `vocabulary:sheet`). **Add ids when you add a chapter** or
  it will always look uncleared.
- **Worth another look.** The miss-tracking payoff. Words he's missed most,
  ordered, capped at twelve. Item-id style keys (`m1-3`) are filtered out so
  only real words show. The panel hides itself entirely when there's nothing.
- **Start my gear over** in the footer, behind a confirm, for a clean slate.

Subjects are now keyed to ores rather than arbitrary hues — history gold,
science diamond, reading emerald, spelling redstone, vocabulary amethyst, math
copper. The ore name shows under each subject's count.

## Mobile

Audited rather than assumed. What is in place:

- All five pages ship `viewport-fit=cover`. **History was missing it**, which
  silently resolved every `env(safe-area-inset-*)` to 0 — so the HUD sat under
  the home indicator on a notched iPhone. Patched in `build_theme.py`.
- Every text input is **16px or larger** (`.sentin` 16px, `.freein` 27px, the
  hidden tile input 16px). Anything smaller makes iOS zoom the page on focus and
  not zoom back, which is the single most common mobile-form annoyance.
- **The hub hotbar overflowed at every phone width.** It subtracted 52px of
  chrome when the real figure is 66 (wrap padding 16×2, gear padding 14×2,
  border 3×2), so the ninth slot pushed past the panel edge on anything under
  ~500px. Now subtracts 70 with a 22px floor; verified 320–660px.
- The in-app HUD sizes its own slots from the viewport and was already correct;
  the spelling tiles have `fitTiles()`, verified 300–1024px.
- Vocabulary drag-and-drop uses **pointer events, not the HTML5 drag API**,
  which silently fails on touch. Tap-to-place also works. No app uses
  `dataTransfer`.
- No fixed widths above 380px anywhere, so nothing forces horizontal scroll.

Worth re-checking whenever a new app is added: input font sizes, whether any
9-across row does its own arithmetic, and that `viewport-fit=cover` is present.

## The hotbar runs out — read this before adding chapters

Counted properly, the current ladder does not last the year.

| | activities |
|---|---|
| today (4 chapters) | 17 |
| projected by June | ~350 |

Tools 1–8 unlock on the 1st through 8th clear, and tool 9 on spelling
Challenge 2. **Slot 8 fills on the eighth clear — about 2% of the year's
work.** He has one clear now, so the arsenal is full in roughly a week and then
shows nothing new until June. The XP bar keeps moving (it divides by the summed
`ids`, so it grows as chapters are added) but the hotbar itself is done.

Three ways forward, cheapest first:

1. **Armour.** Minecraft's four-piece set — helmet, chestplate, leggings,
   boots — rendered as a second row above the hotbar. Canonical, obviously
   collectable, and only **four new sprites** (64×64, transparent, named
   `armour-1`…`armour-4`). Buys four more milestones and looks right.
2. **Stretch the ladder.** Award tools at 1, 3, 6, 10, 15, 21, 28, 36 clears
   instead of every clear. No art needed, one line in `unlocked()`. Makes the
   existing nine last into the spring rather than the first week.
3. **Trophies for firsts**, not counts — first dragon in each subject, first
   perfect week of spelling. Needs art per trophy and more bookkeeping.

**Recommended: do 2 now, and 1 when you have a spare art generation.** Stretching
the ladder costs nothing and fixes the pacing immediately; armour then extends
it past thirty-six clears. Do not add slots to the hotbar — nine is the
Minecraft hotbar and breaking it makes the whole thing look wrong.

## Build pipeline

Each app is assembled from pieces by a small Python string-replace, then written as one file:

```
data js  ─┐
art js   ─┼─> template.html  (has /*__DATA__*/ /*__ART__*/ /*__WORDS__*/ placeholders)
          └─> study/<subject>/<chapter>/index.html
```

The Minecraft theme is a second, separate pass over the already-built files —
see `_build/README.md`. It now lives in the repo, so unlike the content pipeline
it doesn't need anything re-uploaded.

**The sandbox resets between sessions.** To modify an app you need the built `index.html`
re-uploaded; to build new chapter content you need the curriculum PDFs re-uploaded.

Verification habits that have actually caught bugs — keep them:
- Assert reader excerpts are **verbatim substrings** of their passage. A subsequence check
  tolerant of sidebar interleaving is needed for CKHG readers (the Big Question sidebar
  splices word-by-word into the running text under `pdftotext -layout`; use `-raw` for
  two-column boxes).
- Simulate thousands of perfect play-throughs and confirm every item grades clean.
- Watch for **falsy-zero bugs** — `!chip.at` where `at` can legitimately be slot 0. That one
  shipped a visible bug in the vocabulary app.
- Watch **CSS specificity** — `#typed{opacity:0}` hid a second input that shared the id.

---

## Minecraft theme — DONE

All four apps are themed and every sprite is in. Built as **one source injected into all four**, per the
earlier decision: `_build/mc.css` + `_build/mc.js`, stitched in by
`_build/build_theme.py`. See `_build/README.md` for the seams, the engine
contract, and how to rebuild. **Don't hand-edit the theme inside an app** — four
copies drift.

What shipped, against the agreed design:

- **10 hearts**, half a heart per miss, refilled at every level start. **No death
  and no game over** — hearts only shrink the end-of-level loot (10 hearts → 4
  loot mobs, 7.5+ → 3, 4+ → 2, below → 1). A kid who is stuck never hits a wall;
  at zero hearts he still finishes and still opens a chest.
- **9-slot hotbar that only ever fills.** Tools 1–8 unlock by *count of
  activities cleared at 75%+ anywhere on the site*, so any order works —
  1st clear gives the wooden pickaxe, 2nd the stone, and so on. **Tool 9, the
  elytra, only ever comes from spelling Challenge 2**, the one level where he
  writes his own sentences. Worth checking he's happy with that rule; it was the
  one part of the design not pinned down.
- Right answer bursts a win sprite (cycles allay → axolotl → fox → bee); wrong
  bursts a bad sprite, shakes, and takes half a heart. **320px on desktop**,
  scaled down on phones and capped against viewport *height* as well as width.
  The first version was pinned at 128px on every screen. Source sprites are
  128px, so 2.5× relies on `image-rendering:pixelated` reading as chunky
  rather than blurry. Bursts hold at full size for about half their life before
  fading (~1.3s win, ~1.15s miss), and a new burst removes any previous one so
  fast answering cannot stack them.
- Results: chest-closed nudges until tapped, then opens to the loot, a NEW
  banner if a tool was earned, and the dragon on a flawless run.
- **The ender dragon falls on any level played perfectly** — 100% *and* every
  heart still full. Both halves matter: the score proves he got everything, the
  hearts prove he never needed a second go. It is not tied to particular "boss"
  levels any more, so it is reachable from spelling level 1 as easily as from
  Challenge 2, and it repeats every time he earns it. One line in `mc.js`
  (`boss: pct >= 100 && halves === 20`) — the `{boss:true}` flags still passed
  at the call sites are now ignored and harmless.
- **localStorage is live** — one key, `mc.study.v1`, shared across all four apps
  since they're one origin. This is the miss-tracking that's been on the list
  since the Maya build: every wrong answer is recorded per app per item.

Art notes from the review were all applied: `heart-empty` gets a CSS glow so an
empty row reads as sockets waiting; tools render at 69% inside the slot with
`tool-9` held back to 62%; `bad-2` and `bad-4` are scaled up slightly so wrong
answers carry even weight. `chest-open` is left uncorrected for now — the lid
swinging toward the viewer *should* be wider. Nudge it in CSS only if it lurches.

**Sprites are referenced by relative path (`../../assets/`), not inlined.** One
shared 264 KB copy, browser-cached across all four apps, instead of ~1.2 MB of
base64 spread over four files. The trade-off is that the apps are no longer
single-file offline. If offline matters more, `python3 build_theme.py --inline`
flips it — it's a one-line switch, and the apps grow by roughly 360 KB each.

`boss-defeated.png` is **in** — a slain ender dragon, 256×168, 22-colour palette,
transparent background. The source Keith supplied was a 474×340 lossy render on a
solid cyan field with ~16,000 colours; it was snapped back to its native 79×57
pixel grid (6px blocks), the cyan keyed out, the palette flattened to 22, and
scaled 4× nearest-neighbour. If a replacement is ever dropped in, keep the same
recipe — a straight cyan colour-key on the raw file leaves fringing, because the
compression noise smears the background across dozens of near-cyan shades.

The CSS banner fallback is still in `mc.css` (`.mc-bossfall`) and the build still
detects the file's absence, so nothing breaks if the sprite is ever removed.

**Bug found and fixed while wiring this up:** the vocabulary app only increments
`tries` on a *wrong* check, so a flawless sheet ended on `tries === 0` and fell
through the scoring chain to the final `:25`. **A perfect sheet was scoring 25%.**
It would never have shown CLEARED on the hub and could never have woken the
dragon. Floored at 1 in `build_theme.py`. Worth knowing the same shape of bug
could exist in a future app: check what a zero-mistake run actually scores.

### Verification

`node _build/test_theme.js` — 22 assertions covering heart arithmetic, the
floor-at-zero guarantee, the tool ladder (including "under 75% awards nothing"
and "replaying a cleared level awards nothing"), loot bands, the boss trigger,
persistence across a simulated reload, and a corrupt-localStorage fallback. Every
script block in all four built apps was also re-parsed after injection.

## Uploading — this went wrong three times, read this

GitHub's uploader preserves folder structure only if you **drag folders**, and Windows lets
you browse a zip like a folder, which does *not* work. The failures were:

1. A stray `index (2).html` from Downloads got uploaded instead of the real files — Chrome
   renames duplicates and Keith had several loose `index.html` files.
2. Dragging from inside the zip preview window rather than an extracted folder.

**The reliable sequence:** download `study.zip` → **Extract all** (not double-click-browse) →
open the extracted `study` folder → select the items *inside* it → drag them together onto
the upload area → **check the file list shows the full paths** (`spelling/list2/index.html`)
before committing. That preview is the checkpoint that catches everything.

Never drag the `study` folder itself into a repo named `study` — you get `study/study/`.

---

## Next up

1. **Watch how he actually uses the hub.** The gear panel and "worth another
   look" are new and untested on a real ten-year-old. The open question is
   whether the tool ladder motivates or whether he beelines past it.
2. **Reading — Sherlock Holmes.** Keith's class started it; he was going to check the cover.
   *Which edition matters a lot:* the original Conan Doyle canon is public domain in the US
   (last stories cleared in 2023), so passages can be quoted freely. An adapted/abridged
   school edition is under copyright and can't be reproduced. Hub already has a Reading
   placeholder with 4 empty slots.
3. **Next week's spelling list** — same seven-level structure, swap the words.
4. **CKSci Chapter 2** (mystery powder) — better as applied evidence-and-conclusions than a quiz.
5. **CKHG Maya Chapters 2–7**, then a cumulative Unit 2 review matching the real
   25 MC + 10 matching assessment format.
6. **Saxon Course 1** remediation, and a long-promised **CTP 5 format-familiarisation sampler**.
7. Hub still has placeholder titles for History chapters 3–7 — need the CKHG table of contents.

---

## Attribution

CKHG and CKSci passages are reproduced under CC BY-NC-SA 4.0. The required notice is in each
app's footer: *Based on an original work of the Core Knowledge Foundation (coreknowledge.org).
This does not imply that the Core Knowledge Foundation endorses this work.* Keep it, and note
share-alike binds derivative work. Wordly Wise and the spelling list are reproduced for
personal study use only.

The Minecraft sprites are Keith's own uploads. The repo is public, so they're publicly
readable — he's aware.
