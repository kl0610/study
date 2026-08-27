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

## Curriculum sources

**CKHG and CKSci Teacher Guides and Student Readers are free PDFs on
coreknowledge.org** and can be pulled with `web_fetch` — no upload needed. Example:
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
