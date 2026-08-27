# Handoff — Keith's study site

Written 25 Aug 2026. Everything here is current as of the end of that session.

---

## What this is

Keith builds practice materials for his 5th-grade son (Myles) across five subjects. They
live as self-contained HTML apps in one GitHub Pages repo, one link for the kid.

**Live:** `https://kl0610.github.io/study/`
**Repo:** `github.com/kl0610/study` — public, personal account, deliberately not the fundvue org.
Pages is configured: Deploy from a branch → `main` → `/(root)`. Don't touch that again.

```
study/
├── index.html                          hub — collapsible subject list
├── history/g5-maya-ch1/index.html      CKHG Maya Ch1  (615 KB, has 3 embedded photos)
├── science/g5-matter-ch1/index.html    CKSci Matter Ch1
├── spelling/list2/index.html           Spelling List 2
├── vocabulary/ww6-lesson1/index.html   Wordly Wise Book 6 List 1
└── assets/                             Minecraft sprites (new, not yet wired up)
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

## Build pipeline

Each app is assembled from pieces by a small Python string-replace, then written as one file:

```
data js  ─┐
art js   ─┼─> template.html  (has /*__DATA__*/ /*__ART__*/ /*__WORDS__*/ placeholders)
          └─> study/<subject>/<chapter>/index.html
```

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

## Minecraft theme — IN PROGRESS, this is where we stopped

Keith wants a Minecraft skin across all four apps to keep Myles engaged. Design agreed:

- **10 hearts**, bottom-left. Half a heart per miss. **No death, no game over** — running low
  only shrinks the end-of-level loot. A kid who's stuck must never hit a wall. Hearts refill
  each level.
- **9-slot hotbar** that **only ever fills** — nothing is taken away once earned.
  tool-1 wooden pickaxe → 2 stone → 3 iron → 4 diamond → 5 sword → 6 torch → 7 shield →
  8 bow → 9 elytra (Challenge 2 cleared).
- Right answer: a win sprite bursts in and scales up. Wrong: a bad sprite, short screen
  shake, half a heart. Both under a second — this fires 26 times on a vocabulary sheet.
- Results: chest-closed → chest-open reveal. 100% on the final challenge → boss-defeated.
- **localStorage agreed** — the arsenal persists across sessions, and this finally enables
  the miss-tracking that's been on the list since the Maya build.

### Assets — 24 of 25 delivered, in `study/assets/`

Delivered: `heart-full` `heart-half` `heart-empty` (64×60) · `slot` `slot-frame` (64×67) ·
`tool-1`…`tool-9` (64×64) · `win-1` allay, `win-2` axolotl, `win-3` fox, `win-4` bee (128×128) ·
`bad-1` TNT, `bad-2` creeper, `bad-3` spider, `bad-4` zombie (128×128) ·
`chest-closed` `chest-open` (128×128). Total 222 KB.

**Outstanding: `boss-defeated.png`, 256px long side.** Dark or richly coloured — it lands on
a cream results card.

Notes carried from reviewing the art:
- `heart-empty` is very faint on dark backgrounds. Add a subtle CSS glow so an empty row
  reads as *sockets waiting*, not nothing.
- Tools render at ~68–70% inside the slot. `tool-9` has zero side margin — don't scale it up.
- `bad-3` spider nearly disappears on the science/spelling page backgrounds. Fine on the
  paper card where it actually appears; add a halo if it ever overlaps the page.
- `chest-open` is 8px wider than `chest-closed` and sits 4px right. Try it uncorrected first —
  a lid swinging toward the viewer *should* be wider. Nudge in CSS only if it lurches.
- `bad-2` creeper and `bad-4` zombie are narrow (~30px side margins); TNT and spider fill the
  frame. Normalise slightly so wrong answers carry consistent weight.

### Decision still to make

222 KB of sprites base64-inlined into four apps is ~1.2 MB total. **Recommend referencing
`../../assets/` by relative path instead** — one shared copy, browser-cached across apps.
Cost: the apps stop being single-file offline. Worth raising with Keith; he has valued
offline capability before.

Build the theme as **one source injected into all four apps**, not four separate
implementations.

---

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

1. **Finish the Minecraft theme.** Needs `boss-defeated`, then build the theme layer +
   localStorage and inject into all four apps.
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
