# Handoff — Keith's study site

Written 25 Aug 2026, updated later the same day. Current as of the end of that session.

**Read this first.** Two things have to be re-uploaded at the start of any new
session, because the sandbox resets and nothing survives it:

1. **`study.zip`** — the built site. Needed to modify any app.
2. **The curriculum PDFs** for whatever is being built — needed for new content.
   Nothing is ever written from memory; see Standing preferences.

**The Sherlock build is done** — see The seven apps. Nothing about it needs
re-uploading: the passage and every question round-trip out of the built
`index.html`, which is where `test_reading.js` reads them from.

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
├── history/g5-maya-ch2/index.html      CKHG Maya Ch2  (Maya Science and Daily Life)
├── reading/sherlock-speckled-1/index.html  The Speckled Band, pages 1–13
├── vocabulary/ww6-lesson1-test/index.html  Word List 1, unit-test format
├── science/g5-matter-ch1/index.html    CKSci Matter Ch1
├── science/g5-matter-ch2/index.html    CKSci Matter Ch2 (Applying Properties)
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

## The eight apps

### History — "The Hieroglyphic Stairway" (CKHG G5 U2 Ch1)
Five practice sets × seven formats. Built earlier; see the older handoff notes in the repo
history if needed. 615 KB because three photos are base64'd in.

### History — Chapter 2, "Maya Science and Daily Life"

Built from the Student Reader pp. 10–19 and the Chapter 2 Teacher Guide.
Three sets of eight, one per section of the chapter: *Wisdom in the Sky*
(pp. 10–14), *How They Lived* (pp. 14–17), *Where Did Everybody Go?*
(pp. 18–19). Not parallel forms — each covers different material — so the
card list with badges, not the chip strip.

**Teacher's Guide findings:**
- The Big Question is *"Why is the 365-day solar calendar employed by the Maya
  particularly impressive?"*
- Core Vocabulary is exactly five: **astronomy, leap year, equinox, "initiation
  ceremony", priest**. Every one gets its own question, worded from the TG's own
  definition. Verified by a coverage check in the build tests.
- The TG's four Primary Focus Objectives are achievements, how religious belief
  drove the science, specific discoveries, and the vocabulary — the three
  sets map onto those.
- TG question types are labelled LITERAL / INFERENTIAL / EVALUATIVE / CHALLENGE.
  The literal and inferential ones are mirrored directly; several answers are
  the TG's own model answers.

**The Big Question is built, not written.** Every set ends with six evidence
tiles; he picks the three that actually answer it. The three correct ones are
exactly the three points the TG's Check for Understanding asks students to cite.
The three distractors are all **true statements from the reader** that simply
do not answer this question — pok-ta-pok, mud-and-grass huts, the crops —
so the skill being tested is telling evidence from mere fact, which a blank
text box never tests. Get it right and the full sentence assembles itself, with
the numbers underneath: Maya 365.2420, modern 365.2422, **17 seconds apart per
year** — about one day's drift in five thousand years. That number is the
thing worth him remembering.

There is also a **sequencing question** (put the Maya path from childhood to
adulthood back in order) using up/down buttons rather than drag, since drag is
the fiddliest thing on a phone and this needed no dragging to work.

### Science — Chapter 2, "Applying Properties of Matter"

**A correction to this document.** Earlier notes said CKSci Chapter 2 was the
mystery powder investigation and would suit an evidence-and-conclusions format.
Half right. The *Student Reader* chapter is **the design process** — a rusty
swing chain, criteria, constraints, and five ordered steps. The powders belong
to the Teacher Guide's three-day hands-on investigation in the same lesson. The
app covers both, because the lesson does.

SR Chapter 2 = **TG Lesson 3**, the same one-lesson offset as Chapter 1.

- Big Question: *"How can I use properties as evidence to identify matter?"*
- **Core Vocabulary is exactly two: design process, solution.** Same shape as
  Chapter 1's two. Both are tested.
- Four sets of six: *Five Steps, In Order* (the design process), *The Swing
  Chain* (criteria vs constraints), *Five White Powders* (reading evidence),
  *Be the Engineer* (capstone). Dragon sits on m4.

**The ordering question Keith asked for lives here** and is not a gimmick —
the design process is a genuine five-step procedure with its own diagram in the
reader: Define the Problem → Plan a Solution → Make a Model → Test the
Model → Evaluate and Redesign. Up/down buttons, not drag.

**The lab bench.** Questions that need evidence display the Teacher Guide's own
results table — what each of the five powders does in water and in vinegar —
and he reasons from it rather than recalling it. The table is one object (`EV`)
used by every bench question, so it cannot drift out of sync with the answers.

**The best teaching moment in the chapter, and the app is built around it:**
salt and sugar behave *identically* in water — both just dissolve. So one test
cannot tell them apart. In vinegar, salt shows no change and sugar partly
dissolves. Two consecutive questions walk him through exactly that: first
"you have done no other test, what can you say?" (answer: it is either salt or
sugar), then the vinegar result settles it. That pair is the Big Question in
miniature and it is worth more than any definition question.

**The capstone is the lesson's own design problem:** a hole in a wall. Plaster
absorbs water and hardens, so plaster wins. Then a claim-and-evidence build —
pick the two observations that support the claim, from five real results. The
distractors are all true observations *about other samples*, so the thing being
tested is that evidence has to be about the sample you are claiming about.

### Reading — "The Speckled Band", pages 1–13

Three sets of eight, one per section of the story, cut where the story actually
breaks rather than at equal page counts:

| Set | Pages | Ends on |
|---|---|---|
| The client at dawn | 1–5 | "I am all attention, madam." |
| The stepfather | 5–9 | Holmes half-opens his eyes and glances at his visitor |
| The night Julia died | 10–13 | "Such was the dreadful end of my beloved sister." |

**The passage is in the app.** Each section carries its own text, verbatim,
paragraph by paragraph, with the book's page number in the margin. Reachable
from the set card, from the results screen, and — the point of it — from inside
a question.

**Two rungs of help, deliberately in this order.** The first miss offers **"Find
it in the passage"**, which opens the passage scrolled to the paragraph that
settles the question, highlighted. Only the *second* miss offers "Show me the
answer". Locating evidence in a text is the skill; being shown it is not. The
target paragraph is not hand-numbered — the build finds which paragraph contains
the excerpt and fails if it is not exactly one, so the highlight cannot drift out
of sync with the question.

**Teacher's Guide findings:**

- The guide has fifteen study questions for this story. **Only four fall inside
  page 13** — its questions 1–4. All five of its Questions for Further Discussion
  need the ending (one cites page 44). Those four are mirrored directly and
  labelled in the app; twelve of the twenty-four items carry a guide label.
- Its vocabulary list for the story is fifteen words, of which **exactly five
  occur in pages 1–13**: *deduction* (p2), *aristocrat* and *pauper* (p6),
  *hereditary* (p7), *writhe* (p12). All five are tested, one item each, worded
  from the guide's own definitions, and a build check fails if any is missed or
  doubled. The other ten are later in the story.
- *pauper* is glossed by the reader itself in the page-6 margin, so that item
  uses the book's own wording rather than the guide's.
- The guide's Appendix has an **Investigator** role — track the clues, then sort
  the real ones from the red herrings. That is where the two evidence-picking
  questions come from.

**The three questions worth more than the other twenty-one:**

1. **The dogcart** (set 1, capstone). Six things Watson notices about the woman;
   pick the two Holmes actually reasons *from*. The four distractors are all true
   and all noticed — her veil, her grey hair, her shivering, the hour she
   arrived. Noticing something and using it as evidence are different things, and
   a blank text box never tests that.
2. **What a wedding costs him** (set 2, capstone). The mother's money is Dr.
   Roylott's while the sisters live with him; each marriage takes an annual sum
   back out of it. Six true facts, pick the two that are about money. This is the
   motive, and it is reachable from page 6 alone — the guide only asks about it
   at its question 8, long past where the class has read.
3. **The order of that night** (set 3). Most people, asked to recall it, put the
   whistle first. The book does not: the **scream** comes first, then Helen is out
   of bed and opening her door *before* she hears the whistle, and the clang a few
   moments after that. Up/down buttons, not drag.

Set 3's capstone stops exactly where the class stopped: a whistle, a metallic
clang, and three words nobody can explain. That is what Holmes has, and he has
not yet seen the house.

**Scope is enforced, not just intended.** `node _build/test_reading.js` asserts
that every citation and every passage paragraph sits inside pages 1–13, and that
the text never leaks *ventilator*, *bell-rope* or *swamp adder* from later in the
story. It also re-checks the excerpt-to-paragraph mapping, the four-option shape,
and — the bug that shipped in vocabulary — what a flawless run actually scores.
Answer positions are shuffled at render, and the test draws 20,000 of them to
confirm A/B/C/D come up evenly with no long runs.

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

### Vocabulary — Word List 1, tests

The same fifteen words as the sheet, built for mastery rather than one sitting.
A pool of **90 questions** — all 26 meanings asked three different ways, plus 12
antonyms — dealt into four tests:

| Test | Items | What it is |
|---|---|---|
| Form A | 24 | Every word once. First meanings. |
| Form B | 24 | Every word once. Second meaning where a word has one, and each word asked a different way than in A. |
| Form C | 24 | Every word once. Third meanings where they exist; questions rotate again. |
| Comprehensive Final | 35 | All 26 meanings, one each, plus 9 antonyms. |

**The forms are genuinely disjoint** — a build check fails if any two share a
single identical question — and every word is asked three different ways across
A, B and C, which the test prints word by word. Between them the three forms
reach all 26 meanings; `appeal` has four, so its fourth is handed to a form
deliberately rather than left to the sampler.

**Four ways of asking**, so the same meaning can come back wearing a different
coat: *choose the meaning* (word + part of speech → definition), *choose the
word* (definition → word), *fill in the blank* (a sentence per meaning — all
26 written, not one per word), and *antonyms*.

**Answer positions are dealt, not shuffled.** Shuffling each item alone will
hand him a run of five Cs sooner or later and he will spot it. Instead each
sitting deals a balanced deck — as near a quarter per letter as the count
allows — reshuffled until no three in a row match, and each item's options are
then rotated so its answer lands on the slot it drew. Because 24 and 35 are not
multiples of four, the deal is also rotated so a different letter takes the
short straw each time. The test replays that algorithm over 3,000 sittings and
checks the spread.

**The end of a test is the point of it.** The results screen leads with actions,
not a score:

1. **Put right the N I missed** — replays only the missed meanings, each asked a
   *different way* than the one he got wrong. Every pool item carries the indices
   of the other ways to ask about the same meaning. This runs through
   `MC.begin({partial:true})`, so it cannot overwrite a best score and it earns
   the CORRECTIONS tier rather than a hollow 100%.
2. **Go through all N answers** — the full review, each with the meaning it
   turns on and where that meaning came from.
3. **Try a different form** — names the next one.
4. **Take this one again** — new order, new answer positions.

Nothing is marked until Finish. He can skip, flag for review, and jump about
with a numbered navigator. A clock runs, visible, and never stops him. Finishing
with blanks or flags still open raises a confirm that says how many and offers
to jump to the first. `hud:false`, so no hearts drain mid-test; misses still
reach the shared log through `MC.note()`, and since hearts never move a clean
sheet leaves halves at 20 — the dragon condition. It sits on Form B.

**Provenance is on every item.** 52 of the 90 are the book's own wording, and
their distractors are other definitions from the same list, so nothing there was
invented. The other 38 say so on the review screen: Wordly Wise prints no
antonym pairs for this list, so those prompts are ours and the fill-in sentences
are written — but every answer *choice* in both is one of the fifteen words.
The suite asserts the 52/38 split.

**The bug worth carrying to List 2.** The first draft asked "appeal (verb) →
pick the meaning", which is unanswerable: appeal has two verb senses and both
were on offer. Same trap for *lofty* (three adjectives), *clasp*, *contribute*
and *unveil*. Two fixes: definition items never draw a distractor from the
asked word, and the reverse form ("here is a meaning → pick the word") sidesteps
it entirely. Both are asserted.

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
- **Every chapter title on the hub is now real**, taken from the readers' own
  tables of contents — History's seven, Science's six, and Reading's five
  Core Classics story titles. No "Chapter 4" placeholders remain. Reading now
  correctly shows five stories, not four.
- **Per-chapter progress column.** Every row shows the cleared count on top
  (`3 / 7`, or CLEARED in green) and the best score beneath. Fixed width so the
  numbers line up as chapters are added; "soon" rows read "not built".
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

## Knowing *which* level was cleared

Three layers: which subject → which chapter (the hub's `1 / 7 · best 100%`
column) → which level inside it.

That last layer took four passes:

1. Each app kept scores in a bare `const best = {}` that **forgot everything on
   reload**, so badges were blank every time. They now seed from `MC.bests()`.
2. The badge said `best X%`, never whether the level was *done*. It now leads
   with CLEARED at 75%+.
3. It still was not **scannable** — the badge sat in the bottom-right corner of
   a tall card, so seven levels meant seven corners. Moved to the top-right,
   level with each card's eyebrow, and the card carries a coloured ring: green
   cleared, amber attempted, none untouched.
4. **History had no picker at all.** It scored and stored five practice sets
   separately but dealt one at *random* and only offered "Climb a new set" to
   advance in sequence — so he could not choose a set, could not return to a
   weak one, and could not see which were cleared. Fixed with a chip strip
   above the stairway.

### MC.picker — use this for any new subject

```js
MC.picker(hostEl, [{id:"set0", label:"1"}, ...], currentId, onPick)
```

Renders a strip of chips, each coloured from `MC.bests()`: green cleared, amber
attempted, plain untouched, with the best score under the label and a blue ring
on the current one. Chips are 44px minimum so they are a real tap target.
Re-call it to repaint after a score lands — history calls `paintPicker()` on
boot, on set change, and at the end of `renderSummary()`.

**Any new app with several parallel levels should call this rather than rolling
its own**, so they all look and behave the same. Apps whose levels are a
difficulty ladder (spelling, science) use the card list with badges instead;
apps with one activity (vocabulary) need neither.

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
  bursts a bad sprite, shakes, and takes half a heart. Both well under a second.
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

`node _build/test_reading.js` — 34 assertions on the Sherlock app's content; see
its section above.

`node _build/test_theme.js` — 22 assertions covering heart arithmetic, the
floor-at-zero guarantee, the tool ladder (including "under 75% awards nothing"
and "replaying a cleared level awards nothing"), loot bands, the boss trigger,
persistence across a simulated reload, and a corrupt-localStorage fallback. Every
script block in all four built apps was also re-parsed after injection.

## Uploading — this went wrong three times, then went right

GitHub's uploader preserves folder structure only if you **drag folders**, and Windows lets
you browse a zip like a folder, which does *not* work. The failures were:

1. A stray `index (2).html` from Downloads got uploaded instead of the real files — Chrome
   renames duplicates and Keith had several loose `index.html` files.
2. Dragging from inside the zip preview window rather than an extracted folder.

It has since worked twice in a row using the sequence below. The file-list
preview before committing is the checkpoint that catches everything — on the
one occasion a file was missing (`HANDOFF.md`), the preview showed 36 of 37 and
it was caught before the commit.

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
2. **Reading — the rest of The Speckled Band.** Pages 1–13 are built. The
   story runs to page 44, and the Teacher's Guide's remaining eleven study
   questions and ten remaining vocabulary words are all waiting in the range
   the class has not reached. Build the next stretch the same way — cut at
   the story's own seams, not at equal page counts. The reader PDF is needed
   again for new pages; the existing app is editable without it.

   The guide also carries material that only works **once the whole story is
   read**, and it is worth saving rather than losing: the **six rules of a good
   detective story** (significant crime, memorable detective, worthy criminal,
   clues shared with the reader, suspects introduced early, reasonable
   solution), which the guide turns into a writing assignment; **Watson as a
   foil**; and grammar exercises drawn from this story's own sentences —
   subjects and verbs, nouns, prepositional phrases. The nouns passage is
   Holmes's closing explanation, so it is out of range for now.

3. **Next week's spelling list** — same seven-level structure, swap the words.
4. **CKHG Maya Chapters 3–7.** Chapter 2 is built. Chapters 3–4 are Aztec,
   5–6 Inca, 7 the end of both empires — the Student Reader text for all of
   them is in the same PDF already used for Chapter 2. After those, a
   cumulative Unit 2 review matching the real 25 MC + 10 matching format.
5. **CKSci Chapters 3–6.** Chapter 2 is built. Remaining: Too Small to Be Seen,
   How Matter Changes, Matter Can Change Chemically, The Language of Chemistry.
   Remember the SR-chapter-to-TG-lesson offset is **+1** (SR Ch2 = TG Lesson 3).
6. **Saxon Course 1** remediation, and a long-promised **CTP 5 format-familiarisation sampler**.
7. **Hub chapter titles are all real now** — nothing left to fill in there.
8. **The hotbar fills after eight clears** — see the pacing section. Worth doing
   before he notices it has stopped rewarding him.

---

## Attribution

CKHG and CKSci passages are reproduced under CC BY-NC-SA 4.0. The required notice is in each
app's footer: *Based on an original work of the Core Knowledge Foundation (coreknowledge.org).
This does not imply that the Core Knowledge Foundation endorses this work.* Keep it, and note
share-alike binds derivative work. The Speckled Band passage is the Core Classics
edition, which carries the same CC BY-NC-SA 4.0 licence, so it is quoted directly and at
length; the same footer notice covers it. Wordly Wise and the spelling list are reproduced
for personal study use only.

The Minecraft sprites are Keith's own uploads. The repo is public, so they're publicly
readable — he's aware.
