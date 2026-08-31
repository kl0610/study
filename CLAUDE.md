# StudyCraft

Practice apps for Myles, a 5th grader, across five subjects. Static HTML served
from GitHub Pages at **kl0610.github.io/study/**. No build step for the apps
themselves — each is a self-contained `index.html`. The only build is the theme
injector.

```
study/
├── index.html                          hub — collapsible subject list
├── assets/                             Minecraft sprites (24 files)
├── _build/                             theme source + injector + tests
│   ├── mc.css  mc.js                   the theme engine
│   ├── build_theme.py                  injects the theme into every app
│   └── test_theme.js                   node tests for the engine
├── history/…  science/…  reading/…  spelling/…  vocabulary/…
└── CLAUDE.md                           this file
```

---

## Rules that must not be broken

**Never use Myles's name in question scenarios.** Use Ana, Jamal, Priya.

**Build from the Teacher's Guide, not the reader alone.** The TG says what is and
isn't assessed at grade level. Respect its boundaries even when the reader covers
more. Never invent curriculum content — if the source isn't readable, stop and say so.

**These are reviews, not tests. 5–10 minutes.** Question count follows the
material: a 4-page chapter gets ~7 questions, an 8-page chapter ~9. Never pad a
chapter to match another. The goal is that he understands the chapter, not that
he's been examined on it.

**Passages must be verbatim.** Every quoted excerpt is asserted as a substring of
its source before shipping. See "Verification" below.

**No context-inference vocabulary formats** — don't ask "which sentence uses X to
mean Y." Test each sense separately against the TG's own wording. This rule is
about *vocabulary*; inference about a *story* is the point of Reading and is expected.

**Spoilers count as errors.** For an unfinished story, a wrong-answer distractor
can reveal the ending just as easily as a correct answer. Scope tests block
forbidden words until the relevant page is reached.

**Don't hand-edit the theme inside an app's `index.html`.** Edit `_build/mc.js`
or `mc.css` and re-run `build_theme.py`, or the copies drift.

---

## Standing design decisions

- **Answer options shuffle at render**, so there is no fixed key to notice. Keep it.
- **Multi-select is a known stumbling block** — he stops at the first right answer.
  Label it explicitly and, where the format allows, require a verdict on every option.
- **Never use HTML5 drag-and-drop** — it fails silently on touch. Pointer events only.
- **Hearts never block progress.** No death, no game over. Low health only shrinks
  the end-of-level loot. A kid who is stuck must never hit a wall.
- **The hotbar only ever fills.** Nothing earned is taken away.
- **Spelling free-typing levels must not leak word length or letter positions** in
  feedback. Saying "3 letters are off" is fine with boxes, forbidden without them.
- **Spelling Challenge 2 is a self-check.** It can only verify mechanics (word used,
  6+ words, capitalised, punctuated, not a copy of the example) and it says so out
  loud. Keith chose this over wiring up an API. Do not turn it into a fake validator.
- Wrong answers open the source passage. Excerpt first, then the video, then the
  full page, then a pinned "try again". Auto-open on the first miss only.

---

## Returned tests → next week's practice

Graded work goes in `_returned/<subject>/`. **It is gitignored and must stay
that way** — this repo is public and serves GitHub Pages, so a scan carrying a
name, handwriting and a teacher's marks cannot be pushed. The analysis derived
from it stays local too. What gets committed is the questions it produces.

The loop, per returned test:

1. **Read it against the source**, not from memory. Every miss is checked
   against the book in `_source/`.
2. **Classify each miss by cause**, because the causes need opposite responses:
   didn't know it · confused two specific things · misread the question · knew
   it and slipped · ran out of time. The last two mean *do not drill this* —
   practising something already known is how a kid learns to hate practising,
   and "wrong on a page" is not "does not know".
3. **Write `_returned/<subject>/analysis/<date>.md`** — each miss, its cause,
   and the page the call turns on.
4. **Update `_returned/<subject>/focus.json`** — `weight` over-samples a
   concept, `retire` drops one that has been solid several sittings running.
5. **Re-run the generator.** `_build/generators/gen_vocab.py` reads focus.json
   and tilts the forms; the comprehensive final still covers every meaning, so
   retiring something narrows practice without creating a hole in the test.

No focus.json means an even spread, which is right for the first week of a
unit. `_returned/README.md` has the file format and the naming convention;
`focus.example.json` shows the shape.

The generators live in `_build/generators/`. They are the only way these apps
get rebuilt, so a change to question content belongs there, not in an app's
HTML.

---

## Curriculum sources

**Local PDFs live in `_source/`, organised by subject.** Check here first — these
are the books the apps are built from, so there is no need to ask for an upload
or re-fetch anything already on this list.

```
_source/history/  CKHG_G5_U2_MayaAztecInca_Teacher-Guide.pdf      110 pp
                  CKHG_G5_U2_MayaAztecInca_Student-Reader.pdf      76 pp
                  CKHG_G5_U2_MayaAztecInca_Timeline.pdf            11 pp
                    — carries each chapter's Big Question; useful for
                      sequencing and for the hub's chapter titles
_source/science/  CKSci_G5U1_Matter_TG.pdf                        173 pp
                  CKSci_G5U1_Matter_SR.pdf                         50 pp
_source/reading/  CC_SherlockHolmes_Reader_W1.pdf                 228 pp
                  Core-Classics-Sherlock-Holmes-Teacher-Guide.pdf  92 pp
```

All six extract text with `pypdf` — quote the wording and cite the page from the
PDF rather than from memory of the original work. Core Classics in particular is
an abridgement: it cuts and rewords, so the original Doyle is not a safe source.
Printed page numbers are offset from PDF page indices (in the Sherlock Reader,
`printed = PDF − 13`); confirm the offset per book against a page you can match.

**Vocabulary and Math have no local sources.** Wordly Wise Book 6 pages arrive
week by week, so each list has to be supplied as it is set; Saxon Math Course 1
material has not been added yet. Anything on this machine for Wordly Wise Book 5
or Saxon Parts 8–9 is a fourth-grade leftover — ignore it.

**CKHG and CKSci Teacher Guides and Student Readers are free PDFs on
coreknowledge.org** and can be pulled with `web_fetch` when a local copy is
missing — no upload needed. Example:
`coreknowledge.org/wp-content/uploads/2019/09/CKSci_G5U1_Matter_TG.pdf`

**CKSci reader→lesson mapping is not a constant offset.** Confirmed:
SR1→L2, SR2→L3, SR3→L5, SR4→L7, SR5→L9, SR6→L11. Lesson 4 is a demonstration
lesson with no reader chapter. Verify per unit; don't assume.

**Licensing.** CKHG, CKSci, and Core Knowledge **Core Classics** (the abridged
Sherlock Holmes) are CC BY-NC-SA 4.0 — quote verbatim with the attribution footer.
Wordly Wise and the weekly spelling lists are personal study use only; don't
reproduce them beyond what the app needs.

Required footer, on every app:
> Based on an original work of the Core Knowledge Foundation (coreknowledge.org).
> This does not imply that the Core Knowledge Foundation endorses this work.

---

## Verification — run before every commit

```bash
cd study/_build
python3 build_theme.py      # idempotent; fails loudly if an anchor moved
node test_theme.js          # engine logic
```

And for any new content:

- **Excerpts verbatim.** Assert each is a substring of its passage, and each
  passage a subsequence of the source PDF. Extraction gotchas: CKHG sidebars
  splice word-by-word under `pdftotext -layout`; Core Classics hyphenates across
  line breaks (`re.sub(r'-\s*\n\s*','',raw)`); two-column boxes need `-raw`.
- **Perfect-play simulation.** A few thousand runs; every item must grade clean.
- **Scope test.** No distractor may reference material past the assigned pages.

Bugs that have shipped before, worth guarding against:
- **Falsy-zero** — `!chip.at` where `at` can legitimately be slot `0`.
- **CSS specificity** — `#typed{opacity:0}` hid a second input sharing that id.
- A definition truncated at 150 chars passed a 40-char prefix check. Compare full strings.

---

## Working style

Small commits, one change each, with a message saying what changed and why.
Run the tests before committing. If a source can't be read or a fact can't be
verified, say so rather than filling the gap.
